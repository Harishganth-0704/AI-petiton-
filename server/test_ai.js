import { aiService } from './services/aiService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function test() {
    console.log('Testing AI Service...');
    
    const samples = [
        { title: 'Fake Petition', desc: 'This is just a fake petition for testing.', location: { address: '123 Fake Street', lat: 0, lng: 0 } },
        { title: 'Electricity Issue', desc: 'Power cut in my house since morning.', location: { address: 'Chennai, Tamil Nadu', lat: 13.0827, lng: 80.2707 } },
        { title: 'Test from mobile', desc: 'test test test', location: { address: 'Test Location', lat: 10, lng: 10 } },
        { title: 'தண்ணீர் பிரச்சனை', desc: 'எங்கள் தெருவில் தண்ணீர் வரவில்லை.', location: { address: 'மதுரை', lat: 9.9252, lng: 78.1198 } },
        { title: 'asdfghjkl', desc: 'qwertyuiop' }
    ];

    for (const sample of samples) {
        console.log(`\n--- Testing: "${sample.title}" ---`);
        try {
            const result = await aiService.analyzePetition(sample.title, sample.desc, 'water', sample.location);
            console.log('Result:', JSON.stringify(result, null, 2));
        } catch (err) {
            console.error('Test Failed:', err);
        }
    }
}

test();
