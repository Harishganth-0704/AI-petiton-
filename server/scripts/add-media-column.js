import { query } from '../db.js';

async function migrate() {
    console.log('Running migration to add media_url to petitions table...');
    try {
        await query(`
            ALTER TABLE petitions
            ADD COLUMN IF NOT EXISTS media_url TEXT;
        `);
        console.log('Successfully added media_url column.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit();
    }
}

migrate();
