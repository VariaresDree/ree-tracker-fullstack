const prisma = require('../config/db');

const requireAdmin = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { role: true }
        });

        if (!user || user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Admin clearance required.' });
        }

        next();
    } catch (error) {
        res.status(500).json({ error: 'Authorization check failed.' });
    }
};

module.exports = { requireAdmin };
