import express from 'express';
import multer from 'multer';
import path from 'path';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { emailService } from '../services/emailService.js';
import { smsService } from '../services/smsService.js';
import { notificationQueue } from '../services/notificationQueue.js';
import { aiService } from '../services/aiService.js';
import { strictLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// Multer storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const STATUS_VALUES = ['submitted', 'pending', 'in_progress', 'verification', 'resolved', 'rejected', 'escalated'];

// ─── GET /api/petitions ──────────────────────────────────────────────────────
// citizen → own petitions only
// officer → petitions in their department only
// admin   → all petitions
router.get('/', requireAuth, async (req, res) => {
    try {
        const { role, id: userId, department_id } = req.user;
        const { status, category, search } = req.query;

        let sql = `
      SELECT 
        p.id, p.title, p.description, p.category, p.status, p.priority,
        p.officer_remark, p.location_lat, p.location_lng, p.location_address,
        p.created_at, p.updated_at, p.is_anonymous, p.media_url, p.audio_url,
        p.ai_urgency, p.ai_fake_prob, p.ai_confidence, p.ai_keywords, p.ai_analysis_report, p.ai_summary,
        u.name AS citizen_name, u.email AS citizen_email,
        d.name AS department_name,
        COALESCE(upvotes_info.upvote_count, 0) AS upvotes_count,
        CASE WHEN current_user_upvote.id IS NOT NULL THEN true ELSE false END AS has_upvoted
      FROM petitions p
      LEFT JOIN users u ON p.citizen_id = u.id
      LEFT JOIN departments d ON p.department_id = d.id
      LEFT JOIN (
          SELECT petition_id, COUNT(*) as upvote_count
          FROM petition_upvotes
          GROUP BY petition_id
      ) upvotes_info ON p.id = upvotes_info.petition_id
      LEFT JOIN petition_upvotes current_user_upvote 
          ON p.id = current_user_upvote.petition_id AND current_user_upvote.user_id = $1
      WHERE 1=1
    `;
        const params = [userId];

        // Role-based data filtering
        if (role === 'citizen') {
            sql += ` AND p.citizen_id = $1`;
        } else if (role === 'officer') {
            if (!department_id) {
                return res.json([]); // officer without a department sees nothing
            }
            params.push(department_id);
            // Officers only see petitions that HAVE been reviewed by an admin
            sql += ` AND p.department_id = $${params.length} AND p.admin_reviewed = true`;
        }
        
        // Admin can filter by review status
        const { reviewed } = req.query;
        if (role === 'admin' && reviewed !== undefined) {
          params.push(reviewed === 'true');
          sql += ` AND p.admin_reviewed = $${params.length}`;
        }
        // admin sees all — no extra filter

        if (status && status !== 'all') {
            params.push(status);
            sql += ` AND p.status = $${params.length}`;
        }
        if (category && category !== 'all') {
            params.push(category);
            sql += ` AND p.category = $${params.length}`;
        }
        if (req.query.priority && req.query.priority !== 'all') {
            params.push(req.query.priority);
            sql += ` AND p.priority = $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            sql += ` AND (p.title ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
        }

        const sort = req.query.sort || 'newest';
        if (sort === 'oldest') {
            sql += ` ORDER BY p.created_at ASC`;
        } else if (sort === 'upvoted') {
            sql += ` ORDER BY upvotes_count DESC, p.created_at DESC`;
        } else {
            sql += ` ORDER BY p.created_at DESC`;
        }

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get petitions error:', error);
        res.status(500).json({ message: 'Error fetching petitions' });
    }
});

// ─── GET /api/petitions/trending ──────────────────────────────────────────────
router.get('/trending', async (req, res) => {
    try {
        const { category } = req.query;
        // Make authentication optional for trending
        let userId = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded.id;
            } catch (e) {
                // Invalid token, proceed as guest
            }
        }

        let sql = `
            SELECT 
                p.id, p.title, p.description, p.category, p.status, p.priority,
                p.location_address, p.created_at, p.view_count, p.media_url,
                u.name AS citizen_name,
                d.name AS department_name,
                COALESCE(upvotes_info.upvote_count, 0) AS upvotes_count,
                COALESCE(comments_info.comment_count, 0) AS comments_count,
                ${userId ? `(user_upvote.id IS NOT NULL) AS has_upvoted` : `false AS has_upvoted`},
                ${userId ? `(user_comment.id IS NOT NULL) AS has_commented` : `false AS has_commented`},
                (COALESCE(p.view_count, 0) * 1 + COALESCE(upvotes_info.upvote_count, 0) * 3 + COALESCE(comments_info.comment_count, 0) * 2) AS trending_score
            FROM petitions p
            LEFT JOIN users u ON p.citizen_id = u.id
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN (
                SELECT petition_id, COUNT(*) as upvote_count
                FROM petition_upvotes
                GROUP BY petition_id
            ) upvotes_info ON p.id = upvotes_info.petition_id
            LEFT JOIN (
                SELECT petition_id, COUNT(*) as comment_count
                FROM petition_comments
                GROUP BY petition_id
            ) comments_info ON p.id = comments_info.petition_id
            ${userId ? `
            LEFT JOIN petition_upvotes user_upvote ON p.id = user_upvote.petition_id AND user_upvote.user_id = $1
            LEFT JOIN (
                SELECT DISTINCT ON (petition_id) petition_id, id 
                FROM petition_comments 
                WHERE user_id = $1
                ORDER BY petition_id ASC
            ) user_comment ON p.id = user_comment.petition_id
            ` : ''}
            WHERE p.status NOT IN ('resolved', 'rejected')
        `;

        const params = [];
        if (userId) {
            params.push(userId);
        }

        if (category && category !== 'all') {
            params.push(category);
            sql += ` AND p.category = $${params.length}`;
        }

        sql += ` ORDER BY trending_score DESC, p.created_at DESC LIMIT 10`;

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get trending petitions error:', error);
        res.status(500).json({ message: 'Error fetching trending petitions' });
    }
});

