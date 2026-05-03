import pool from '../db.js';

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Adding trust_score column to petitions table...');
        await client.query(`
            ALTER TABLE petitions 
            ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 0;
        `);
        console.log('✅ trust_score column added successfully.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
