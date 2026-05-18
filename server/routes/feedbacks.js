import express from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// POST /api/feedbacks - Submit feedback for a petition
router.post('/', requireAuth, async (req, res) => {
    const { petition_id, rating, comment } = req.body;

    if (!petition_id || !rating) {
        return res.status(400).json({ message: 'Petition ID and rating are required' });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    try {
        // Verify petition exists and belongs to the user
        const petitionCheck = await query(
            'SELECT * FROM petitions WHERE id = $1 AND citizen_id = $2',
            [petition_id, req.user.id]
        );

        if (petitionCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Petition not found or access denied' });
        }

        const petition = petitionCheck.rows[0];

        // Only allow feedback for resolved petitions
        if (petition.status !== 'resolved') {
            return res.status(400).json({ message: 'Feedback can only be submitted for resolved petitions' });
        }

        // Create feedback
        const result = await query(
            'INSERT INTO feedbacks (petition_id, rating, comment) VALUES ($1, $2, $3) RETURNING *',
            [petition_id, rating, comment]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { // Unique constraint violation
            return res.status(400).json({ message: 'Feedback already submitted for this petition' });
        }
        console.error('Feedback submission error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET /api/feedbacks - Get all feedback (Admin only)
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                f.*, 
                p.title as petition_title, 
                u.name as citizen_name
            FROM feedbacks f
            JOIN petitions p ON f.petition_id = p.id
            JOIN users u ON p.citizen_id = u.id
            ORDER BY f.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Feedback fetch error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET /api/feedbacks/petition/:id - Get feedback for a specific petition
router.get('/petition/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query('SELECT * FROM feedbacks WHERE petition_id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Feedback not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Feedback search error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
