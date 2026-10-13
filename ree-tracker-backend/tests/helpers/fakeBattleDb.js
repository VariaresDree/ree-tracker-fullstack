// tests/helpers/fakeBattleDb.js
//
// An in-memory stand-in for the tables a battle touches (Battle,
// BattleParticipant, BattleOutcome, User), installed as spies on the real
// Prisma client. Interactive transactions run their callback against the same
// fake and roll back (restore a snapshot) when it throws, so tests can check
// that a failed completion leaves nothing half-written.
//
// Only the query shapes the battle code uses are supported; `select` is
// ignored (whole rows come back), which the code under test tolerates.

'use strict';

const clone = (v) => (v == null ? v : structuredClone(v));

function p2002() {
    const err = new Error('Unique constraint failed');
    err.code = 'P2002';
    return err;
}

const matchesIn = (value, cond) => {
    if (cond === undefined) return true;
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
        if ('in' in cond) return cond.in.includes(value);
        if ('not' in cond) return value !== cond.not;
    }
    return value === cond;
};

function installFakeBattleDb(vi, prisma) {
    const state = {
        battles: new Map(),
        participants: new Map(), // `${battleId}:${userId}` → row
        outcomes: new Map(),     // `${battleId}:${userId}` → row
        users: new Map(),
    };
    let seq = 0;
    const key = (battleId, userId) => `${battleId}:${userId}`;

    const db = {
        state,
        addUser(id, over = {}) {
            state.users.set(id, { id, displayName: id, eloRating: 1200, tier: 'BRONZE', ...over });
        },
        addBattle(row) {
            state.battles.set(row.id, {
                hostId: 'host', config: { mode: 'custom' }, status: 'WAITING', startedAt: null,
                createdAt: new Date(), timeLimitSecs: 600, ...row,
            });
            return state.battles.get(row.id);
        },
        addParticipant(battleId, userId, over = {}) {
            const row = {
                id: `bp-${++seq}`, battleId, userId, displayName: userId, isHost: false, answers: {},
                finishedAt: null, score: null, timeTakenSecs: null, joinedAt: new Date(), ...over,
            };
            state.participants.set(key(battleId, userId), row);
            return row;
        },
        addOutcome(battleId, userId, over = {}) {
            const row = {
                id: `bo-${++seq}`, battleId, userId, score: 0, total: 0, timeTakenSecs: 0, placement: 1,
                eloBefore: 1200, eloAfter: 1200, eloDelta: 0, tierBefore: 'BRONZE', tierAfter: 'BRONZE',
                perQuestion: [], createdAt: new Date(), ...over,
            };
            state.outcomes.set(key(battleId, userId), row);
            return row;
        },
        participant: (battleId, userId) => state.participants.get(key(battleId, userId)) || null,
        outcomesFor: (battleId) => Array.from(state.outcomes.values())
            .filter((o) => o.battleId === battleId)
            .sort((a, b) => a.placement - b.placement),
    };

    // --- Battle
    // The `rematch` relation is filled in on every read (select is ignored).
    const rematchOf = (id) => {
        const r = Array.from(state.battles.values()).find((b) => b.rematchOfId === id);
        return r ? { id: r.id, status: r.status, hostId: r.hostId } : null;
    };
    const withRematch = (b) => (b ? { ...b, rematch: rematchOf(b.id) } : null);
    vi.spyOn(prisma.battle, 'findUnique').mockImplementation(async ({ where }) => {
        const b = where.id !== undefined
            ? state.battles.get(where.id)
            : Array.from(state.battles.values()).find((x) => x.rematchOfId === where.rematchOfId);
        return clone(withRematch(b || null));
    });
    vi.spyOn(prisma.battle, 'create').mockImplementation(async ({ data }) => {
        if (state.battles.has(data.id)) throw p2002();
        if (data.rematchOfId && Array.from(state.battles.values()).some((b) => b.rematchOfId === data.rematchOfId)) throw p2002();
        return clone(db.addBattle(clone(data)));
    });
    vi.spyOn(prisma.battle, 'findMany').mockImplementation(async ({ where = {}, take } = {}) => {
        const rows = Array.from(state.battles.values())
            .filter((b) => matchesIn(b.status, where.status))
            .sort((a, b) => a.createdAt - b.createdAt);
        return clone(take ? rows.slice(0, take) : rows);
    });
    vi.spyOn(prisma.battle, 'updateMany').mockImplementation(async ({ where, data }) => {
        const b = state.battles.get(where.id);
        if (!b || !matchesIn(b.status, where.status) || !matchesIn(b.hostId, where.hostId)) return { count: 0 };
        Object.assign(b, clone(data));
        return { count: 1 };
    });

    // --- BattleParticipant
    const participantWhere = (row, where = {}) => {
        if (where.battleId !== undefined && !matchesIn(row.battleId, where.battleId)) return false;
        if (where.userId !== undefined && !matchesIn(row.userId, where.userId)) return false;
        if ('finishedAt' in where && where.finishedAt === null && row.finishedAt != null) return false;
        if (where.battle?.status && !matchesIn(state.battles.get(row.battleId)?.status, where.battle.status)) return false;
        return true;
    };
    vi.spyOn(prisma.battleParticipant, 'findMany').mockImplementation(async ({ where = {}, take } = {}) => {
        const rows = Array.from(state.participants.values()).filter((r) => participantWhere(r, where))
            .map((r) => ({ ...r, battle: state.battles.get(r.battleId) }));
        return clone(take ? rows.slice(0, take) : rows);
    });
    vi.spyOn(prisma.battleParticipant, 'findUnique').mockImplementation(async ({ where }) => {
        const { battleId, userId } = where.battleId_userId;
        return clone(state.participants.get(key(battleId, userId)) || null);
    });
    vi.spyOn(prisma.battleParticipant, 'updateMany').mockImplementation(async ({ where, data }) => {
        let count = 0;
        for (const r of state.participants.values()) {
            if (!participantWhere(r, where)) continue;
            Object.assign(r, clone(data));
            count += 1;
        }
        return { count };
    });
    vi.spyOn(prisma.battleParticipant, 'create').mockImplementation(async ({ data }) => {
        const k = key(data.battleId, data.userId);
        if (state.participants.has(k)) throw p2002();
        return clone(db.addParticipant(data.battleId, data.userId, clone(data)));
    });
    vi.spyOn(prisma.battleParticipant, 'upsert').mockImplementation(async ({ where, update, create }) => {
        const { battleId, userId } = where.battleId_userId;
        const row = state.participants.get(key(battleId, userId));
        if (row) { Object.assign(row, clone(update)); return clone(row); }
        return clone(db.addParticipant(battleId, userId, clone(create)));
    });
    vi.spyOn(prisma.battleParticipant, 'deleteMany').mockImplementation(async ({ where }) => {
        let count = 0;
        for (const [k, r] of state.participants) {
            if (!participantWhere(r, where)) continue;
            state.participants.delete(k);
            count += 1;
        }
        return { count };
    });

    // --- BattleOutcome
    vi.spyOn(prisma.battleOutcome, 'upsert').mockImplementation(async ({ where, create }) => {
        const { battleId, userId } = where.battleId_userId;
        const k = key(battleId, userId);
        if (!state.outcomes.has(k)) state.outcomes.set(k, { id: `bo-${++seq}`, ...clone(create), createdAt: new Date() });
        return clone(state.outcomes.get(k));
    });
    // Filters on battleId, userId and createdAt < lt; newest first when asked,
    // else by placement. Each row comes with its user and its battle (with the
    // battle's rematch, outcomes and participants).
    const withUser = (o) => ({ ...o, user: state.users.get(o.userId) || null });
    vi.spyOn(prisma.battleOutcome, 'findMany').mockImplementation(async ({ where = {}, orderBy, take } = {}) => {
        let rows = Array.from(state.outcomes.values()).filter((o) => matchesIn(o.battleId, where.battleId)
            && matchesIn(o.userId, where.userId)
            && (!where.createdAt?.lt || o.createdAt < where.createdAt.lt));
        rows = orderBy?.createdAt === 'desc'
            ? rows.sort((a, b) => b.createdAt - a.createdAt)
            : rows.sort((a, b) => a.placement - b.placement);
        if (take) rows = rows.slice(0, take);
        return clone(rows.map((o) => {
            const b = state.battles.get(o.battleId);
            return {
                ...withUser(o),
                battle: b ? {
                    ...withRematch(b),
                    outcomes: db.outcomesFor(o.battleId).map(withUser),
                    participants: Array.from(state.participants.values()).filter((p) => p.battleId === o.battleId),
                } : null,
            };
        }));
    });
    vi.spyOn(prisma.battleOutcome, 'findUnique').mockImplementation(async ({ where }) => {
        const { battleId, userId } = where.battleId_userId;
        return clone(state.outcomes.get(key(battleId, userId)) || null);
    });

    // --- User
    vi.spyOn(prisma.user, 'findMany').mockImplementation(async ({ where }) =>
        clone(Array.from(state.users.values()).filter((u) => matchesIn(u.id, where.id))));
    vi.spyOn(prisma.user, 'update').mockImplementation(async ({ where, data }) => {
        const u = state.users.get(where.id);
        if (!u) throw Object.assign(new Error('Record to update not found.'), { code: 'P2025' });
        if (data.eloRating?.increment !== undefined) u.eloRating += data.eloRating.increment;
        if (data.tier) u.tier = data.tier;
        return clone(u);
    });
    vi.spyOn(prisma.user, 'upsert').mockImplementation(async ({ where, create }) => {
        if (!state.users.has(where.id)) db.addUser(where.id, create);
        return clone(state.users.get(where.id));
    });

    // --- Interactive transactions: the callback runs on the same fake; a
    // throw restores the state from before it started.
    vi.spyOn(prisma, '$transaction').mockImplementation(async (arg) => {
        if (typeof arg !== 'function') return Promise.all(arg);
        const snapshot = {
            battles: structuredClone(state.battles),
            participants: structuredClone(state.participants),
            outcomes: structuredClone(state.outcomes),
            users: structuredClone(state.users),
        };
        try {
            return await arg(prisma);
        } catch (err) {
            for (const name of Object.keys(snapshot)) {
                state[name].clear();
                for (const [k, v] of snapshot[name]) state[name].set(k, v);
            }
            throw err;
        }
    });

    return db;
}

module.exports = { installFakeBattleDb };
