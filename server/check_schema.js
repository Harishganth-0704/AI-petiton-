import { query } from './db.js';

async function checkSchema() {
  try {
    const userRes = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id'
    `);
    console.log('Users table "id" type:', userRes.rows[0]);

    const petRes = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'petitions' AND column_name = 'id'
    `);
    console.log('Petitions table "id" type:', petRes.rows[0]);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSchema();
