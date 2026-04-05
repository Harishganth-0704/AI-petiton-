import { emailService } from './services/emailService.js';
import dotenv from 'dotenv';
dotenv.config();

async function testLoginNotification() {
    const user = {
        name: "Harish HIT",
        email: "720823103057@hit.edu.in",
        language_pref: "ta"
    };

    console.log(`Testing Login Notification for ${user.email}...`);
    const success = await emailService.sendLoginNotification(user);
    
    if (success) {
        console.log("✅ SUCCESS: Login Notification sent to " + user.email);
    } else {
        console.log("❌ FAILED: Could not send Login Notification");
    }
    process.exit();
}

testLoginNotification();
