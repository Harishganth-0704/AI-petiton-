import { exec } from 'child_process';
import fetch from 'node-fetch';

console.log('Starting server on port 5001...');
const server = exec('set PORT=5001 && node index.js');

server.stdout.on('data', d => console.log('SERVER:', d.trim()));
server.stderr.on('data', d => console.error('SERVER ERR:', d.trim()));

setTimeout(async () => {
    try {
        console.log('Logging in...');
        const loginRes = await fetch('http://localhost:5001/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@civicharmony.com', password: 'Admin@1234' })
        });
        const loginData = await loginRes.json();

        if (!loginData.token) throw new Error('No token returned');

        console.log('Fetching dashboard stats...');
        const statsRes = await fetch('http://localhost:5001/api/dashboard/stats', {
            headers: { 'Authorization': `Bearer ${loginData.token}` }
        });
        const statsData = await statsRes.json();

        console.log('\n--- DASHBOARD STATS RESULT ---');
        console.log(JSON.stringify(statsData, null, 2));
    } catch (e) {
        console.error('\n--- TEST FAILED ---');
        console.error(e.message);
    } finally {
        console.log('\nShutting down server...');
        server.kill();
        process.exit(0);
    }
}, 3000);
