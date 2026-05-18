import pool from './db.js';
import dotenv from 'dotenv';
dotenv.config();

// Real Indian city coordinates for realistic map markers
const LOCATIONS = [
    { lat: 28.6139, lng: 77.2090, address: 'Connaught Place, New Delhi' },
    { lat: 19.0760, lng: 72.8777, address: 'Andheri West, Mumbai' },
    { lat: 12.9716, lng: 77.5946, address: 'MG Road, Bengaluru' },
    { lat: 22.5726, lng: 88.3639, address: 'Park Street, Kolkata' },
    { lat: 17.3850, lng: 78.4867, address: 'Hitech City, Hyderabad' },
    { lat: 13.0827, lng: 80.2707, address: 'Anna Nagar, Chennai' },
    { lat: 18.5204, lng: 73.8567, address: 'Shivaji Nagar, Pune' },
    { lat: 23.0225, lng: 72.5714, address: 'CG Road, Ahmedabad' },
    { lat: 26.8467, lng: 80.9462, address: 'Hazratganj, Lucknow' },
];

async function patchCoordinates() {
    const res = await pool.query('SELECT id FROM petitions ORDER BY created_at');
    const petitions = res.rows;

    if (petitions.length === 0) {
        console.log('No petitions to patch');
        pool.end();
        return;
    }

    for (let i = 0; i < petitions.length; i++) {
        const loc = LOCATIONS[i % LOCATIONS.length];
        await pool.query(
            `UPDATE petitions SET location_lat = $1, location_lng = $2, location_address = $3 WHERE id = $4`,
            [loc.lat, loc.lng, loc.address, petitions[i].id]
        );
        console.log(`✅ Patched petition ${petitions[i].id.slice(0, 8)}... → ${loc.address}`);
    }

    const check = await pool.query('SELECT COUNT(*) FROM petitions WHERE location_lat IS NOT NULL');
    console.log(`\n✅ ${check.rows[0].count}/${petitions.length} petitions now have coordinates`);
    pool.end();
}

patchCoordinates().catch(e => { console.error(e.message); pool.end(); });
