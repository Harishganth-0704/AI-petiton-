import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { strictLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// ─── GET /api/comments/:petitionId ──────────────────────────────────────────
router.get('/:petitionId', async (req, res) => {
    try {
        const { petitionId } = req.params;
        const result = await query(`
            SELECT c.id, c.content, c.created_at, u.name AS user_name, u.role
            FROM petition_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.petition_id = $1
            ORDER BY c.created_at ASC
        `, [petitionId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ message: 'Error fetching comments' });
    }
});

// ─── POST /api/comments/:petitionId ─────────────────────────────────────────
router.post('/:petitionId', requireAuth, strictLimiter, async (req, res) => {
    try {
        const { petitionId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (!content || content.trim() === '') {
            return res.status(400).json({ message: 'Comment content cannot be empty' });
        }

        const result = await query(`
            INSERT INTO petition_comments (petition_id, user_id, content)
            VALUES ($1, $2, $3)
            RETURNING id, content, created_at
        `, [petitionId, userId, content.trim()]);

        res.status(201).json({ message: 'Comment added', comment: result.rows[0] });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ message: 'Error adding comment' });
    }
});

export default router;
