import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Centralized service for sending emails
 * Uses Nodemailer with SMTP configuration from environment variables
 */
class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.ethereal.email',
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER || 'mock_user',
                pass: process.env.SMTP_PASS || 'mock_pass',
            },
        });

        // Verify connection on startup
        this.transporter.verify((error, success) => {
            if (error) {
                console.error('Email Service Error (Startup Check):', error.message);
                if (error.code === 'EAUTH') {
                    console.error('⚠️ Critical: Invalid SMTP Credentials (SMTP_PASS likely expired)');
                }
                console.log('Email Service Check: ⚠️ (Mock Mode/Credentials Missing)');
            } else {
                console.log('Email Service Check: ✅ Ready to send emails');
            }
        });
    }

    /**
     * Send email notification
     * @param {string} to - Recipient email
     * @param {string} subject - Email subject
     * @param {string} html - HTML content
     */
    async sendMail(to, subject, html) {
        try {
            const info = await this.transporter.sendMail({
                from: process.env.SMTP_FROM || '"Civic Harmony" <noreply@civic-harmony.gov>',
                to,
                subject,
                html,
            });

            console.log(`Email Sent: ${info.messageId} to ${to}`);
            return info;
        } catch (error) {
            console.error('Email Sending Error:', error.message);
            if (error.code === 'EAUTH') {
                console.error('⚠️ Authentication Failure: Check your SMTP_PASS in .env');
            }
            // Return false so the queue knows to retry
            return false;
        }
    }

    /**
     * Get localized content based on language preference
     */
    getLocalizedContent(lang = 'en') {
        const translations = {
            en: {
                confSubject: 'Petition Received: {{title}}',
                confTitle: 'Civic Harmony',
                confDear: 'Dear',
                confSuccess: 'Your petition has been successfully received and is now in our system.',
                labelTitle: 'Title',
                labelId: 'Petition ID',
                labelStatus: 'Status',
                confFooter: 'You will receive further updates via email as our team reviews your request.',
                confNote: 'Thank you for your active participation in improving our community.',
                statusSubject: 'Status Update: {{title}}',
                statusUpdate: 'There is an update on your petition status.',
                labelNewStatus: 'New Status',
                labelRemark: 'Officer Remark',
                checkPortal: 'Check the portal for more details.',
                autoMsg: 'This is an automated message, please do not reply.',
                loginSubject: 'Successful Login: Civic Harmony',
                loginMsg: 'You have just successfully logged into your Civic Harmony account.',
                welcomeSubject: 'Welcome to Civic Harmony!',
                welcomeMsg: 'Thank you for joining our platform. Your account is now verified and ready to use.',
                passwordSubject: 'Password Changed Successfully: Civic Harmony',
                passwordMsg: 'Your account password has been successfully updated.'
            },
            ta: {
                confSubject: 'மனு பெறப்பட்டது: {{title}}',
                confTitle: 'சமூக நல்லிணக்கம்',
                confDear: 'அன்புள்ள',
                confSuccess: 'உங்கள் மனு வெற்றிகரமாகப் பெறப்பட்டது மற்றும் இப்போது எங்கள் அமைப்பில் உள்ளது.',
                labelTitle: 'தலைப்பு',
                labelId: 'மனு ஐடி',
                labelStatus: 'நிலை',
                confFooter: 'எங்கள் குழு உங்கள் கோரிக்கையை மதிப்பாய்வு செய்யும் போது மின்னஞ்சல் மூலம் மேலதிக அறிவிப்புகளைப் பெறுவீர்கள்.',
                confNote: 'எங்கள் சமூகத்தை மேம்படுத்துவதில் உங்கள் தீவிர பங்கேற்பிற்கு நன்றி.',
                statusSubject: 'நிலை புதுப்பிப்பு: {{title}}',
                statusUpdate: 'உங்கள் மனுவின் நிலையில் ஒரு புதிய புதுப்பிப்பு உள்ளது.',
                labelNewStatus: 'புதிய நிலை',
                labelRemark: 'அதிகாரியின் குறிப்பு',
                checkPortal: 'கூடுதல் விவரங்களுக்கு போர்ட்டலைச் சரிபார்க்கவும்.',
                autoMsg: 'இது ஒரு தானியங்கி செய்தி, தயவுசெய்து பதிலளிக்க வேண்டாம்.',
                loginSubject: 'வெற்றிகரமான உள்நுழைவு: சமூக நல்லிணக்கம்',
                loginMsg: 'உங்கள் சமூக நல்லிணக்கக் கணக்கில் நீங்கள் வெற்றிகரமாக உள்நுழைந்துள்ளீர்கள்.',
                welcomeSubject: 'சமூக நல்லிணக்கத்திற்கு உங்களை வரவேற்கிறோம்!',
                welcomeMsg: 'எங்கள் தளத்தில் இணைந்ததற்கு நன்றி. உங்கள் கணக்கு இப்போது சரிபார்க்கப்பட்டு பயன்படுத்தத் தயாராக உள்ளது.',
                passwordSubject: 'கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது: சமூக நல்லிணக்கம்',
                passwordMsg: 'உங்கள் கணக்கின் கடவுச்சொல் வெற்றிகரமாக புதுப்பிக்கப்பட்டது.'
            },
            te: {
                confSubject: 'పిటిషన్ స్వీకరించబడింది: {{title}}',
                confTitle: 'సివిక్ హార్మొనీ',
                confDear: 'ప్రియమైన',
                confSuccess: 'మీ పిటిషన్ విజయవంతంగా స్వీకరించబడింది మరియు ఇప్పుడు మా సిస్టమ్‌లో ఉంది.',
                labelTitle: 'శీర్షిక',
                labelId: 'పిటిషన్ ఐడి',
                labelStatus: 'స్థితి',
                confFooter: 'మా బృందం మీ అభ్యర్థనను సమీక్షించినప్పుడు మీరు ఇమెయిల్ ద్వారా మరిన్ని నవీకరణలను అందుకుంటారు.',
                confNote: 'మా కమ్యూనిటీని మెరుగుపరచడంలో మీ చురుకైన భాగస్వామ్యానికి ధన్యవాదాలు.',
                statusSubject: 'స్థితి నవీకరణ: {{title}}',
                statusUpdate: 'మీ పిటిషన్ స్థితిపై నవీకరణ ఉంది.',
                labelNewStatus: 'కొత్త స్థితి',
                labelRemark: 'అధికారి రిమార్క్',
                checkPortal: 'మరిన్ని వివరాల కోసం పోర్టల్‌ని తనిఖీ చేయండి.',
                autoMsg: 'ఇది ఒక ఆటోమేటెడ్ మెసేజ్, దయచేసి రిప్లై ఇవ్వకండి.',
                passwordSubject: 'పాస్‌వర్డ్ విజయవంతంగా మార్చబడింది: సివిక్ హార్మొనీ',
                passwordMsg: 'మీ ఖాతా పాస్‌వర్డ్ విజయవంతంగా నవీకరించబడింది.'
            },
            hi: {
                confSubject: 'याचिका प्राप्त हुई: {{title}}',
                confTitle: 'नागरिक सद्भाव',
                confDear: 'प्रिय',
                confSuccess: 'आपकी याचिका सफलतापूर्वक प्राप्त हो गई है और अब हमारे सिस्टम में है।',
                labelTitle: 'शीर्षक',
                labelId: 'याचिका आईडी',
                labelStatus: 'स्थिति',
                confFooter: 'हमारी टीम आपके अनुरोध की समीक्षा करने पर आपको ईमेल के माध्यम से और अपडेट प्राप्त होंगे।',
                confNote: 'हमारे समुदाय को बेहतर बनाने में आपकी सक्रिय भागीदारी के लिए धन्यवाद।',
                statusSubject: 'status अपडेट: {{title}}',
                statusUpdate: 'आपकी याचिका की स्थिति पर एक अपडेट है।',
                labelNewStatus: 'नई स्थिति',
                labelRemark: 'अधिकारी की टिप्पणी',
                checkPortal: 'अधिक जानकारी के लिए पोर्टल देखें।',
                autoMsg: 'यह एक स्वचालित संदेश है, कृपया उत्तर न दें।',
                passwordSubject: 'पासवर्ड सफलतापूर्वक बदल दिया गया: नागरिक सद्भाव',
                passwordMsg: 'आपके खाते का पासवर्ड सफलतापूर्वक अपडेट कर दिया गया है।'
            },
            kn: {
                confSubject: 'ಅರ್ಜಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ: {{title}}',
                confTitle: 'ಸಿವಿಕ್ ಹಾರ್ಮನಿ',
                confDear: 'ಪ್ರಿಯ',
                confSuccess: 'ನಿಮ್ಮ ಅರ್ಜಿಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ ಮತ್ತು ಈಗ ನಮ್ಮ ಸಿಸ್ಟಮ್‌ನಲ್ಲಿದೆ.',
                labelTitle: 'ಶೀರ್ಷಿಕೆ',
                labelId: 'ಅರ್ಜಿ ಐಡಿ',
                labelStatus: 'ಸ್ಥಿತಿ',
                confFooter: 'ನಮ್ಮ ತಂಡವು ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ಪರಿಶೀಲಿಸಿದಾಗ ಇಮೇಲ್ ಮೂಲಕ ನೀವು ಹೆಚ್ಚಿನ ನವೀಕರಣಗಳನ್ನು ಪಡೆಯುತ್ತೀರಿ.',
                confNote: 'ನಮ್ಮ ಸಮುದಾಯವನ್ನು ಸುಧಾರಿಸುವಲ್ಲಿ ನಿಮ್ಮ ಸಕ್ರಿಯ ಭಾಗವಹಿಸುವಿಕೆಗಾಗಿ ಧನ್ಯವಾದಗಳು.',
                statusSubject: 'ಸ್ಥಿತಿ ನವೀಕರಣ: {{title}}',
                statusUpdate: 'ನಿಮ್ಮ ಅರ್ಜಿಯ ಸ್ಥಿತಿಯ ಬಗ್ಗೆ ನವೀಕರಣವಿದೆ.',
                labelNewStatus: 'ಹೊಸ ಸ್ಥಿತಿ',
                labelRemark: 'ಅಧಿಕಾರಿಯ ಟಿಪ್ಪಣಿ',
                checkPortal: 'ಹೆಚ್ಚಿನ ವಿವರಗಳಿಗಾಗಿ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ.',
                autoMsg: 'ಇದು ಸ್ವಯಂಚಾಲಿತ ಸಂದೇಶವಾಗಿದೆ, ದಯವಿಟ್ಟು ಉತ್ತರಿಸಬೇಡಿ.',
                passwordSubject: 'ಪಾಸ್‌ವರ್ಡ್ ಯಶಸ್ವಿಯಾಗಿ ಬದಲಾಗಿದೆ: ಸಿವಿಕ್ ಹಾರ್ಮನಿ',
                passwordMsg: 'ನಿಮ್ಮ ಖಾತೆಯ ಪಾಸ್‌ವರ್ಡ್ ಯಶಸ್ವಿಯಾಗಿ ನವೀಕರಿಸಲ್ಪಟ್ಟಿದೆ.'
            },
            ml: {
                confSubject: 'ഹർജി ലഭിച്ചു: {{title}}',
                confTitle: 'സിവിക് ഹാർമണി',
                confDear: 'പ്രിയപ്പെട്ട',
                confSuccess: 'നിങ്ങളുടെ ഹർജി വിജയകരമായി ലഭിച്ചു, അത് ഇപ്പോൾ ഞങ്ങളുടെ സിസ്റ്റത്തിലുണ്ട്.',
                labelTitle: 'തലക്കെട്ട്',
                labelId: 'ഹർജി ഐഡി',
                labelStatus: 'നില',
                confFooter: 'ഞങ്ങളുടെ ടീം നിങ്ങളുടെ അഭ്യർത്ഥന അവലോകനം ചെയ്യുമ്പോൾ നിങ്ങൾക്ക് ഇമെയിൽ വഴി കൂടുതൽ അപ്‌ഡേറ്റുകൾ ലഭിക്കും.',
                confNote: 'ഞങ്ങളുടെ കമ്മ്യൂണിറ്റിയെ മെച്ചപ്പെടുത്തുന്നതിൽ നിങ്ങളുടെ സജീവ പങ്കാളിത്തത്തിന് നന്ദി.',
                statusSubject: 'സ്റ്റാറ്റസ് അപ്‌ഡേറ്റ്: {{title}}',
                statusUpdate: 'നിങ്ങളുടെ ഹർജി സ്റ്റാറ്റസിൽ ഒരു അപ്‌ഡേറ്റ് ഉണ്ട്.',
                labelNewStatus: 'പുതിയ നില',
                labelRemark: 'ഓഫീസർ റിമാർക്ക്',
                checkPortal: 'കൂടുതൽ വിവരങ്ങൾക്ക് പോർട്ടൽ പരിശോധിക്കുക.',
                autoMsg: 'ഇതൊരു ഓട്ടോമേറ്റഡ് സന്ദേശമാണ്, ദയവായി മറുപടി നൽകരുത്.',
                welcomeMsg: 'നിങ്ങളുടെ അക്കൗണ്ട് പാസ്‌വേഡ് വിജയകരമായി പുതുക്കി.',
                passwordSubject: 'പാസ്‌വേഡ് വിജയകരമായി മാറ്റി: സിവിക് ഹാർമണി',
                passwordMsg: 'നിങ്ങളുടെ അക്കൗണ്ട് പാസ്‌വേഡ് വിജയകരമായി പുതുക്കി.'
            }
        };
        return translations[lang] || translations['en'];
    }

    /**
     * Notify citizen upon petition submission
     */
    async sendPetitionConfirmation(user, petition) {
        const lang = user.language_pref || 'en';
        const t = this.getLocalizedContent(lang);
        const subject = t.confSubject.replace('{{title}}', petition.title);
        
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #004a99;">${t.confTitle}</h2>
                <p>${t.confDear} <strong>${user.name}</strong>,</p>
                <p>${t.confSuccess}</p>
                <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #004a99; margin: 20px 0;">
                    <p><strong>${t.labelTitle}:</strong> ${petition.title}</p>
                    <p><strong>${t.labelId}:</strong> ${petition.id}</p>
                    <p><strong>${t.labelStatus}:</strong> ${petition.status || 'Submitted'}</p>
                </div>
                <p>${t.confFooter}</p>
                <p>${t.confNote}</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <small style="color: #888;">${t.autoMsg}</small>
            </div>
        `;
        return this.sendMail(user.email, subject, html);
    }

    /**
     * Notify citizen when petition status changes
     */
    async sendStatusUpdate(user, petition, newStatus, remark) {
        const lang = user.language_pref || 'en';
        const t = this.getLocalizedContent(lang);
        const subject = t.statusSubject.replace('{{title}}', petition.title);

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #004a99;">${t.confTitle}</h2>
                <p>${t.confDear} <strong>${user.name}</strong>,</p>
                <p>${t.statusUpdate}</p>
                <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #004a99; margin: 20px 0;">
                    <p><strong>${t.labelTitle}:</strong> ${petition.title}</p>
                    <p><strong>${t.labelNewStatus}:</strong> <span style="text-transform: uppercase; font-weight: bold; color: #004a99;">${newStatus}</span></p>
                    <p><strong>${t.labelRemark}:</strong> ${remark}</p>
                </div>
                <p>${t.checkPortal}</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <small style="color: #888;">${t.autoMsg}</small>
            </div>
        `;
        return this.sendMail(user.email, subject, html);
    }

    /**
     * Notify administrators upon petition submission
     */
    async sendAdminNotification(user, petition) {
        const adminEmail = process.env.SMTP_USER; // Defaulting to the SMTP user as admin
        const subject = `NEW PETITION: ${petition.title}`;
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #d32f2f;">Admin Notification</h2>
                <p>A new petition has been submitted by <strong>${user.name}</strong> (${user.email}).</p>
                <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #d32f2f; margin: 20px 0;">
                    <p><strong>Title:</strong> ${petition.title}</p>
                    <p><strong>Petition ID:</strong> ${petition.id}</p>
                    <p><strong>Status:</strong> ${petition.status}</p>
                </div>
                <p>Please review it in the admin dashboard.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <small style="color: #888;">This is an automated message intended for administrators.</small>
            </div>
        `;
        return this.sendMail(adminEmail, subject, html);
    }

    /**
     * Notify user upon successful login
     */
    async sendLoginNotification(user) {
        const lang = user.language_pref || 'en';
        const t = this.getLocalizedContent(lang);
        const subject = t.loginSubject;
        const now = new Date().toLocaleString();

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #004a99;">${t.confTitle}</h2>
                <p>${t.confDear} <strong>${user.name}</strong>,</p>
                <p>${t.loginMsg}</p>
                <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #4caf50; margin: 20px 0;">
                    <p><strong>Time:</strong> ${now}</p>
                    <p><strong>Security Note:</strong> If this wasn't you, please reset your password immediately.</p>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <small style="color: #888;">${t.autoMsg}</small>
            </div>
        `;
        return this.sendMail(user.email, subject, html);
    }

    /**
     * Send welcome email after account verification
     */
    async sendWelcomeEmail(user) {
        const lang = user.language_pref || 'en';
        const t = this.getLocalizedContent(lang);
        const subject = t.welcomeSubject;

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #004a99;">${t.confTitle}</h2>
                <p>${t.confDear} <strong>${user.name}</strong>,</p>
                <p>${t.welcomeMsg}</p>
                <div style="background: #e3f2fd; padding: 15px; border-left: 4px solid #004a99; margin: 20px 0;">
                    <p>You can now submit petitions, track status, and participate in community improvements.</p>
                </div>
                <p>Thank you for being a part of our community!</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <small style="color: #888;">${t.autoMsg}</small>
            </div>
        `;
        return this.sendMail(user.email, subject, html);
    }

    /**
     * Notify user upon successful password change
     */
    async sendPasswordChangeNotification(user) {
        const lang = user.language_pref || 'en';
        const t = this.getLocalizedContent(lang);
        const subject = t.passwordSubject || 'Password Changed Successfully';
        const now = new Date().toLocaleString();

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #004a99;">${t.confTitle}</h2>
                <p>${t.confDear} <strong>${user.name}</strong>,</p>
                <p>${t.passwordMsg || 'Your account password has been successfully updated.'}</p>
                <div style="background: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin: 20px 0;">
                    <p><strong>Time:</strong> ${now}</p>
                    <p><strong>Security Note:</strong> If you did not perform this action, please contact support or reset your password immediately to secure your account.</p>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <small style="color: #888;">${t.autoMsg}</small>
            </div>
        `;
        return this.sendMail(user.email, subject, html);
    }
}

export const emailService = new EmailService();