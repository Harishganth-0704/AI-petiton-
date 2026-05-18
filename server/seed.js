import pool from './db.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

async function seed() {
    console.log('Seeding admin and officer accounts...\n');

    const adminHash = await bcrypt.hash('Admin@1234', 10);
    const officerHash = await bcrypt.hash('Officer@1234', 10);

    // Upsert admin (ignore if email exists)
    const adminResult = await pool.query(
        `INSERT INTO users (name, email, password, role, department_id)
     VALUES ('System Admin', 'admin@civicharmony.com', $1, 'admin', NULL)
     ON CONFLICT (email) DO UPDATE SET role = 'admin', password = $1
     RETURNING id, name, email, role`,
        [adminHash]
    );
    console.log('✅ Admin:', adminResult.rows[0]);

    // One officer per department
    const depts = await pool.query('SELECT id, name FROM departments');
    for (const dept of depts.rows) {
        const hash = await bcrypt.hash(`Officer@${dept.id}234`, 10);
        const r = await pool.query(
            `INSERT INTO users (name, email, password, role, department_id, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (email) DO UPDATE
       SET password = EXCLUDED.password, role = EXCLUDED.role, department_id = EXCLUDED.department_id
       RETURNING id, name, email`,
            [
                `${dept.name.charAt(0).toUpperCase() + dept.name.slice(1)} Officer`,
                `officer.${dept.name}@civicharmony.com`,
                hash,
                'officer', // Role is now a parameter
                dept.id,
            ]
        );
        console.log(`✅ Officer [${dept.name}]:`, r.rows[0].email, '| password: Officer@' + dept.id + '234');
    }

    // Add some sample petitions spread across departments so dashboard shows data
    const citizenResult = await pool.query("SELECT id FROM users WHERE role = 'citizen' LIMIT 3");
    const citizens = citizenResult.rows;

    if (citizens.length > 0) {
        const samples = [
            { title: 'Road pothole near market', desc: 'Large pothole causing accidents near main market junction.', cat: 'road', deptId: 2 },
            { title: 'Street light outage on MG Road', desc: 'Three consecutive street lights not working for 2 weeks.', cat: 'electricity', deptId: 3 },
            { title: 'Garbage not collected for 5 days', desc: 'Municipal garbage truck has not visited our area for 5 days.', cat: 'sanitation', deptId: 4 },
            { title: 'Water supply contamination', desc: 'Brown water coming from taps in the morning.', cat: 'water', deptId: 1 },
            { title: 'Hospital staff shortage', desc: 'District hospital emergency wing critically understaffed.', cat: 'healthcare', deptId: 5 },
        ];

        for (let i = 0; i < samples.length; i++) {
            const s = samples[i];
            const citizen = citizens[i % citizens.length];
            await pool.query(
                `INSERT INTO petitions (title, description, category, status, priority, citizen_id, department_id, is_anonymous)
         VALUES ($1, $2, $3, 'submitted', 'medium', $4, $5, false)
         ON CONFLICT DO NOTHING`,
                [s.title, s.desc, s.cat, citizen.id, s.deptId]
            );
        }
        console.log('\n✅ Added 5 sample petitions across all departments');
    }

    console.log('\n─────────────────────────────────────────');
    console.log('LOGIN CREDENTIALS:');
    console.log('  Admin    → admin@civicharmony.com    | Admin@1234');
    console.log('  Officers → officer.water@civicharmony.com | Officer@1234');
    console.log('             officer.road@civicharmony.com  | Officer@2234');
    console.log('             (etc. for electricity, sanitation, healthcare)');
    console.log('─────────────────────────────────────────');

    pool.end();
}

seed().catch(e => { console.error('Seed failed:', e.message); pool.end(); });
