import { query } from './db.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkSchema() {
    try {
        console.log("Connecting to Supabase Database...");
        const result = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'petitions';");
        console.log("SCHEMA_RESULT:" + JSON.stringify(result.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error("DATABASE ERROR:", err);
        process.exit(1);
    }
}

checkSchema();
