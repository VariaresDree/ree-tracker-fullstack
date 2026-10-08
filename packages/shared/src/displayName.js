// The name shown for an account that has none of its own — the single
// definition. It was `Agent-xxxxxx` (and a bare 'Agent' in battles), spelled
// out separately by the leaderboard route, the profile route, the battle
// socket and the client's leaderboard normalizer, in the app's old sci-fi
// voice. Stored names are left as they are; this only names accounts that
// have none.

'use strict';

// The longest display name the server stores (rankings, battles, the readiness
// certificate). The name inputs cap at it too: Account allowed 60, so a longer
// name failed to save with a generic error.
const DISPLAY_NAME_MAX = 32;

/**
 * A name as the server will store it: trimmed and cut to DISPLAY_NAME_MAX
 * UTF-16 units (what the server's length check counts), never splitting an
 * emoji's surrogate pair, and trimmed again so a cut that lands after a space
 * matches the server's own trim. Comparing anything else with the stored name
 * never matches, and the once-a-session mirror rewrites it every session.
 */
function clampDisplayName(name) {
    let out = '';
    for (const ch of String(name ?? '').trim()) {
        if (out.length + ch.length > DISPLAY_NAME_MAX) break;
        out += ch;
    }
    return out.trim();
}

/** 'k3Jd8sP2…' → 'Reviewer-k3Jd8s'; 'Reviewer' when there is no id. */
function fallbackDisplayName(uid) {
    const short = String(uid || '').slice(0, 6);
    return short ? `Reviewer-${short}` : 'Reviewer';
}

module.exports = { fallbackDisplayName, clampDisplayName, DISPLAY_NAME_MAX };
