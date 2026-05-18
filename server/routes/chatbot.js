import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Multi-language system prompts
const SYSTEM_PROMPTS = {
    en: `You are a helpful civic grievance assistant for "Civic Harmony" - a public petition portal in India.
Your ONLY job is to GUIDE the citizen to file a petition in a structured and friendly way.
Ask one question at a time. Be concise.

CONVERSATION FLOW:
1. Greet them and ask: "Please briefly describe your problem."
2. Based on their input, identify the DEPARTMENT (water, road, electricity, sanitation, or healthcare) and confirm with them.
3. Ask for a SHORT TITLE (e.g., "Water leakage near main road").
4. Ask for a DETAILED DESCRIPTION.
5. Ask for their LOCATION (e.g., "Anna Nagar, Vellore"). Optional.
6. Once you have all info, reply ONLY with this exact JSON (and nothing else):
{"PETITION_READY": true, "title": "...", "category": "water|road|electricity|sanitation|healthcare", "description": "...", "location": "..."}

IMPORTANT: At step 6, respond with ONLY valid JSON. No extra text.`,

    ta: `நீங்கள் "Civic Harmony" என்ற இணையதளத்தில் ஒரு உதவியாளர். இது இந்திய குடிமக்களுக்கான ஒரு மனு தளம்.
உங்கள் ஒரே வேலை, குடிமக்கள் மனு சமர்ப்பிக்க சரியான வழியில் வழிகாட்டுவது. ஒரு நேரத்தில் ஒரு கேள்வி மட்டும் கேளுங்கள்.

உரையாடல் வழி:
1. வரவேற்று கேளுங்கள்: "உங்கள் பிரச்சனையை சுருக்கமாக சொல்லுங்கள்."
2. அவர்கள் சொல்வதை வைத்து துறையை கண்டுபிடியுங்கள் (water, road, electricity, sanitation, healthcare) மற்றும் உறுதிப்படுத்துங்கள்.
3. ஒரு சுருக்கமான தலைப்பு கேளுங்கள்.
4. விரிவான விளக்கம் கேளுங்கள்.
5. இருப்பிடம் கேளுங்கள் (விருப்பமானது).
6. எல்லா தகவல்களும் கிடைத்தவுடன், ONLY இந்த JSON பதில் தாருங்கள்:
{"PETITION_READY": true, "title": "...", "category": "water|road|electricity|sanitation|healthcare", "description": "...", "location": "..."}

முக்கியம்: படி 6-இல் ONLY valid JSON மட்டும் பதில் தாருங்கள்.`
};

