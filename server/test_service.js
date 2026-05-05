import { emailService } from './services/emailService.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log('Testing emailService.sendMail...');
    const result = await emailService.sendMail('hkanth742@gmail.com', 'Test from Service', '<h1>It works!</h1>');
    console.log('Result:', result ? 'Success' : 'Failed');
    process.exit(0);
}

test();
