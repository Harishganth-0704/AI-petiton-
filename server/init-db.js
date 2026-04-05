import pool from './db.js';

async function initDB() {
  const client = await pool.connect();
  try {
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(20) UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'citizen',
        language_pref VARCHAR(10) DEFAULT 'en',
        points INTEGER DEFAULT 0,
        profile_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_verified BOOLEAN DEFAULT false
      )
    `);
    console.log('Users table created successfully');

    console.log('Creating petitions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS petitions (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        department VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'submitted',
        priority VARCHAR(50) DEFAULT 'medium',
        citizen_id INTEGER REFERENCES users(id),
        location_lat DOUBLE PRECISION,
        location_lng DOUBLE PRECISION,
        address TEXT,
        is_anonymous BOOLEAN DEFAULT FALSE,
        media_url TEXT,
        ai_urgency DOUBLE PRECISION DEFAULT 0,
        ai_fake_prob DOUBLE PRECISION DEFAULT 0,
        ai_dept_prediction VARCHAR(100),
        ai_confidence DOUBLE PRECISION DEFAULT 0,
        ai_keywords TEXT[] DEFAULT '{}',
        view_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        sla_deadline TIMESTAMP WITH TIME ZONE,
        assigned_officer_id INTEGER REFERENCES users(id),
        audio_url TEXT
      )
    `);
    console.log('Petitions table created successfully');

    console.log('Creating petition_upvotes table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS petition_upvotes (
        id SERIAL PRIMARY KEY,
        petition_id INTEGER REFERENCES petitions(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(petition_id, user_id)
      )
    `);
    console.log('Petition upvotes table created successfully');

    console.log('Creating petition_comments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS petition_comments (
        id SERIAL PRIMARY KEY,
        petition_id INTEGER REFERENCES petitions(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Petition comments table created successfully');

    console.log('Creating feedbacks table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS feedbacks (
        id SERIAL PRIMARY KEY,
        petition_id INTEGER REFERENCES petitions(id) UNIQUE NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        is_appealed BOOLEAN DEFAULT FALSE,
        appeal_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Feedbacks table created successfully');

    console.log('Creating user_otps table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_otps (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        otp VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('User_otps table created successfully');
    
    console.log('Creating announcements table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'normal',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Announcements table created successfully');

    console.log('Creating audit_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action TEXT NOT NULL,
        target_id INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Audit_logs table created successfully');

    console.log('Database initialization complete.');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    client.release();
    process.exit();
  }
}

initDB();
