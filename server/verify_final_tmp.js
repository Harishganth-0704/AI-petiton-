import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT),
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    try {
        const r = await pool.query("SELECT name, email, role FROM users WHERE email = 'verifier_corrected_2026@example.com'");
        console.log('USER IN DB:', JSON.stringify(r.rows[0], null, 2));
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await pool.end();
    }
}

verify();
