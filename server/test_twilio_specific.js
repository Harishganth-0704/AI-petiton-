import twilio from 'twilio';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function testSms() {
    const to = '+919943099253';
    console.log(`Sending test SMS to ${to}...`);
    try {
        const message = await client.messages.create({
            body: 'Civic Harmony Test SMS - If you see this, SMS is working!',
            from: process.env.TWILIO_PHONE_NUMBER,
            to: to
        });
        console.log('Success! SMS SID:', message.sid);
    } catch (error) {
        console.error('FAILED to send SMS:');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        console.error('More Info:', error.moreInfo);
    }
}

testSms();
