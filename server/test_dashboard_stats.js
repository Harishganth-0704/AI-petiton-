import fetch from 'node-fetch';

async function testStats() {
    try {
        // 1. Login as Admin
        const loginRes = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@civicharmony.com', password: 'Admin@1234' })
        });

        const loginData = await loginRes.json();
        const token = loginData.token;

        console.log('Login successful. Token acquired.');

        // 2. Fetch Dashboard Stats
        const statsRes = await fetch('http://localhost:5000/api/dashboard/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const statsData = await statsRes.json();
        console.log('\n--- Dashboard Analytics Endpoint Body ---');
        console.log(JSON.stringify(statsData, null, 2));

    } catch (err) {
        console.error('Test failed:', err);
    }
}

testStats();
