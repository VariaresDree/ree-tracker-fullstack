const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { profileUpdateSchema, settingsUpdateSchema, deviceTokenSchema } = require('../schemas/userSchemas');
const prisma = require('../config/db');
const logger = require('../utils/logger');

const emailPrefix = (email) => (email && email.includes('@') ? email.split('@')[0] : null);

router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const { id, email, name, picture } = req.user;
        const fallbackName = name || emailPrefix(email) || `Agent-${id.slice(0, 6)}`;

        const user = await prisma.user.upsert({
            where: { id },
            update: {
                lastActive: new Date(),
                ...(email ? { email } : {}),
                ...(picture ? { photoURL: picture } : {}),
                // Only set displayName on first-touch if missing — don't overwrite user edits
            },
            create: {
                id,
                email: email || null,
                displayName: fallbackName,
                photoURL: picture || null,
                role: 'USER',
            },
        });

        // If existing row has no displayName, backfill once
        if (!user.displayName) {
            const updated = await prisma.user.update({
                where: { id },
                data: { displayName: fallbackName },
            });
            return res.status(200).json({ success: true, user: updated });
        }

        res.status(200).json({ success: true, user });
    } catch (error) {
        logger.error('User profile sync error', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Profile sync failed' });
    }
});

router.put('/profile', authMiddleware, validate(profileUpdateSchema), async (req, res) => {
    try {
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { displayName: req.body.displayName },
        });
        res.status(200).json({ success: true, user });
    } catch (error) {
        logger.error('User profile update error', { error: error.message });
        res.status(500).json({ error: 'Profile update failed.' });
    }
});

// Account deletion — purge the CALLER's Postgres record (self only; the id
// comes from the verified token, never the body). Every dependent table
// cascades via the schema's onDelete: Cascade relations. The client calls
// this right before deleting the Firebase Auth identity; previously no such
// route existed, so "Delete account" left the whole server record orphaned.
router.delete('/profile', authMiddleware, async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: req.user.id } });
        return res.status(200).json({ success: true });
    } catch (error) {
        // P2025 = no row to delete (account never synced) — nothing to purge.
        if (error.code === 'P2025') return res.status(200).json({ success: true });
        logger.error('Account deletion failed', { error: error.message, uid: req.user.id });
        return res.status(500).json({ error: 'Account deletion failed.' });
    }
});

router.put('/settings', authMiddleware, validate(settingsUpdateSchema), async (req, res) => {
    try {
        const { examDate, dailyTarget } = req.body;
        const data = {};
        if (examDate !== undefined) data.examDate = examDate;
        if (dailyTarget !== undefined) data.dailyTarget = dailyTarget;
        await prisma.user.update({ where: { id: req.user.id }, data });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Settings update failed.' });
    }
});

// FCM device tokens (Phase 4.2) — registered by the Capacitor native app.
// Upsert-by-token: re-registration by a DIFFERENT user reassigns the token
// (the device changed hands), so a stale owner never receives another user's
// notifications.
router.post('/device-token', authMiddleware, validate(deviceTokenSchema), async (req, res) => {
    try {
        const { token, platform } = req.body;
        await prisma.deviceToken.upsert({
            where: { token },
            update: { userId: req.user.id, platform },
            create: { userId: req.user.id, token, platform },
        });
        res.status(200).json({ success: true });
    } catch (error) {
        logger.error('device-token register failed', { error: error.message });
        res.status(500).json({ error: 'Device token registration failed.' });
    }
});

// Logout hook: only the token's current owner may release it.
router.delete('/device-token', authMiddleware, validate(deviceTokenSchema), async (req, res) => {
    try {
        const { token } = req.body;
        await prisma.deviceToken.deleteMany({ where: { token, userId: req.user.id } });
        res.status(200).json({ success: true });
    } catch (error) {
        logger.error('device-token unregister failed', { error: error.message });
        res.status(500).json({ error: 'Device token removal failed.' });
    }
});

module.exports = router;