// ─── GET /api/petitions/stats ─────────────────────────────────────────────────
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const { role, id: userId, department_id } = req.user;

        let scope = '';
        const params = [];
        if (role === 'citizen') {
            params.push(userId);
            scope = `WHERE citizen_id = $1`;
        } else if (role === 'officer') {
            params.push(department_id || -1);
            scope = `WHERE department_id = $1`;
        }

        const countResult = await query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
        COUNT(*) FILTER (WHERE status NOT IN ('resolved')) AS pending,
        COUNT(*) FILTER (WHERE status = 'escalated') AS escalated
      FROM petitions ${scope}
    `, params);

        const officerCountResult = await query(`
      SELECT COUNT(*) FROM users WHERE role = 'officer'
    `);

        const deptResult = await query(`
      SELECT d.name AS department, COUNT(*) AS count
      FROM petitions p
      JOIN departments d ON p.department_id = d.id
      ${scope ? scope.replace('WHERE', 'AND') : 'WHERE 1=1'}
      GROUP BY d.name
    `, scope ? params : []);

        const stats = countResult.rows[0];
        const deptBreakdown = {};
        deptResult.rows.forEach(r => { deptBreakdown[r.department] = parseInt(r.count); });

        // Fetch last 7 days trend data
        const trendResult = await query(`
          SELECT 
            TO_CHAR(d, 'YYYY-MM-DD') as date,
            COUNT(p.id) as count
          FROM (
            SELECT CURRENT_DATE - s.a AS d
            FROM generate_series(0, 6) AS s(a)
          ) d
          LEFT JOIN petitions p ON TO_CHAR(p.created_at, 'YYYY-MM-DD') = TO_CHAR(d.d, 'YYYY-MM-DD')
          GROUP BY d.d
          ORDER BY d.d ASC
        `);

        res.json({
            totalPetitions: parseInt(stats.total),
            resolved: parseInt(stats.resolved),
            pending: parseInt(stats.pending),
            escalated: parseInt(stats.escalated),
            totalOfficers: parseInt(officerCountResult.rows[0].count),
            departmentBreakdown: deptBreakdown,
            trend: trendResult.rows.map(r => ({ date: r.date, count: parseInt(r.count) }))
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ message: 'Error fetching stats' });
    }
});

// ─── POST /api/petitions/:id/upvote ──────────────────────────────────────────
// citizen only: toggles an upvote on a petition
router.post('/:id/upvote', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if user already upvoted
        const existing = await query(
            'SELECT id FROM petition_upvotes WHERE petition_id = $1 AND user_id = $2',
            [id, userId]
        );

        if (existing.rowCount > 0) {
            // Already upvoted → remove it
            await query('DELETE FROM petition_upvotes WHERE petition_id = $1 AND user_id = $2', [id, userId]);
            await query('UPDATE petitions SET upvotes_count = GREATEST(0, COALESCE(upvotes_count, 0) - 1) WHERE id = $1', [id]);
            const updated = await query('SELECT upvotes_count FROM petitions WHERE id = $1', [id]);
            return res.json({ upvoted: false, upvotes_count: updated.rows[0].upvotes_count });
        } else {
            // Not upvoted → add it
            await query('INSERT INTO petition_upvotes (petition_id, user_id) VALUES ($1, $2)', [id, userId]);
            await query('UPDATE petitions SET upvotes_count = COALESCE(upvotes_count, 0) + 1 WHERE id = $1', [id]);
            const updated = await query('SELECT upvotes_count FROM petitions WHERE id = $1', [id]);
            return res.json({ upvoted: true, upvotes_count: updated.rows[0].upvotes_count });
        }
    } catch (error) {
        console.error('Upvote error:', error);
        // Table may not exist yet — return graceful error
        res.status(500).json({ message: 'Upvote failed. Make sure petition_upvotes table exists.' });
    }
});

/// ─── GET /api/petitions/:id/suggest-reply ─────────────────────────────────────
// officer only: generates a suggested reply for the petition
router.get('/:id/suggest-reply', requireAuth, requireRole('officer'), async (req, res) => {
    try {
        const { id } = req.params;
        const petitionResult = await query('SELECT * FROM petitions WHERE id = $1', [id]);
        
        if (petitionResult.rowCount === 0) {
            return res.status(404).json({ message: 'Petition not found' });
        }

        const reply = await aiService.generateOfficialReply(petitionResult.rows[0]);
        res.json({ reply });
    } catch (error) {
        console.error('Suggest reply error:', error);
        res.status(500).json({ message: 'Error generating suggested reply' });
    }
});

// ─── GET /api/petitions/map ───────────────────────────────────────────────────
router.get('/map', requireAuth, async (req, res) => {
    try {
        const { role, id: userId, department_id } = req.user;

        let where = 'WHERE p.location_lat IS NOT NULL AND p.location_lng IS NOT NULL';
        const params = [];
        if (role === 'officer') {
            params.push(department_id || -1);
            where += ` AND p.department_id = $${params.length}`;
        }
        // Admin and Citizens now see all petitions (Public Awareness)

        const result = await query(`
      SELECT p.id, p.title, p.status, p.priority, p.category,
        p.location_lat, p.location_lng, p.location_address, d.name AS department_name
      FROM petitions p LEFT JOIN departments d ON p.department_id = d.id ${where}
    `, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching map data' });
    }
});

// ─── POST /api/petitions/analyze ──────────────────────────────────────────────
router.post('/analyze', async (req, res) => {
    try {
        const { title, description, category, location, isSimulatedFake, ml_findings } = req.body;
        if (!title || !description) {
            return res.status(400).json({ message: 'title and description are required' });
        }

        // 🗺️ Fetch nearby petitions for geo-context
        let nearbyContext = [];
        if (location?.lat && location?.lng) {
            try {
                const nearby = await query(`
                    SELECT title, category, status, created_at
                    FROM petitions
                    WHERE 
                        location_lat IS NOT NULL AND location_lng IS NOT NULL
                        AND ABS(location_lat - $1) < 0.005
                        AND ABS(location_lng - $2) < 0.005
                    ORDER BY created_at DESC
                    LIMIT 5
                `, [location.lat, location.lng]);
                nearbyContext = nearby.rows;
            } catch (geoErr) {
                console.warn('[ANALYZE] Geo-context fetch failed (non-critical):', geoErr.message);
            }
        }

        const aiResult = await aiService.analyzePetition(title, description, category, location, null, nearbyContext, isSimulatedFake, ml_findings);
        res.json(aiResult);
    } catch (error) {
        console.error('AI Analysis Route Error:', error);
        res.status(500).json({ message: 'Error analyzing petition' });
    }
});

// ─── POST /api/petitions ───────────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('citizen'), strictLimiter, upload.fields([{ name: 'media', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), async (req, res) => {
    try {
        let { title, description, category, location, isAnonymous, aiAnalysis } = req.body;
        const citizenId = req.user.id;
        const mediaUrl = req.files?.media ? `/uploads/${req.files.media[0].filename}` : null;
        const audioUrl = req.files?.audio ? `/uploads/${req.files.audio[0].filename}` : null;

        if (!title || !description || !category) {
            return res.status(400).json({ message: 'title, description and category are required' });
        }

        // Parse JSON strings from FormData
        if (typeof location === 'string') {
            try { location = JSON.parse(location); } catch (e) { location = {}; }
        }
        if (typeof aiAnalysis === 'string') {
            try { aiAnalysis = JSON.parse(aiAnalysis); } catch (e) { aiAnalysis = null; }
        }

        const deptResult = await query(
            `SELECT id FROM departments WHERE LOWER(name) = LOWER($1) LIMIT 1`,
            [category]
        );
        const departmentId = deptResult.rows[0]?.id || null;

        // 🗺️ Fetch nearby petitions for geo-context
        let nearbyContext = [];
        if (location?.lat && location?.lng) {
            try {
                const nearby = await query(`
                    SELECT title, category, status, created_at
                    FROM petitions
                    WHERE 
                        location_lat IS NOT NULL AND location_lng IS NOT NULL
                        AND ABS(location_lat - $1) < 0.005
                        AND ABS(location_lng - $2) < 0.005
                    ORDER BY created_at DESC
                    LIMIT 5
                `, [location.lat, location.lng]);
                nearbyContext = nearby.rows;
                if (nearbyContext.length > 0) {
                    console.log(`[SUBMIT] Found ${nearbyContext.length} nearby petitions for geo-context.`);
                }
            } catch (geoErr) {
                console.warn('[SUBMIT] Geo-context fetch failed (non-critical):', geoErr.message);
            }
        }

        // Run Server-side AI Analysis with geo-context
        const mediaPath = req.files?.media ? req.files.media[0].path : null;
        const aiResult = await aiService.analyzePetition(title, description, category, location, mediaPath, nearbyContext);

        // 🚀 Dynamic Status based on Trust Score (User Request Logic)
        let initialStatus = 'submitted'; // Default for Score >= 70
        let isSpam = false;

        const trustScore = aiResult.trustScore || 0;
        if (trustScore >= 70) {
            initialStatus = 'submitted'; // ✅ Accept
        } else if (trustScore >= 40) {
            initialStatus = 'pending';   // ⚠️ Pending
        } else {
            initialStatus = 'rejected';  // ❌ Reject
            isSpam = true;
        }

        // Dynamic Priority based on AI Urgency
        let priority = 'medium';
        if (aiResult.urgencyScore > 0.8) priority = 'high';
        else if (aiResult.urgencyScore < 0.4) priority = 'low';

        // Build a detailed step-by-step report for the officer/admin
        const stepReport = aiResult.steps.map(s => `${s.passed ? '✅' : '❌'} ${s.name}: ${s.detail}`).join('\n');
        let officerRemark = `AI trust Evaluation (Score: ${trustScore}/100):\n${stepReport}\n\nConclusion: ${aiResult.reason}`;

        console.log(`[SUBMIT] Data ready for DB. Trust Score: ${trustScore}, Status: ${initialStatus}`);

        try {
            const insertResult = await query(`
          INSERT INTO petitions 
            (title, description, category, status, priority, citizen_id, department_id,
             location_lat, location_lng, location_address, is_anonymous, media_url, audio_url,
             ai_urgency, ai_fake_prob, trust_score, ai_dept_prediction, ai_confidence, officer_remark, ai_analysis_report, ai_summary, admin_reviewed)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, false)
          RETURNING id, title, status, created_at
        `, [
                title, description, category, initialStatus, priority, citizenId, departmentId,
                location?.lat || null, location?.lng || null, location?.address || null,
                isAnonymous === 'true' || isAnonymous === true,
                mediaUrl,
                audioUrl,
                aiAnalysis?.urgencyScore || 0,
                aiResult.fakeProbability / 100,
                trustScore,
                aiAnalysis?.departmentPrediction || null,
                1.0,
                officerRemark,
                JSON.stringify(aiResult.steps || []),
                aiResult.summary || ''
            ]);

            const newPetition = {
                ...insertResult.rows[0],
                citizen_name: req.user.name || 'Citizen'
            };

            console.log(`[SUBMIT] SUCCESS. Petition ID: ${newPetition.id}`);

            if (isSpam) {
                return res.status(201).json({ message: 'Petition submitted but auto-rejected as spam', petition: newPetition, isSpam: true });
            }

            res.status(201).json({ message: 'Petition submitted', petition: newPetition });

            // Async notifications (email + SMS) — don't block the response
            emailService.sendPetitionConfirmation(req.user, insertResult.rows[0]);
            emailService.sendAdminNotification(req.user, insertResult.rows[0]);
            smsService.sendPetitionConfirmationSMS(req.user, insertResult.rows[0]);
            smsService.sendAdminNotificationSMS(req.user, insertResult.rows[0]);
        } catch (dbErr) {
            console.error('[SUBMIT] DATABASE ERROR:', dbErr);
            return res.status(500).json({ message: 'Database error while saving petition', error: dbErr.message });
        }
    } catch (error) {
        console.error('Submit petition error [CRITICAL]:', error);
        res.status(500).json({ 
            message: error.message || 'Error submitting petition',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        });
    }
});

// ─── PATCH /api/petitions/:id/status ──────────────────────────────────────────
// officer (their dept) or admin only — must include remark
router.patch('/:id/status', requireAuth, requireRole('officer', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remark } = req.body;
        const { role, department_id } = req.user;

        if (!status || !STATUS_VALUES.includes(status)) {
            return res.status(400).json({ message: `Invalid status. Use one of: ${STATUS_VALUES.join(', ')}` });
        }
        if (!remark || remark.trim().length < 5) {
            return res.status(400).json({ message: 'A remark (min 5 chars) is required when updating status' });
        }

        // Officers can only update petitions in their department
        if (role === 'officer') {
            const check = await query('SELECT department_id FROM petitions WHERE id = $1', [id]);
            if (check.rows.length === 0) return res.status(404).json({ message: 'Petition not found' });
            if (check.rows[0].department_id !== department_id) {
                return res.status(403).json({ message: 'You can only update petitions in your department' });
            }
        }

        const result = await query(`
      UPDATE petitions SET status = $1, officer_remark = $2, updated_at = now()
      WHERE id = $3 RETURNING id, status, officer_remark, updated_at
    `, [status, remark.trim(), id]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'Petition not found' });

        // Gamification: Award 50 points to the citizen if resolved
        if (status === 'resolved') {
            try {
                const petitionData = await query('SELECT citizen_id FROM petitions WHERE id = $1', [id]);
                if (petitionData.rows.length > 0) {
                    const citizenId = petitionData.rows[0].citizen_id;
                    await query('UPDATE users SET points = COALESCE(points, 0) + 50 WHERE id = $1', [citizenId]);
                }
            } catch (pErr) {
                console.error('Points Award Error:', pErr);
            }
        }

        res.json({ message: 'Status updated', petition: result.rows[0] });

        // Database Notification creation
        try {
            const petitionData = await query('SELECT citizen_id, title FROM petitions WHERE id = $1', [id]);
            if (petitionData.rows.length > 0) {
                const citizenId = petitionData.rows[0].citizen_id;
                const petitionTitle = petitionData.rows[0].title;
                await query(`
                    INSERT INTO notifications (user_id, petition_id, title, message, type)
                    VALUES ($1, $2, $3, $4, 'status_update')
                `, [
                    citizenId, 
                    id, 
                    'Petition Update!', 
                    `Your petition "${petitionTitle}" has been updated to ${status}. Remark: ${remark.trim()}`
                ]);
            }
        } catch (nErr) {
            console.error('DB Notification Insert Error:', nErr);
        }

        // Async notifications (email + SMS) for status update
        // Fetch citizen info (not the requesting officer)
        try {
            const userFetch = await query(`
                SELECT u.name, u.email, u.phone, u.language_pref, p.title, p.id
                FROM petitions p
                JOIN users u ON p.citizen_id = u.id
                WHERE p.id = $1
            `, [id]);

            if (userFetch.rows.length > 0) {
                const { name, email, phone, language_pref, title } = userFetch.rows[0];
                const citizenUser = { name, email, phone, language_pref };
                const petitionInfo = { title, id };
                
                // Use the resilient notification queue
                notificationQueue.enqueue('email', citizenUser, petitionInfo, status, remark);
                notificationQueue.enqueue('sms', citizenUser, petitionInfo, status, remark);
            }
        } catch (e) {
            console.error('Notification Queue Error:', e);
        }
    } catch (error) {
        console.error('Status update error:', error);
        res.status(500).json({ message: 'Error updating status' });
    }
});

// ─── PATCH /api/petitions/:id/approve ─────────────────────────────────────────
// admin only — marks petition as reviewed and assigns department
router.patch('/:id/approve', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { category } = req.body;
        let { department_id } = req.body;

        if (!category) {
            return res.status(400).json({ message: 'Category is required for approval' });
        }

        // Auto-fetch department ID if frontend failed to provide it
        if (!department_id) {
            const deptResult = await query(
                `SELECT id FROM departments WHERE LOWER(name) = LOWER($1) LIMIT 1`,
                [category]
            );
            if (deptResult.rows.length === 0) {
               return res.status(400).json({ message: `Invalid category mapping. Department '${category}' not found.` });
            }
            department_id = deptResult.rows[0].id;
        }

        const result = await query(`
          UPDATE petitions 
          SET admin_reviewed = true, category = $1, department_id = $2, updated_at = now()
          WHERE id = $3 RETURNING id, admin_reviewed, category, department_id
        `, [category, department_id, id]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'Petition not found' });

        res.json({ message: 'Petition approved and forwarded to officer', petition: result.rows[0] });

        // Notify the officer of the new assigned petition
        try {
          const deptInfo = await query('SELECT name FROM departments WHERE id = $1', [department_id]);
          if (deptInfo.rows.length > 0) {
            // Logic to send notification to department officers could be added here
            console.log(`[APPROVE] Petition ${id} forwarded to ${deptInfo.rows[0].name} department`);
          }
        } catch (e) {
          console.error('Notification error after approval:', e);
        }

        // Notify the citizen that their petition was verified and forwarded
        try {
            const userFetch = await query(`
                SELECT u.name, u.email, u.phone, u.language_pref, p.title, p.id
                FROM petitions p
                JOIN users u ON p.citizen_id = u.id
                WHERE p.id = $1
            `, [id]);

            if (userFetch.rows.length > 0) {
                const citizenUser = userFetch.rows[0];
                const petitionInfo = { title: citizenUser.title, id: citizenUser.id };
                const deptName = category;
                
                const newStatus = 'Verified & Assigned';
                const remark = `Your petition has been successfully verified by the administration and forwarded to the ${deptName} department for further action.`;
                
                // Use the resilient notification queue
                if (citizenUser.email) {
                    notificationQueue.enqueue('email', citizenUser, petitionInfo, newStatus, remark);
                }
                if (citizenUser.phone) {
                    notificationQueue.enqueue('sms', citizenUser, petitionInfo, newStatus, remark);
                }
            }
        } catch (e) {
            console.error('Citizen Notification Error on Approval:', e);
        }
    } catch (error) {
        console.error('Approval error:', error);
        res.status(500).json({ message: 'Error approving petition' });
    }
});

// ─── DELETE /api/petitions/:id ─────────────────────────────────────────────
// admin only
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const result = await query('DELETE FROM petitions WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Petition not found' });
        res.json({ message: 'Petition deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting petition' });
    }
});

// ─── GET /api/petitions/:id ─────────────────────────────────────────────────
// Fetch a single petition by UUID or 8-char prefix (for track-by-ID). PUBLIC ROUTE for QR tracking.
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Support both full UUID and 8-char prefix search
        const isFullUUID = id.length > 8;
        const whereId = isFullUUID
            ? 'p.id = $1'
            : "p.id::text LIKE ($1 || '%')";

        const result = await query(`
            SELECT
              p.id, p.title, p.description, p.category, p.status, p.priority,
              p.officer_remark, p.location_lat, p.location_lng, p.location_address,
              p.created_at, p.updated_at, p.is_anonymous, p.media_url, p.audio_url,
              p.ai_urgency, p.ai_fake_prob, p.ai_dept_prediction, p.ai_confidence, p.ai_keywords,
              p.ai_analysis_report, p.department_id,
              u.name AS citizen_name, u.email AS citizen_email,
              d.name AS department_name
            FROM petitions p
            LEFT JOIN users u ON p.citizen_id = u.id
            LEFT JOIN departments d ON p.department_id = d.id
            WHERE ${whereId}
            LIMIT 1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: `No petition found with ID: ${id}` });
        }

        const petition = result.rows[0];

        res.json(petition);
    } catch (error) {
        console.error('Get single petition error:', error);
        res.status(500).json({ message: 'Error fetching petition' });
    }
});

