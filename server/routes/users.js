import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users/leaderboard - Returns top 10 citizens by points
router.get('/leaderboard', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, points, role
            FROM users
            WHERE role = 'citizen' AND points > 0
            ORDER BY points DESC
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ message: 'Error fetching leaderboard' });
    }
});

export default router;
