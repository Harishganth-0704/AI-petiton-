import express from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All routes here are admin-only

// GET /api/officers — list all officers
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const result = await query(`
      SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at,
             d.name AS department_name, d.id AS department_id
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.role = 'officer'
      ORDER BY u.name
    `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching officers' });
    }
});

// GET /api/officers/departments — list all departments
router.get('/departments', requireAuth, requireRole('admin', 'officer'), async (req, res) => {
    try {
        const result = await query('SELECT id, name, description FROM departments ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching departments' });
    }
});

// POST /api/officers — create a new officer account (admin only)
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { name, email, password, department_id } = req.body;
        if (!name || !email || !password || !department_id) {
            return res.status(400).json({ message: 'name, email, password, department_id are required' });
        }

        const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (exists.rows.length > 0) {
            return res.status(409).json({ message: 'Email already registered' });
        }

        const hash = await bcrypt.hash(password, 10);
        const result = await query(`
      INSERT INTO users (name, email, password, role, department_id)
      VALUES ($1, $2, $3, 'officer', $4)
      RETURNING id, name, email, role, department_id
    `, [name, email, hash, department_id]);

        res.status(201).json({ message: 'Officer created', officer: result.rows[0] });
    } catch (err) {
        console.error('Create officer error:', err);
        res.status(500).json({ message: 'Error creating officer' });
    }
});

// PATCH /api/officers/:id/department — reassign officer's department
router.patch('/:id/department', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { department_id } = req.body;
        if (!department_id) return res.status(400).json({ message: 'department_id required' });

        const result = await query(
            `UPDATE users SET department_id = $1, updated_at = now() WHERE id = $2 AND role = 'officer' RETURNING id, name, department_id`,
            [department_id, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Officer not found' });
        res.json({ message: 'Department updated', officer: result.rows[0] });
    } catch (err) {
        res.status(500).json({ message: 'Error updating department' });
    }
});

// DELETE /api/officers/:id — deactivate (not hard delete) an officer
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const result = await query(
            `UPDATE users SET is_active = false, updated_at = now() WHERE id = $1 AND role = 'officer' RETURNING id`,
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Officer not found' });
        res.json({ message: 'Officer deactivated' });
    } catch (err) {
        res.status(500).json({ message: 'Error deactivating officer' });
    }
});

export default router;
