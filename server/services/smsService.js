import twilio from 'twilio';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the server root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
 * Centralized service for sending SMS notifications
 * Uses Fast2SMS (India) with fallback to Twilio or Mock Mode
 */
class SmsService {
    constructor() {
        this.fast2smsKey = process.env.FAST2SMS_API_KEY;
        this.accountSid = process.env.TWILIO_ACCOUNT_SID;
        this.authToken = process.env.TWILIO_AUTH_TOKEN;
        this.fromNumber = process.env.TWILIO_PHONE_NUMBER;

        this.useFast2SMS = !!this.fast2smsKey;
        this.isTwilioConfigured = !!(this.accountSid && this.authToken && this.fromNumber);

        if (this.useFast2SMS) {
            console.log('SMS Service Check: ✅ Fast2SMS Ready (India)');
        } else if (this.isTwilioConfigured) {
            this.client = twilio(this.accountSid, this.authToken);
            console.log('SMS Service Check: ✅ Twilio Ready');
        } else {
            console.log('SMS Service Check: ⚠️ (Mock Mode/Credentials Missing)');
        }
    }

    /**
     * Send SMS notification
     * @param {string} to - Recipient phone number
     * @param {string} body - SMS content
     */
    async sendSms(to, body) {
        if (!to) {
            console.log('SMS Service: No phone number provided, skipping.');
            return null;
        }

        // Extract digits only for Fast2SMS (it expects 10-digit Indian numbers)
        let phoneDigits = to.toString().replace(/[^0-9]/g, '');
        // Remove country code if present
        if (phoneDigits.startsWith('91') && phoneDigits.length === 12) {
            phoneDigits = phoneDigits.substring(2);
        } else if (phoneDigits.startsWith('0') && phoneDigits.length === 11) {
            phoneDigits = phoneDigits.substring(1);
        }

        if (this.useFast2SMS) {
            try {
                console.log(`[Fast2SMS] To: ${phoneDigits} | Body: ${body}`);
                const response = await fetch(`https://www.fast2sms.com/dev/bulkV2?authorization=${this.fast2smsKey}&route=otp&variables_values=${encodeURIComponent(body)}&flash=0&numbers=${phoneDigits}`);
                const result = await response.json();
                console.log('Fast2SMS Response:', JSON.stringify(result));
                if (result.return === true) {
                    return { sid: result.request_id, status: 'sent' };
                } else {
                    console.error('Fast2SMS Error:', result.message);
                    return null;
                }
            } catch (error) {
                console.error('Fast2SMS Sending Error:', error.message);
                return false;
            }
        }

        // Format phone number for Twilio
        let formattedTo = to.toString();
        if (!formattedTo.startsWith('+')) {
            formattedTo = '+91' + formattedTo;
        }

        if (!this.isTwilioConfigured) {
            console.log(`[MOCK SMS] To: ${formattedTo} | Body: ${body}`);
            return { sid: 'mock_sid', status: 'mocked' };
        }

        console.log(`[SMS ATTEMPT] To: ${formattedTo} | Body: ${body}`);

        try {
            const message = await this.client.messages.create({
                body: body,
                from: this.fromNumber,
                to: formattedTo
            });

            console.log(`SMS Sent: ${message.sid} to ${formattedTo}`);
            return message;
        } catch (error) {
            console.error('SMS Sending Error:', error);
            // Return false so the queue knows to retry
            return false;
        }
    }

