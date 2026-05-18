import twilio from 'twilio';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
    console.error('ERROR: Twilio credentials missing in .env');
    process.exit(1);
}

const client = twilio(accountSid, authToken);

async function listNumbers() {
    try {
        console.log('Fetching incoming phone numbers...');
        const incomingPhoneNumbers = await client.incomingPhoneNumbers.list({ limit: 20 });

        if (incomingPhoneNumbers.length === 0) {
            console.log('No phone numbers found in this account.');
        } else {
            console.log('Available Phone Numbers:');
            incomingPhoneNumbers.forEach(n => {
                console.log(`- ${n.phoneNumber} (Sid: ${n.sid}, Friendly Name: ${n.friendlyName})`);
            });
        }

        console.log('\nFetching Messaging Services...');
        const services = await client.messaging.v1.services.list({ limit: 20 });
        if (services.length > 0) {
            console.log('Available Messaging Services (can be used as TWILIO_PHONE_NUMBER):');
            services.forEach(s => {
                console.log(`- ${s.sid} (Friendly Name: ${s.friendlyName})`);
            });
        }

    } catch (error) {
        console.error('FAILED to fetch numbers:');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
    }
}

listNumbers();
