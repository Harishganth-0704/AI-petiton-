
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'petition_hub',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
};

if (process.env.DB_HOST && (process.env.DB_HOST.includes('supabase.co') || process.env.DB_HOST.includes('supabase.com'))) {
  dbConfig.ssl = { rejectUnauthorized: false };
}

const pool = new pg.Pool(dbConfig);

async function checkOtp() {
  try {
    const res = await pool.query(`
      SELECT u.name, u.phone, o.otp, o.expires_at 
      FROM users u 
      JOIN user_otps o ON u.id = o.user_id 
      WHERE u.phone = '8489241014' OR u.phone = '+918489241014'
      ORDER BY o.expires_at DESC 
      LIMIT 5
    `);
    console.log('OTP Results:', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkOtp();
