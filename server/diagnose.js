import pool from './db.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

async function diagnose() {
    console.log('\n======= DATABASE DIAGNOSTIC =======\n');

    // 1. All users
    const users = await pool.query(`SELECT id, name, email, role, department_id, is_active FROM users`);
    console.log('USERS:', users.rows.length ? users.rows : '⚠️ No users found');

    // 2. All petitions
    const petitions = await pool.query(`SELECT id, title, category, status, citizen_id, department_id FROM petitions ORDER BY created_at DESC LIMIT 10`);
    console.log('\nPETITIONS:', petitions.rows.length ? petitions.rows : '⚠️ No petitions found');

    // 3. Departments
    const depts = await pool.query(`SELECT id, name FROM departments`);
    console.log('\nDEPARTMENTS:', depts.rows);

    // 4. Test JWT generation for each user and what the petition query returns for each role
    for (const u of users.rows) {
        const token = jwt.sign(
            { id: u.id, name: u.name, email: u.email, role: u.role, department_id: u.department_id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        let petitionCount = 0;
        if (u.role === 'citizen') {
            const r = await pool.query('SELECT COUNT(*) FROM petitions WHERE citizen_id = $1', [u.id]);
            petitionCount = parseInt(r.rows[0].count);
        } else if (u.role === 'officer') {
            const r = await pool.query('SELECT COUNT(*) FROM petitions WHERE department_id = $1', [u.department_id]);
            petitionCount = parseInt(r.rows[0].count);
        } else {
            const r = await pool.query('SELECT COUNT(*) FROM petitions');
            petitionCount = parseInt(r.rows[0].count);
        }

        console.log(`\n[${u.role.toUpperCase()}] ${u.email}`);
        console.log(`  dept_id: ${u.department_id}, visible_petitions: ${petitionCount}`);
        console.log(`  Sample JWT: ${token.slice(0, 60)}...`);
    }

    // 5. Stats query test
    const stats = await pool.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
      COUNT(*) FILTER (WHERE status NOT IN ('resolved')) AS pending,
      COUNT(*) FILTER (WHERE status = 'escalated') AS escalated
    FROM petitions
  `);
    console.log('\nSTATS:', stats.rows[0]);

    const deptStats = await pool.query(`
    SELECT d.name AS department, COUNT(*) AS count
    FROM petitions p
    JOIN departments d ON p.department_id = d.id
    GROUP BY d.name
  `);
    console.log('DEPT BREAKDOWN:', deptStats.rows.length ? deptStats.rows : '⚠️ No dept data (usually means petitions have no department_id)');

    pool.end();
}

diagnose().catch(e => { console.error('Diagnostic failed:', e.message); pool.end(); });
