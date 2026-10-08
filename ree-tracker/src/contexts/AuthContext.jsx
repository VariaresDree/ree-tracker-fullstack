// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { clampDisplayName } from '@ree/shared';
import { auth } from '../config/firebaseDb';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
// 🚀 NEW: Import the TOS fetch function
import { getAnalyticsProfile, fetchFeatureFlags, updateUserProfile, BOOT_TIMEOUT_MS } from '../services/dbQueries';
import { refreshLiveTOS } from '../services/liveTaxonomy';
import { seedDashboardRequest } from '../services/dashboardSeed';
import { claimApiCacheFor, purgeApiCache } from '../services/apiCache';
import { initPushNotifications, teardownPushNotifications } from '../services/pushNotifications';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui';
import { WifiOff } from '../components/ui/icons';
import BootSequence from '../components/BootSequence';

// The hardcoded MASTER_ADMIN_EMAILS allowlist that used to live here is gone.
// It created two problems: a maintainer's personal email address was compiled
// into the public JS bundle and shipped to every user, and the app carried TWO
// authorization models — an email allowlist on the client, User.role in Postgres
// on the server — that could disagree, with the client's deciding what UI
// rendered. Admin status now comes from the server's role and nothing else. The
// server was always the real gate (mutations 403 regardless), so this only
// removes misleading UI, never real access.

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Last-resort safety net ONLY — onAuthStateChanged resolves from Firebase's
// local persistence and reliably fires near-instantly for a returning user,
// even offline, with no network round-trip required. This is not a normal
// "network is slow" timer; it only matters if the auth SDK callback never
// fires at all. 25s (vs. the old 5s) leaves comfortable room for a genuinely
// slow device/connection before treating it as stuck, and firing it NEVER
// treats "unresolved" as "logged out" — see authStalled below.
const AUTH_STALL_MS = 25000;

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  // False until this session's role is known. isAdmin arrives with the profile
  // request — seconds after sign-in on a cold backend — and the Admin route
  // waits on this instead of bouncing a real admin (routes/AdminRoute.jsx).
  const [roleResolved, setRoleResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  // True only if onAuthStateChanged hasn't fired AT ALL after AUTH_STALL_MS —
  // distinct from `loading`, which now clears the instant the callback fires
  // (see below). Drives a reconnecting/retry screen, never the Login form.
  const [authStalled, setAuthStalled] = useState(false);

  useEffect(() => {
    const stallTimer = setTimeout(() => setAuthStalled(true), AUTH_STALL_MS);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(stallTimer);
      setAuthStalled(false);
      setCurrentUser(user);
      // onAuthStateChanged IS the authority on "resolved" — the moment it
      // fires (with a user OR null), loading ends. Everything below (admin
      // role lookup, TOS, feature flags, push registration) is enrichment
      // that used to run BEFORE this, holding the whole app on the "Securing
      // Session…" screen for as long as the slowest of four awaited network
      // calls took — now it resolves in the background instead.
      setLoading(false);

      if (user) {
        setRoleResolved(false);
        // Claim the SW's API cache for this uid BEFORE any request is issued,
        // so a cache written by a previous account is dropped rather than
        // served. /api/readiness, /api/forecast and /api/leaderboard/me carry
        // no uid in their URLs — they are scoped by token — so the cache key
        // alone cannot keep two accounts apart. Same user reloading is the
        // common case and does not purge (services/apiCache.js).
        claimApiCacheFor(user.uid).catch(() => { /* cache is best-effort */ });

        // Mirror the Firebase display name into the Postgres User row (the
        // leaderboard's source of truth) once per session, so a name set at
        // signup — or edited on another device — propagates to rankings and
        // can't drift from the Account header. Best-effort: offline/failed
        // writes are swallowed and retried next session.
        //
        // Only when the stored name differs. The write is a mutation, so it
        // dropped the boot dashboard seed below and Today fetched the
        // aggregate a second time on every first load, to rewrite a name that
        // was already there. The profile request below returns the stored
        // name; a failed one still mirrors, so drift heals regardless.
        let storedNameKnown = false;
        const mirrorDisplayName = (storedName) => {
          try {
            const wanted = clampDisplayName(user.displayName);
            if (!wanted || wanted === storedName || sessionStorage.getItem('dn_mirrored')) return;
            sessionStorage.setItem('dn_mirrored', '1');
            updateUserProfile({ displayName: wanted }).catch(() => {});
          } catch { /* sessionStorage unavailable (private mode) — skip */ }
        };

        try {
          // All three requests are started before any of them is awaited.
          // Sequential awaits made a three-deep waterfall — a production trace
          // measured profile 3457ms -> TOS 1106ms -> flags 693ms, each starting
          // only once the previous resolved, so Arena sat empty for 5.5s.
          //
          // They are kicked off together but awaited one at a time on purpose,
          // rather than via Promise.all: each result is applied the moment it
          // lands, so admin state is not gated on the slowest of the three. A
          // hung TOS request delays only the TOS write, exactly as before.
          //
          // The TOS applies itself the moment it lands, independent of the
          // profile: it used to be awaited AFTER the profile, so a profile
          // timeout (a Render cold start) skipped it and the store kept its
          // persisted/fallback topic list — the stale list the Library's AI
          // ingestion then offered and labelled questions with.
          //
          // refreshLiveTOS and fetchFeatureFlags resolve to null on failure
          // instead of rejecting, so only the profile call can reject here and
          // it lands in the outer catch just as it did when this was
          // sequential; the other two are in flight but swallow their own
          // errors, so neither is left unhandled.
          const profilePromise = getAnalyticsProfile(user.uid, { timeoutMs: BOOT_TIMEOUT_MS });
          refreshLiveTOS().then((tos) => {
              if (!tos) console.warn("Failed to fetch cloud TOS, maintaining local cached state.");
          });
          const flagsPromise = fetchFeatureFlags();

          // This request IS the dashboard aggregate — the same endpoint
          // Today fetches on mount (useDashboardStats), about a second from
          // now. We only need
          // profile.role from it, so offer the request itself and let that
          // second one never go out.
          //
          // Offered HERE, before the await, on purpose: Today often mounts
          // while this is still in flight, and an offer made after the response
          // lands arrives too late to be taken. Single-use, uid-matched,
          // age-bounded and dropped by any write (services/dashboardSeed.js).
          seedDashboardRequest(user.uid, profilePromise);

          const profileResponse = await profilePromise;
          storedNameKnown = true;
          mirrorDisplayName(profileResponse?.data?.profile?.displayName);
          const dbRole = profileResponse?.data?.profile?.role;
          const isUserAdmin = dbRole === 'ADMIN' || dbRole === 'admin';
          setIsAdmin(isUserAdmin);
          setRoleResolved(true);
          if (useStore.getState) {
              useStore.getState().setIsAdmin(isUserAdmin);
          }

          // A failed flag fetch keeps the persisted map (missing keys read as
          // disabled), so the push registration below still sees cached flags.
          const flags = await flagsPromise;
          if (flags && useStore.getState) {
              useStore.getState().setFeatureFlags(flags);
          } else if (!flags) {
              console.warn("Failed to fetch feature flags, keeping cached state.");
          }

          // FCM push (Phase 4.2) — no-op on the web; on the Capacitor native
          // app this registers the device token, gated by the rollout flag.
          try {
              const activeFlags = useStore.getState?.().featureFlags || {};
              await initPushNotifications(user.uid, {
                  flagEnabled: !!activeFlags['push-notifications']?.enabled,
              });
          } catch (pushError) {
              console.warn('Push registration skipped:', pushError?.message);
          }

        } catch (err) {
          console.warn("Clearance lookup failed; treating this session as non-admin.", err);
          // Only when the profile itself failed: a later step throwing must not
          // rewrite a name the profile already showed is stored.
          if (!storedNameKnown) mirrorDisplayName(undefined);

          // Fail CLOSED. The old path fell back to the email allowlist on ANY
          // failure — including the server's own 503 readiness gate — which
          // meant a backend blip granted the admin UI on the client's say-so.
          setIsAdmin(false);
          setRoleResolved(true);

          if (useStore.getState) {
              useStore.getState().setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
        setRoleResolved(true);
        if (useStore.getState) {
            useStore.getState().setIsAdmin(false);
        }
      }
    });

    return () => {
      clearTimeout(stallTimer);
      unsubscribe();
    };
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

  const register = async (email, password, displayName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(userCredential.user, { displayName });
    return userCredential;
  };

  // "Forgot password?" on Login and "Send a reset email" in Account.
  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  // Firebase refuses a password change on an old session, so prove the
  // current password first (re-authentication), then set the new one.
  const changePassword = async (currentPassword, newPassword) => {
    const user = auth.currentUser;
    if (!user?.email) throw new Error('Sign in again to change your password.');
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
    await updatePassword(user, newPassword);
  };

  const logout = async () => {
    setLoading(true);
    // Release this device's FCM token BEFORE the auth session dies (the
    // unregister call needs a valid ID token). No-op on the web.
    try { await teardownPushNotifications(); } catch { /* best-effort */ }
    // Clear the display-name mirror guard so the next user to sign in on this
    // tab re-mirrors their own name (the flag is per-session, not per-user).
    try { sessionStorage.removeItem('dn_mirrored'); } catch { /* ignore */ }
    // Drop this account's cached analytics before the session ends. Without
    // it the next person to sign in on this browser could be served the
    // previous user's readiness and forecast, neither of which is keyed by uid.
    try { await purgeApiCache(); } catch { /* best-effort */ }
    await signOut(auth);
    setCurrentUser(null);
    setIsAdmin(false);
    if (useStore.getState) useStore.getState().setIsAdmin(false);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAdmin, roleResolved, login, register, logout, resetPassword, changePassword, loading }}>
      {!loading ? children : authStalled ? (
        // AUTH_STALL_MS elapsed with no onAuthStateChanged callback at all —
        // NOT the same as "logged out". A weak connection must never eject an
        // authenticated user to the Login form; it gets a reconnecting state
        // it can retry from instead.
        <div className="flex flex-col justify-center items-center h-screen bg-bg text-textMain gap-4 px-6 text-center">
          <WifiOff size={32} strokeWidth={1.75} className="text-muted2" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="font-semibold tracking-tight">Still trying to reach your session…</p>
            <p className="text-sm text-muted2 max-w-xs">
              This is taking longer than usual. Your session isn't lost — check your connection and retry.
            </p>
          </div>
          <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      ) : (
        <BootSequence label="Preparing your session" />
      )}
    </AuthContext.Provider>
  );
};