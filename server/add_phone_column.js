import pool from './db.js';

async function addPhoneColumn() {
    const client = await pool.connect();
    try {
        console.log('Adding phone column to users table...');
        await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT NULL;
    `);
        console.log('✅ phone column added successfully (or already exists).');
    } catch (error) {
        console.error('Error adding phone column:', error);
    } finally {
        client.release();
        process.exit();
    }
}

addPhoneColumn();
