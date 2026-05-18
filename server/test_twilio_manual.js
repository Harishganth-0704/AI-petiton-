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
// CHANGE THIS TO USER'S ACTUAL NUMBER FOR TESTING IF POSSIBLE, OR USE A KNOWN NUMBER
const toNumber = '+919943261765'; // Example number, user should provide theirs or I'll try to find it

console.log('Using Account SID:', accountSid);
console.log('Using From Number:', fromNumber);

if (!accountSid || !authToken || !fromNumber) {
    console.error('ERROR: Twilio credentials missing in .env');
    process.exit(1);
}

const client = twilio(accountSid, authToken);

async function testSms() {
    try {
        console.log(`Attempting to send test SMS to ${toNumber}...`);
        const message = await client.messages.create({
            body: 'Civic Harmony: This is a test OTP message 123456.',
            from: fromNumber,
            to: toNumber
        });
        console.log('SUCCESS! Message SID:', message.sid);
    } catch (error) {
        console.error('FAILED to send SMS:');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        console.error('More info:', error.moreInfo);
    }
}

testSms();
