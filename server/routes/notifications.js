import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/notifications - Get current user notifications
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await query(`
            SELECT id, petition_id, title, message, type, is_read, created_at
            FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 50
        `, [userId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Fetch notifications error:', error);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
});

// PATCH /api/notifications/:id/read - Mark a notification as read
router.patch('/:id/read', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await query(`
            UPDATE notifications
            SET is_read = true
            WHERE id = $1 AND user_id = $2
            RETURNING id, is_read
        `, [id, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json({ message: 'Marked as read', notification: result.rows[0] });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ message: 'Error updating notification' });
    }
});

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        await query(`
            UPDATE notifications
            SET is_read = true
            WHERE user_id = $1
        `, [userId]);

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ message: 'Error updating notifications' });
    }
});

export default router;
