// src/components/Avatar.jsx
//
// The signed-in learner's initial in a circle: the sidebar's account card and
// the phone header's account menu. Each drew its own copy, and they disagreed
// on the fallback (the sidebar ignored the email).
function avatarInitial(user) {
  return (user?.displayName || user?.email || 'R').trim().charAt(0).toUpperCase() || 'R';
}

export default function Avatar({ user, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`w-9 h-9 shrink-0 rounded-full bg-gradient-to-tr from-[var(--accent)] to-[var(--accent-signal)] flex items-center justify-center text-white font-bold text-sm ${className}`}
    >
      {avatarInitial(user)}
    </span>
  );
}