// ─── POST /api/petitions/:id/view ─────────────────────────────────────────────
router.post('/:id/view', async (req, res) => {
    try {
        const { id } = req.params;
        await query('UPDATE petitions SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1', [id]);
        res.json({ message: 'View counted' });
    } catch (error) {
        console.error('Error recording view:', error);
        res.status(500).json({ message: 'Error recording view' });
    }
});

// ─── POST /api/petitions/:id/upvote ──────────────────────────────────────────
// citizens only
router.post('/:id/upvote', requireAuth, requireRole('citizen'), strictLimiter, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if petition exists
        const petitionCheck = await query('SELECT id FROM petitions WHERE id = $1', [id]);
        if (petitionCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Petition not found' });
        }

        // Insert upvote, ignore if already exists (using ON CONFLICT)
        // Note: The table has a UNIQUE(petition_id, user_id) constraint
        await query(`
            INSERT INTO petition_upvotes (petition_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT (petition_id, user_id) DO NOTHING
        `, [id, userId]);

        res.json({ message: 'Upvoted successfully' });
    } catch (error) {
        console.error('Upvote error:', error);
        res.status(500).json({ message: 'Error upvoting petition' });
    }
});

// ─── DELETE /api/petitions/:id/upvote ────────────────────────────────────────
// citizens only
router.delete('/:id/upvote', requireAuth, requireRole('citizen'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        await query(`
            DELETE FROM petition_upvotes
            WHERE petition_id = $1 AND user_id = $2
        `, [id, userId]);

        res.json({ message: 'Upvote removed' });
    } catch (error) {
        console.error('Remove upvote error:', error);
        res.status(500).json({ message: 'Error removing upvote' });
    }
});