    /**
     * Get localized SMS body
     */
    getLocalizedBody(type, data, lang = 'en') {
        const translations = {
            en: {
                confirmation: `Civic Harmony: Your petition "{{title}}" (ID: {{id}}) has been received successfully. Status: Submitted.`,
                update: `Civic Harmony Update: Petition "{{title}}" is now {{status}}. Remark: {{remark}}. Check portal for details.`,
                admin: `Civic Harmony Admin: New petition submitted by {{name}}. Title: "{{title}}". ID: {{id}}.`,
                login: `Civic Harmony Security Alert: A new login was detected on your account at {{time}}.`,
                passwordChanged: `Civic Harmony: Your account password has been changed successfully at {{time}}. If this wasn't you, reset it now.`
            },
            ta: {
                confirmation: `சிவிக் ஹார்மனி: உங்கள் மனு "{{title}}" (ID: {{id}}) வெற்றிகரமாகப் பெறப்பட்டது. நிலை: சமர்ப்பிக்கப்பட்டது.`,
                update: `சிவிக் ஹார்மனி அப்டேட்: மனு "{{title}}" இப்போது {{status}} நிலையில் உள்ளது. குறிப்பு: {{remark}}. கூடுதல் விவரங்களுக்கு போர்ட்டலைச் சரிபார்க்கவும்.`,
                admin: `சிவிக் ஹார்மனி అడ్మిన్: {{name}} ஒரு புதிய மனுவைச் சமர்ப்பித்துள்ளார். தலைப்பு: "{{title}}". ID: {{id}}.`,
                login: `சிவிக் ஹார்மனி பாதுகாப்பு எச்சரிக்கை: உங்கள் கணக்கில் ஒரு புதிய உள்நுழைவு {{time}} மணிக்கு கண்டறியப்பட்டது.`,
                passwordChanged: `சிவிக் ஹார்மனி: உங்கள் கணக்கின் கடவுச்சொல் {{time}} மணிக்கு வெற்றிகரமாக மாற்றப்பட்டது. இது நீங்கள் இல்லையென்றால், உடனே மாற்றவும்.`
            },
            te: {
                confirmation: `సివిక్ హార్మొనీ: మీ పిటిషన్ "{{title}}" (ID: {{id}}) విజయవంతంగా స్వీకరించబడింది. స్థితి: సమర్పించబడింది.`,
                update: `సివిక్ హార్మొనీ అప్‌డేట్: పిటిషన్ "{{title}}" ఇప్పుడు {{status}} స్థితిలో ఉంది. రిమార్క్: {{remark}}. వివరాల కోసం పోర్టల్‌ని చూడండి.`,
                admin: `సివిక్ హార్మొనీ అడ్మిన్: {{name}} కొత్త పిటిషన్‌ను సమర్పించారు. శీర్షిక: "{{title}}". ఐడి: {{id}}.`,
                login: `సివిక్ హార్మొనీ సెక్యూరిటీ అలర్ట్: మీ ఖాతాలో కొత్త లాగిన్ {{time}} గంటలకు గుర్తించబడింది.`,
                passwordChanged: `సివిక్ హార్మొనీ: మీ ఖాతా పాస్‌వర్డ్ {{time}} గంటలకు విజయవంతంగా మార్చబడింది. ఇది మీరు కాకపోతే, వెంటనే రీసెట్ చేయండి.`
            },
            hi: {
                confirmation: `नागरिक सद्भाव: आपकी याचिका "{{title}}" (आईडी: {{id}}) सफलतापूर्वक प्राप्त हो गई है। स्थिति: प्रस्तुत।`,
                update: `नागरिक सद्भाव अपडेट: याचिका "{{title}}" अब {{status}} स्थिति में है। टिप्पणी: {{remark}}। विवरण के लिए पोर्टल देखें।`,
                admin: `नागरिक सद्भाव एडमिन: {{name}} द्वारा नई याचिका भेजी गई। शीर्षक: "{{title}}"। आईडी: {{id}}।`,
                login: `नागरिक सद्भाव सुरक्षा अलर्ट: आपके खाते में {{time}} बजे एक नया लॉगिन देखा गया।`,
                passwordChanged: `नागरिक सद्भाव: आपके खाते का पासवर्ड {{time}} बजे सफलतापूर्वक बदल दिया गया है। यदि यह आपने नहीं किया है, तो अभी इसे रीसेट करें।`
            },
            kn: {
                confirmation: `ಸಿವಿಕ್ ಹಾರ್ಮನಿ: ನಿಮ್ಮ ಅರ್ಜಿ "{{title}}" (ಐಡಿ: {{id}}) ಯಶಸ್ವಿಯಾಗಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ. ಸ್ಥಿತಿ: ಸಲ್ಲಿಸಲಾಗಿದೆ.`,
                update: `ಸಿವಿಕ್ ಹಾರ್ಮನಿ ಅಪ್‌ಡೇಟ್: ಅರ್ಜಿ "{{title}}" ಈಗ {{status}} ಸ್ಥಿತಿಯಲ್ಲಿದೆ. ಟಿಪ್ಪಣಿ: {{remark}}. ವಿವರಗಳಿಗಾಗಿ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.`,
                admin: `ಸಿವಿಕ್ ಹಾರ್ಮನಿ ಅಡ್ಮಿನ್: {{name}} ಅವರಿಂದ ಹೊಸ ಅರ್ಜಿ ಸಲ್ಲಿಕೆಯಾಗಿದೆ. ಶೀರ್ಷಿಕೆ: "{{title}}". ಐಡಿ: {{id}}.`,
                login: `ಸಿವಿಕ್ ಹಾರ್ಮನಿ ಭದ್ರತಾ ಎಚ್ಚರಿಕೆ: ನಿಮ್ಮ ಖಾತೆಯಲ್ಲಿ ಹೊಸ ಲಾಗಿನ್ {{time}} ರಂದು ಪತ್ತೆಯಾಗಿದೆ.`,
                passwordChanged: `ಸಿವಿಕ್ ಹಾರ್ಮನಿ: ನಿಮ್ಮ ಖಾತೆಯ ಪಾಸ್‌ವರ್ಡ್ {{time}} ರಂದು ಯಶಸ್ವಿಯಾಗಿ ಬದಲಾಯಿಸಲಾಗಿದೆ. ಇದು ನೀವಾಗಿಲ್ಲದಿದ್ದರೆ, ತಕ್ಷಣ ಮರುಹೊಂದಿಸಿ.`
            },
            ml: {
                confirmation: `സിവിക് ഹാർമണി: നിങ്ങളുടെ ഹർജി "{{title}}" (ID: {{id}}) വിജയകരമായി ലഭിച്ചു. നില: സമർപ്പിച്ചു.`,
                update: `സിവിക് ഹാർമണി അപ്‌ഡേറ്റ്: ഹർജി "{{title}}" ഇപ്പോൾ {{status}} നിലയിലാണ്. റിമാർക്ക്: {{remark}}. വിശദാംശങ്ങൾക്കായി പോർട്ടൽ പരിശോധിക്കുക.`,
                admin: `സിവിക് ഹാർമണി അഡ്മിൻ: {{name}} പുതിയ ഹർജി സമർപ്പിച്ചു. തലക്കെട്ട്: "{{title}}". ഐഡി: {{id}}.`,
                login: `സിവിക് ഹാർമണി സെക്യൂരിറ്റി അലേർട്ട്: നിങ്ങളുടെ അക്കൗണ്ടിൽ {{time}}-ന് ഒരു പുതിയ ലോഗിൻ കണ്ടെത്തി.`,
                passwordChanged: `സിവിക് ഹാർമണി: നിങ്ങളുടെ അക്കൗണ്ട് പാസ്‌വേഡ് {{time}}-ന് വിജയകരമായി മാറ്റി. ഇത് നിങ്ങളല്ലെങ്കിൽ, ഇപ്പോൾ തന്നെ റീസെറ്റ് ചെയ്യുക.`
            }
        };

        const t = translations[lang] || translations['en'];
        let body = t[type] || '';

        // Replace placeholders
        if (data.title) body = body.replace('{{title}}', data.title);
        if (data.id) body = body.replace('{{id}}', data.id);
        if (data.status) body = body.replace('{{status}}', data.status.toUpperCase());
        if (data.remark) {
            const shortRemark = data.remark.length > 50 ? data.remark.substring(0, 47) + '...' : data.remark;
            body = body.replace('{{remark}}', shortRemark);
        } else if (type === 'update') {
            body = body.replace('{{remark}}', 'No remark');
        }
        if (data.name) body = body.replace('{{name}}', data.name);
        if (data.time) body = body.replace('{{time}}', data.time);

        return body;
    }

