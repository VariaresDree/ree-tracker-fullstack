// src/middlewares/requireSelf.js
// Ownership guard for routes that address a user by URL param. Blocks
// authenticated users from reading/writing other users' data (IDOR).
// Must be mounted AFTER authMiddleware so req.user is populated.
const requireSelf = (param = 'uid') => (req, res, next) => {
    if (!req.user?.id || req.params?.[param] !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden: you can only access your own data.' });
    }
    next();
};

module.exports = { requireSelf };
