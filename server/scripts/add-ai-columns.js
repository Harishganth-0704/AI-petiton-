import { query } from '../db.js';

async function migrate() {
    console.log('Running migration to add AI analysis columns to petitions table...');
    try {
        await query(`
            ALTER TABLE petitions
            ADD COLUMN IF NOT EXISTS ai_urgency FLOAT,
            ADD COLUMN IF NOT EXISTS ai_fake_prob FLOAT,
            ADD COLUMN IF NOT EXISTS ai_dept_prediction TEXT,
            ADD COLUMN IF NOT EXISTS ai_confidence FLOAT,
            ADD COLUMN IF NOT EXISTS ai_keywords TEXT[];
        `);
        console.log('Successfully added AI analysis columns.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit();
    }
}

migrate();
