import { query } from '../db.js';

async function fixSchema() {
    console.log('Fixing petitions table schema...');
    try {
        await query(`
            ALTER TABLE petitions
            ADD COLUMN IF NOT EXISTS category TEXT,
            ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'submitted',
            ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
            ADD COLUMN IF NOT EXISTS department_id INTEGER,
            ADD COLUMN IF NOT EXISTS officer_remark TEXT,
            ADD COLUMN IF NOT EXISTS location_lat FLOAT,
            ADD COLUMN IF NOT EXISTS location_lng FLOAT,
            ADD COLUMN IF NOT EXISTS location_address TEXT,
            ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS media_url TEXT,
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS ai_urgency FLOAT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS ai_fake_prob FLOAT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS ai_dept_prediction TEXT,
            ADD COLUMN IF NOT EXISTS ai_confidence FLOAT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS ai_keywords TEXT[];
        `);
        console.log('Successfully updated petitions table schema.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit();
    }
}

fixSchema();
