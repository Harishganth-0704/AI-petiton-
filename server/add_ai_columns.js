import pool from './db.js';

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Starting migration to add AI and missing columns...');

        // Add priority if missing
        await client.query(`
            ALTER TABLE petitions ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium';
        `);

        // Add media_url if missing
        await client.query(`
            ALTER TABLE petitions ADD COLUMN IF NOT EXISTS media_url TEXT;
        `);

        // Add is_anonymous if missing (it was in init-db.js but let's be safe)
        await client.query(`
            ALTER TABLE petitions ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE;
        `);

        // Add AI columns
        await client.query(`
            ALTER TABLE petitions ADD COLUMN IF NOT EXISTS ai_urgency DOUBLE PRECISION DEFAULT 0;
            ALTER TABLE petitions ADD COLUMN IF NOT EXISTS ai_fake_prob DOUBLE PRECISION DEFAULT 0;
            ALTER TABLE petitions ADD COLUMN IF NOT EXISTS ai_dept_prediction VARCHAR(100);
            ALTER TABLE petitions ADD COLUMN IF NOT EXISTS ai_confidence DOUBLE PRECISION DEFAULT 0;
            ALTER TABLE petitions ADD COLUMN IF NOT EXISTS ai_keywords TEXT[] DEFAULT '{}';
        `);

        // Also update init-db.js for future fresh installs
        console.log('Migration successful.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