// ─── POST /api/petitions/:id/reanalyze ───────────────────────────────────────
// officer or admin only
router.post('/:id/reanalyze', requireAuth, requireRole('officer', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const petition = await query('SELECT title, description, category FROM petitions WHERE id = $1', [id]);
        if (petition.rows.length === 0) return res.status(404).json({ message: 'Petition not found' });

        const { title, description, category } = petition.rows[0];
        const aiResult = await aiService.analyzePetition(title, description, category);

        const stepReport = (aiResult.steps || []).map(s => `${s.passed ? '✅' : '❌'} ${s.name}: ${s.detail}`).join('\n');
        const officerRemark = `AI RE-ANALYSIS:\n${stepReport}\n\nConclusion: ${aiResult.reason}`;

        await query(`
            UPDATE petitions SET 
              ai_urgency = $1, ai_fake_prob = $2, officer_remark = $3, ai_analysis_report = $4, ai_summary = $5, updated_at = now()
            WHERE id = $6
        `, [
            aiResult.fakeProbability < 30 ? 0.2 : aiResult.fakeProbability < 60 ? 0.6 : 0.9,
            aiResult.fakeProbability / 100,
            officerRemark,
            JSON.stringify(aiResult.steps || []),
            aiResult.summary || '',
            id
        ]);

        res.json({ message: 'AI Re-analysis complete', steps: aiResult.steps, reason: aiResult.reason });
    } catch (error) {
        console.error('Re-analyze error:', error);
        res.status(500).json({ message: 'Error during AI analysis' });
    }
});

// ─── POST /api/petitions/auto-escalate ───────────────────────────────────────
// admin only: automatically escalates petitions older than 48 hours
router.post('/auto-escalate', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const escalationThreshold = '48 hours';
        
        const result = await query(`
            UPDATE petitions 
            SET status = 'escalated', 
                officer_remark = COALESCE(officer_remark, '') || '\n[AUTO-ESCALATED] No action taken within 48 hours.',
                updated_at = now()
            WHERE status IN ('submitted', 'pending')
              AND created_at < (now() - interval '${escalationThreshold}')
            RETURNING id, title, created_at
        `);

        res.json({
            message: `Auto-escalation check complete. ${result.rowCount} petitions escalated.`,
            escalatedPetitions: result.rows
        });
    } catch (error) {
        console.error('Auto-escalation error:', error);
        res.status(500).json({ message: 'Error during auto-escalation' });
    }
});

export default router;
