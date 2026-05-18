import { notificationQueue } from './services/notificationQueue.js';

// Mock user and petition
const user = { name: 'Test Citizen', email: 'test@example.com', phone: '9876543210', language_pref: 'en' };
const petition = { title: 'Broken Water Pipe', id: 'TEST-123' };

console.log('--- Testing Notification Resilience ---');
console.log('Simulation: SMTP/SMS service is "down" (returning false).');

// We don't need to actually break the services because we can just observe 
// the logs since they currently return false if credentials are missing anyway.
// In a real environment, they might fail due to network too.

async function runTest() {
    // Enqueue an email and an SMS
    console.log('Enqueuing notifications...');
    notificationQueue.enqueue('email', user, petition, 'in_progress', 'We are working on it!');
    notificationQueue.enqueue('sms', user, petition, 'in_progress', 'We are working on it!');

    console.log('Waiting for retry cycles (approx 15s)...');
    
    // Let it run for a bit to see retries in the console
    setTimeout(() => {
        console.log('--- Test Ended ---');
        console.log('View console logs above to see the Queue retry mechanism in action.');
        process.exit(0);
    }, 20000);
}

runTest();
