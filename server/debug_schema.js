import { query } from './db.js';

async function checkSchema() {
  try {
    const res = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'petitions'
    `);
    console.log('--- Petitions Table Schema ---');
    res.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });
    console.log('------------------------------');
    process.exit(0);
  } catch (err) {
    console.error('Error fetching schema:', err.message);
    process.exit(1);
  }
}

checkSchema();
