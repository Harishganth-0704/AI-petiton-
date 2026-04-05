import { query } from './db.js';

async function checkSchema() {
    try {
        const result = await query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'petitions';
    `);
        console.log('--- Petitions Table Column Count ---');
        console.log('Total Columns:', result.rows.length);
        console.log('Column Names:', result.rows.map(r => r.column_name).sort().join(', '));
        process.exit(0);
    } catch (err) {
        console.error('Error checking schema:', err);
        process.exit(1);
    }
}

checkSchema();
