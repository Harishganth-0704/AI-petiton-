
import twilio from 'twilio';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const toNumber = '+918489241014'; // User's number from screenshot

console.log('--- Twilio Test ---');
console.log('SID:', accountSid);
console.log('From:', fromNumber);
console.log('To:', toNumber);

if (!accountSid || !authToken || !fromNumber) {
    console.error('Error: Missing Twilio credentials in .env');
    process.exit(1);
}

const client = twilio(accountSid, authToken);

async function sendTest() {
    try {
        console.log('Attempting to send SMS...');
        const message = await client.messages.create({
            body: 'Civic Harmony Test SMS check',
            from: fromNumber,
            to: toNumber
        });
        console.log('Success! Message SID:', message.sid);
    } catch (error) {
        console.error('Twilio Error Code:', error.code);
        console.error('Twilio Error Message:', error.message);
        if (error.code === 21608) {
            console.log('Reason: This is likely a Trial Account. You can only send SMS to "Verified Caller IDs".');
        } else if (error.code === 21408) {
            console.log('Reason: SMS to this region (India) is not enabled in Geographic Permissions.');
        }
    }
}

sendTest();
