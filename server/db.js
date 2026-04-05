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

// Supabase and most cloud providers require SSL
if (process.env.DB_HOST && (process.env.DB_HOST.includes('supabase') || process.env.DB_HOST.includes('pooler'))) {
  dbConfig.ssl = { rejectUnauthorized: false };
}

const pool = new pg.Pool(dbConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Verify DB connection at startup
pool.query('SELECT NOW()').then(() => {
  console.log('✅ Database connected successfully');
}).catch(err => {
  console.error('❌ DATABASE CONNECTION FAILED:', err.message);
  console.error('   Host:', process.env.DB_HOST);
  console.error('   Port:', process.env.DB_PORT);
  console.error('   User:', process.env.DB_USER);
  console.error('   DB:  ', process.env.DB_NAME);
  console.error('   ➡  Check your .env and ensure your Supabase project is active (not paused).');
});

export const query = (text, params) => pool.query(text, params);
export default pool;
