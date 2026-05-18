import pool from './db.js';

async function checkDepts() {
    try {
        const res = await pool.query('SELECT * FROM departments LIMIT 20');
        console.log('=== DEPARTMENTS ===');
        console.log(res.rows);
    } catch (err) {
        console.log('departments table error:', err.message);
    }
    process.exit(0);
}

checkDepts();
