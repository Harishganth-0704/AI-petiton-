import { query } from './db.js';

async function checkData() {
    try {
        const result = await query(`
      SELECT p.id, p.title, p.citizen_id, u.name as citizen_name, u.email as citizen_email 
      FROM petitions p 
      LEFT JOIN users u ON p.citizen_id = u.id 
      LIMIT 10
    `);
        console.log('--- Petition & User Join Data ---');
        console.table(result.rows);
        process.exit(0);
    } catch (err) {
        console.error('Error checking data:', err);
        process.exit(1);
    }
}

checkData();
