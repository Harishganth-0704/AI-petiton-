import pool from './db.js';

async function checkSchema() {
    const petitionCols = await pool.query(
        `SELECT column_name, data_type FROM information_schema.columns 
     WHERE table_name = 'petitions' ORDER BY ordinal_position`
    );
    const userCols = await pool.query(
        `SELECT column_name, data_type FROM information_schema.columns 
     WHERE table_name = 'users' ORDER BY ordinal_position`
    );
    console.log('=== PETITIONS TABLE ===');
    console.log(petitionCols.rows.length ? petitionCols.rows : 'Table does not exist');
    console.log('\n=== USERS TABLE ===');
    console.log(userCols.rows);
    process.exit(0);
}

checkSchema().catch(err => { console.error(err.message); process.exit(1); });
