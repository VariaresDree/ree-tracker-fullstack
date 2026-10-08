// The name shown for an account that has none of its own — the single
// definition. It was `Agent-xxxxxx` (and a bare 'Agent' in battles), spelled
// out separately by the leaderboard route, the profile route, the battle
// socket and the client's leaderboard normalizer, in the app's old sci-fi
// voice. Stored names are left as they are; this only names accounts that
// have none.

'use strict';

/** 'k3Jd8sP2…' → 'Reviewer-k3Jd8s'; 'Reviewer' when there is no id. */
function fallbackDisplayName(uid) {
    const short = String(uid || '').slice(0, 6);
    return short ? `Reviewer-${short}` : 'Reviewer';
}

module.exports = { fallbackDisplayName };
