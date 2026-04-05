import pool from './db.js';

async function migrateTrendingSchema() {
  const client = await pool.connect();
  try {
    console.log('Running trending migrations...');
    
    // Add view_count to petitions if it doesn't exist
    await client.query(`
      ALTER TABLE petitions 
      ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
    `);
    console.log('Added view_count to petitions table');

    // Create petition_comments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS petition_comments (
        id SERIAL PRIMARY KEY,
        petition_id INTEGER REFERENCES petitions(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created petition_comments table');

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    client.release();
    process.exit();
  }
}

migrateTrendingSchema();
