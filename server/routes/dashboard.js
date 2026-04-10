import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', requireAuth, async (req, res) => {
    try {
        const { role, id: userId, department_id } = req.user;

        let scope = '';
        const params = [];

        // Respect RBAC for analytics
        if (role === 'citizen') {
            params.push(userId);
            scope = `WHERE citizen_id = $1`;
        } else if (role === 'officer') {
            params.push(department_id || -1);
            scope = `WHERE department_id = $1`;
        }

        const statsQuery = `
            SELECT 
                COUNT(*)::int as total_petitions,
                COUNT(*) FILTER (WHERE status = 'resolved')::int as resolved_petitions,
                AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) FILTER (WHERE status = 'resolved')::numeric as avg_sla_days
            FROM petitions ${scope}
        `;

        const result = await query(statsQuery, params);
        const row = result.rows[0];

        // Fetch 7-day trend
        const trendParams = [...params];
        let trendScope = scope;
        if (trendScope === '') {
            trendScope = 'WHERE created_at > NOW() - INTERVAL \'7 days\'';
        } else {
            trendScope += ' AND created_at > NOW() - INTERVAL \'7 days\'';
        }

        const trendQuery = `
            SELECT 
                DATE_TRUNC('day', created_at)::date as date,
                COUNT(*)::int as count
            FROM petitions
            ${trendScope}
            GROUP BY 1
            ORDER BY 1 ASC
        `;
        const trendResult = await query(trendQuery, params);

        const total = row.total_petitions || 0;
        const resolved = row.resolved_petitions || 0;
        const rate = total > 0 ? (resolved / total) * 100 : 0;
        const sla = row.avg_sla_days ? parseFloat(row.avg_sla_days) : 0;

        res.json({
            total_petitions: total,
            resolved_petitions: resolved,
            resolution_rate: parseFloat(rate.toFixed(1)),
            avg_sla_days: parseFloat(sla.toFixed(1)),
            trend: trendResult.rows
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
});

export default router;
