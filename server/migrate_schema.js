import pool from './db.js';

async function migrate() {
    console.log('Starting comprehensive migration...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Create departments table
        console.log('Creating departments table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS departments (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL
            )
        `);

        // 2. Insert default departments if they don't exist
        const defaultDepts = ['water', 'road', 'electricity', 'sanitation', 'healthcare'];
        for (const dept of defaultDepts) {
            await client.query('INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [dept]);
        }

        // 3. Fix users table
        console.log('Fixing users table...');
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='department_id') THEN
                    ALTER TABLE users ADD COLUMN department_id INTEGER REFERENCES departments(id);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_active') THEN
                    ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
                END IF;
                -- Handle password vs password_hash inconsistency
                -- We'll keep 'password' for auth.js compatibility and maybe add password_hash as alias or just use password
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password') THEN
                    ALTER TABLE users ADD COLUMN password VARCHAR(255);
                END IF;
            END $$;
        `);

        // 4. Fix petitions table (ensure all columns from fix-petitions-schema.js are present)
        console.log('Fixing petitions table...');
        await client.query(`
            ALTER TABLE petitions
            ALTER COLUMN department DROP NOT NULL,
            ADD COLUMN IF NOT EXISTS category TEXT,
            ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'submitted',
            ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
            ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id),
            ADD COLUMN IF NOT EXISTS officer_remark TEXT,
            ADD COLUMN IF NOT EXISTS location_lat FLOAT,
            ADD COLUMN IF NOT EXISTS location_lng FLOAT,
            ADD COLUMN IF NOT EXISTS location_address TEXT,
            ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS media_url TEXT,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS ai_urgency FLOAT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS ai_fake_prob FLOAT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS ai_dept_prediction TEXT,
            ADD COLUMN IF NOT EXISTS ai_confidence FLOAT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS ai_keywords TEXT[];
        `);

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e.message);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
