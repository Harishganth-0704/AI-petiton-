import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

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
    family: 4,
    tls: { rejectUnauthorized: false }
});

const toEmail = '720823103057@hit.edu.in';
console.log(`Sending test email to ${toEmail}...`);

transporter.sendMail({
    from: process.env.SMTP_FROM || '"Civic Harmony" <noreply@civic-harmony.gov>',
    to: toEmail,
    subject: 'Render SMTP Test',
    html: '<p>This is a test email to verify SMTP configuration.</p>'
}).then(info => {
    console.log('Success:', info.messageId);
    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