    /**
     * Notify citizen upon petition submission
     */
    async sendPetitionConfirmationSMS(user, petition) {
        if (!user.phone) return null;
        const lang = user.language_pref || 'en';
        const body = this.getLocalizedBody('confirmation', { title: petition.title, id: petition.id }, lang);
        return this.sendSms(user.phone, body);
    }

    /**
     * Notify citizen when petition status changes
     */
    async sendStatusUpdateSMS(user, petition, newStatus, remark) {
        if (!user.phone) return null;
        const lang = user.language_pref || 'en';
        const body = this.getLocalizedBody('update', { title: petition.title, status: newStatus, remark }, lang);
        return this.sendSms(user.phone, body);
    }

    /**
     * Notify administrators upon petition submission
     */
    async sendAdminNotificationSMS(user, petition) {
        const adminPhone = process.env.ADMIN_PHONE_NUMBER;
        if (!adminPhone) return null;
        // Admins can receive in English or a default admin lang
        const body = this.getLocalizedBody('admin', { name: user.name, title: petition.title, id: petition.id }, 'en');
        return this.sendSms(adminPhone, body);
    }

    /**
     * Notify user upon successful login
     */
    async sendLoginNotificationSMS(user) {
        if (!user.phone) return null;
        const lang = user.language_pref || 'en';
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const body = this.getLocalizedBody('login', { time }, lang);
        return this.sendSms(user.phone, body);
    }

    /**
     * Notify user upon successful password change
     */
    async sendPasswordChangeNotificationSMS(user) {
        if (!user.phone) return null;
        const lang = user.language_pref || 'en';
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const body = this.getLocalizedBody('passwordChanged', { time }, lang);
        return this.sendSms(user.phone, body);
    }
}

export const smsService = new SmsService();
