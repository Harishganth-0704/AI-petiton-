import { query } from './db.js';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
    try {
        console.log("Adding 'admin_reviewed' column to petitions table...");
        await query("ALTER TABLE petitions ADD COLUMN IF NOT EXISTS admin_reviewed BOOLEAN DEFAULT FALSE;");
        
        // Mark existing resolved/in_progress petitions as reviewed so they don't disappear for officers
        await query("UPDATE petitions SET admin_reviewed = TRUE WHERE status NOT IN ('submitted', 'pending');");
        
        console.log("MIGRATION_SUCCESS");
        process.exit(0);
    } catch (err) {
        console.error("MIGRATION ERROR:", err);
        process.exit(1);
    }
}

migrate();
