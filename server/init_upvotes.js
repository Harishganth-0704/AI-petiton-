import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function init() {
  try {
    console.log('--- Initializing Upvotes Table ---');
    
    // Create upvotes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS petition_upvotes (
        id SERIAL PRIMARY KEY,
        petition_id INTEGER REFERENCES petitions(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(petition_id, user_id)
      );
    `);
    console.log('✅ petition_upvotes table ready.');

    // Add upvotes_count column to petitions if not exists
    await pool.query(`
      ALTER TABLE petitions 
      ADD COLUMN IF NOT EXISTS upvotes_count INTEGER DEFAULT 0;
    `);
    console.log('✅ upvotes_count column ready.');

    process.exit(0);
  } catch (err) {
    console.error('❌ database init failed:', err);
    process.exit(1);
  }
}

init();
