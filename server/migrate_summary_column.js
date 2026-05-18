import { query } from './db.js';
import dotenv from 'dotenv';
dotenv.config();

async function migrate_v2() {
    try {
        console.log("Adding 'ai_summary' column to petitions table for Admin V2 features...");
        await query("ALTER TABLE petitions ADD COLUMN IF NOT EXISTS ai_summary TEXT;");
        
        // Optionally update existing petitions with a default summary if needed
        await query("UPDATE petitions SET ai_summary = SUBSTRING(description FROM 1 FOR 60) || '...' WHERE ai_summary IS NULL;");
        
        console.log("MIGRATION_V2_SUCCESS");
        process.exit(0);
    } catch (err) {
        console.error("MIGRATION_V2 ERROR:", err);
        process.exit(1);
    }
}

migrate_v2();
