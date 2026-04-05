import { emailService } from './services/emailService.js';
import { smsService } from './services/smsService.js';

const mockUser = {
    name: 'Harish',
    email: 'hkanth742@gmail.com',
    phone: '+919943099253',
    language_pref: 'ta'
};

const mockPetition = {
    id: 'PET-123456',
    title: 'குடிநீர் குழாய் உடைப்பு (Water Leakage)',
    status: 'Submitted'
};

function testLocalization() {
    console.log('--- LOCALIZATION TEST START ---');

    const languages = ['en', 'ta', 'te', 'hi', 'kn', 'ml'];

    languages.forEach(lang => {
        const user = { ...mockUser, language_pref: lang };
        console.log(`\nTesting Language: ${lang.toUpperCase()}`);

        const smsBody = smsService.getLocalizedBody('confirmation', { title: mockPetition.title, id: mockPetition.id }, lang);
        console.log(`[SMS - Confirmation]: ${smsBody}`);

        const updateSms = smsService.getLocalizedBody('update', { title: mockPetition.title, status: 'Resolved', remark: 'Done' }, lang);
        console.log(`[SMS - Update]: ${updateSms}`);

        const emailContent = emailService.getLocalizedContent(lang);
        console.log(`[Email - Subject]: ${emailContent.confSubject.replace('{{title}}', mockPetition.title)}`);
    });

    console.log('\n--- LOCALIZATION TEST END ---');
}

testLocalization();
