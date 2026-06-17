// src/middlewares/authMiddleware.js
const { getAuth } = require('firebase-admin/auth');

module.exports = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Use the modern modular getAuth() to verify the token
        const decodedToken = await getAuth().verifyIdToken(token);
        
        // Inject structural context directly into the operational request pipeline
        req.user = {
            id: decodedToken.uid,
            email: decodedToken.email
        };
        next();
    } catch (error) {
        console.error("[AUTH ERROR] Token verification failed:", error.message);
        return res.status(403).json({ error: 'Forbidden: Token verification failed.' });
    }
};