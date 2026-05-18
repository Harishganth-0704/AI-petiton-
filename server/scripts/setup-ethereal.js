import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupEthereal() {
    console.log('Generating Ethereal email test account...');
    try {
        const testAccount = await nodemailer.createTestAccount();
        console.log('Account created!');
        console.log('User:', testAccount.user);
        console.log('Pass:', testAccount.pass);
        console.log('Web URL: https://ethereal.email/login');

        const envPath = path.join(__dirname, '..', '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');

        envContent = envContent.replace(/SMTP_HOST=.*/, `SMTP_HOST=smtp.ethereal.email`);
        envContent = envContent.replace(/SMTP_PORT=.*/, `SMTP_PORT=587`);
        envContent = envContent.replace(/SMTP_USER=.*/, `SMTP_USER=${testAccount.user}`);
        envContent = envContent.replace(/SMTP_PASS=.*/, `SMTP_PASS=${testAccount.pass}`);

        fs.writeFileSync(envPath, envContent);
        console.log('.env updated successfully with Ethereal credentials.');
    } catch (err) {
        console.error('Error generating Ethereal account:', err);
    }
}

setupEthereal();