// Rule-based fallback chatbot
function localChatbot(message, history, lang) {
    const lower = message.toLowerCase();
    const count = history.filter(m => m.role === 'user').length;

    const responses = {
        en: {
            0: "Welcome! 👋 I'm your Grievance Assistant. Please briefly describe your problem so I can help you draft a petition.",
            1: () => {
                let dept = 'sanitation';
                if (lower.includes('water') || lower.includes('pipe') || lower.includes('leak')) dept = 'water';
                else if (lower.includes('road') || lower.includes('pothole') || lower.includes('street')) dept = 'road';
                else if (lower.includes('light') || lower.includes('electric') || lower.includes('power')) dept = 'electricity';
                else if (lower.includes('hospital') || lower.includes('health') || lower.includes('clinic')) dept = 'healthcare';
                return `I see this is a **${dept}** issue. Can you give me a short, clear title? (e.g., "Water pipe burst near main road")`;
            },
            2: "Thanks! Now please describe the problem in detail — what happened, when it started, and how it affects your area.",
            3: "Almost done! What is the location? (e.g., Anna Nagar, Vellore) — or type 'skip' to leave it blank.",
        },
        ta: {
            0: "வணக்கம்! 👋 நான் உங்கள் மனு உதவியாளர். உங்கள் பிரச்சனையை சுருக்கமாக சொல்லுங்கள், நான் மனு தயார் செய்கிறேன்.",
            1: () => {
                let dept = 'sanitation';
                if (lower.includes('தண்ணீர்') || lower.includes('குழாய்') || lower.includes('water')) dept = 'water';
                else if (lower.includes('சாலை') || lower.includes('road') || lower.includes('குழி')) dept = 'road';
                else if (lower.includes('மின்') || lower.includes('light') || lower.includes('current')) dept = 'electricity';
                else if (lower.includes('மருத்துவ') || lower.includes('hospital') || lower.includes('health')) dept = 'healthcare';
                return `இது **${dept}** பிரச்சனை. ஒரு சுருக்கமான தலைப்பு சொல்லுங்கள். (எ.கா., "முக்கிய சாலையில் தண்ணீர் குழாய் உடைப்பு")`;
            },
            2: "நன்றி! இப்போது பிரச்சனையை விரிவாக விளக்குங்கள் — என்ன நடந்தது, எப்போது ஆரம்பித்தது, எப்படி பாதிக்கிறது.",
            3: "கிட்டத்தட்ட முடிந்தது! இருப்பிடம் சொல்லுங்கள் (எ.கா., அண்ணா நகர், வேலூர்) — அல்லது 'skip' என்று தட்டச்சு செய்யுங்கள்.",
        }
    };

    const r = responses[lang] || responses['en'];
    const idx = Math.min(count, 3);
    const reply = typeof r[idx] === 'function' ? r[idx]() : r[idx];

    // If we have enough info (after 4 exchanges), build the petition
    if (count >= 4) {
        // Collect fields from history
        const userMsgs = history.filter(m => m.role === 'user').map(m => m.content);
        const problem = userMsgs[0] || '';
        const title = userMsgs[1] || problem.substring(0, 60);
        const description = userMsgs[2] || problem;
        const location = (userMsgs[3] || '').toLowerCase() === 'skip' ? '' : (userMsgs[3] || '');

        let category = 'sanitation';
        const allText = (problem + title + description).toLowerCase();
        if (allText.includes('தண்ணீர்') || allText.includes('water') || allText.includes('குழாய்') || allText.includes('pipe')) category = 'water';
        else if (allText.includes('சாலை') || allText.includes('road') || allText.includes('pothole')) category = 'road';
        else if (allText.includes('மின்') || allText.includes('electr') || allText.includes('light')) category = 'electricity';
        else if (allText.includes('மருத்துவ') || allText.includes('health') || allText.includes('hospital')) category = 'healthcare';

        return {
            text: null,
            petition: { title: title.trim(), category, description: description.trim(), location: location.trim() }
        };
    }

    return { text: reply, petition: null };
}

// POST /api/chatbot
router.post('/', async (req, res) => {
    const { message, history = [], lang = 'en' } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const apiKey = process.env.GEMINI_API_KEY;

    // Try Gemini AI first
    if (apiKey) {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            const systemPrompt = SYSTEM_PROMPTS[lang] || SYSTEM_PROMPTS['en'];
            const fullHistory = [
                { role: 'user', parts: [{ text: 'System: ' + systemPrompt }] },
                { role: 'model', parts: [{ text: 'Understood! I am your civic grievance assistant. I am ready to help.' }] },
                ...history.map(h => ({
                    role: h.role === 'user' ? 'user' : 'model',
                    parts: [{ text: h.content }]
                }))
            ];

            const chat = model.startChat({ history: fullHistory });
            const result = await chat.sendMessage(message);
            const textResponse = result.response.text().trim();

            // Check if it returned PETITION_READY JSON
            if (textResponse.includes('"PETITION_READY"')) {
                const jsonMatch = textResponse.match(/\{[\s\S]*"PETITION_READY"[\s\S]*\}/);
                if (jsonMatch) {
                    const petition = JSON.parse(jsonMatch[0]);
                    return res.json({ text: null, petition: { title: petition.title, category: petition.category, description: petition.description, location: petition.location || '' } });
                }
            }

            return res.json({ text: textResponse, petition: null });
        } catch (err) {
            console.log('[Chatbot] Gemini unavailable, using local fallback:', err.message);
        }
    }

    // Local rule-based fallback
    const result = localChatbot(message, history, lang);
    res.json(result);
});

export default router;
