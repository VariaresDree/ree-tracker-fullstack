// src/middlewares/authMiddleware.js
const { getAuth } = require('firebase-admin/auth');
const logger = require('../utils/logger');

module.exports = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger.warn('Missing or malformed auth token', { route: req.originalUrl });
            return res.status(401).json({ error: 'No authentication token provided.' });
        }

        const token = authHeader.split('Bearer ')[1];
        
        // Verifies the token against Firebase servers securely
        const decodedToken = await getAuth().verifyIdToken(token);
        
        // Attach the validated user context to the request for backend logging/querying
        req.user = {
            id: decodedToken.uid,
            email: decodedToken.email
        };
        
        next();
    } catch (error) {
        logger.error('Auth verification failed', { route: req.originalUrl, error: error.message });
        
        // Forces frontend to initiate a token refresh sequence by passing a strict 401
        res.status(401).json({ error: 'Unauthorized: Session expired or invalid. Token refresh required.' });
    }
};