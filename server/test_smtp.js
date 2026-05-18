import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

async function testEmail() {
    try {
        console.log('Verifying SMTP connection...');
        await transporter.verify();
        console.log('SUCCESS: SMTP connection verified!');

        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: process.env.SMTP_USER, // Send to self
            subject: 'Civic Harmony - SMTP Test',
            text: 'This is a test email to verify SMTP configuration.',
        };

        console.log(`Sending test email to ${process.env.SMTP_USER}...`);
        const info = await transporter.sendMail(mailOptions);
        console.log('SUCCESS: Email sent! Message ID:', info.messageId);
    } catch (error) {
        console.error('FAILED to send email:');
        console.error(error);
    }
}

testEmail();
