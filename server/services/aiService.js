import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Service to analyze petitions using Google Gemini Core SDK.
 */
class AiService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        this.isConfigured = !!this.apiKey;
        if (this.isConfigured) {
            this.ai = new GoogleGenerativeAI(this.apiKey);
            console.log('AI Service Check: ✅ Ready for Petition Analysis');
        } else {
            console.log('AI Service Check: ⚠️ Missing GEMINI_API_KEY (Running in mock mode)');
        }
    }

    /**
     * Analyze a petition using a multi-stage process to ensure quality and authenticity.
     * Steps: 1. Spam Check, 2. Civic Relevance, 3. Duplicate/Pattern Check, 4. Final Scoring.
     * @param {string} title 
     * @param {string} description 
     * @returns {Promise<{fakeProbability: number, reason: string, steps: Array<{name: string, passed: boolean, detail: string}>}>}
     */
    async analyzePetition(title, description, userCategory = 'sanitation') {
        if (!this.isConfigured) {
            console.log(`[MOCK AI] Advanced Analysis for "${title}"...`);
            return {
                fakeProbability: 5,
                urgencyScore: 0.2,
                departmentPrediction: userCategory,
                departmentConfidence: 0.9,
                reason: "Mock mode: System appears accurate.",
                steps: [
                    { name: "Spam Check", passed: true, detail: "Text is readable and clearly describes a grievance." },
                    { name: "Civic Relevance", passed: true, detail: "Issue relates to public infrastructure/services." },
                    { name: "Duplicate Detection", passed: true, detail: "No identical reports found in recent history." },
                    { name: "Priority Assessment", passed: true, detail: "Standard priority assigned." }
                ]
            };
        }

        try {
            const prompt = `You are a Senior Government Compliance Officer for "Civic Harmony", a platform for public grievances.
Analyze the following petition with 100% accuracy.

DATA TO ANALYZE:
Title: "${title}"
Description: "${description}"
User-Selected Category: "${userCategory}"

STRICT 4-STAGE VERIFICATION PROTOCOL:

Stage 1: Spam & Quality Check
- Is it gibberish, just random letters (e.g. "asdf"), or non-grievance text (e.g. "I love pizza")?
- Is it a commercial advertisement or promotional content?
- PASSED only if it's a coherent petition.

Stage 2: Civic Relevance Check
- Does this fall under GOVERNMENT/CIVIC responsibility?
- VALID: Potholes, street lights, water leaks, garbage, drainage, public parks, schools, electricity.
- INVALID: Personal family disputes, private house interior repairs, relationship advice, movie reviews.

Stage 3: Duplicate & Pattern Check
- Look for signs of "copy-paste" spam or bots.

Stage 4: Final Metrics & Routing
- Calculate Fake Probability (0-100). Any "nonsense" text is 100% fake.
- Calculate Urgency Score (0.0 to 1.0). High scores (0.8+) for: Live wire hazards, major flooding, health epidemics, bridge collapses.
- Identify the best Department: water, road, electricity, sanitation, or healthcare.

RESPONSE FORMAT (Strict JSON, no markdown):
{
  "steps": [
    { "name": "Spam Check", "passed": boolean, "detail": "Specific reason for pass/fail" },
    { "name": "Civic Relevance", "passed": boolean, "detail": "Why it is/isn't relevant to government work" },
    { "name": "Duplicate Detection", "passed": boolean, "detail": "Check result" },
    { "name": "Final Assessment", "passed": boolean, "detail": "Summary of authenticity" }
  ],
  "fakeProbability": number,
  "urgencyScore": number,
  "departmentPrediction": "water|road|electricity|sanitation|healthcare",
  "departmentConfidence": number,
  "summary": "A concise 10-word summary of the issue",
  "reason": "Explanatory text for the citizen"
}`;

            const model = this.ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const textResponse = response.text();

            const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);

            // Safety overrides
            let fakeProb = parsed.fakeProbability || 0;
            const steps = parsed.steps || [];

            // If Step 1 or 2 fails, it's a fake/rejected petition
            if (steps[0] && !steps[0].passed) fakeProb = Math.max(fakeProb, 95);
            if (steps[1] && !steps[1].passed) fakeProb = Math.max(fakeProb, 80);

            return {
                fakeProbability: fakeProb,
                urgencyScore: parsed.urgencyScore || 0.1,
                departmentPrediction: parsed.departmentPrediction || userCategory,
                departmentConfidence: parsed.departmentConfidence || 0.8,
                summary: parsed.summary || (description.length > 60 ? description.substring(0, 60) + '...' : description),
                reason: parsed.reason || 'Analysis complete',
                steps: steps
            };

        } catch (error) {
            console.error('\n' + '='.repeat(50));
            console.error('❌ AI ANALYSIS SYSTEM ERROR');
            console.error('Error Type:', error.name || 'Unknown');
            console.error('Message:', error.message);
            if (error.status) console.error('HTTP Status:', error.status);
            console.error('='.repeat(50) + '\n');

            // --- SMARTER FALLBACK FOR TESTING ---
            const text = (title + ' ' + description).toLowerCase();
            
            // 1. Nonsense/Gibberish Detector
            const cleanText = text.replace(/[^a-z]/g, ''); // letters only
            const hasVowels = /[aeiouy]/.test(cleanText);
            const isTooShort = text.length < 15;
            const isGibberish = cleanText.length > 5 && !hasVowels; // No vowels in a long string = Gibberish
            const isRepeating = /(.)\1{4,}/.test(text); // 5+ repeating characters
            
            const isNonsense = isTooShort || isGibberish || isRepeating;
            
            // 2. Personal/Irrelevant Topics
            const personalKeywords = ['movie', 'pizza', 'relationship', 'love', 'dating', 'game', 'படம்', 'பிரியாணி'];
            const isPersonal = personalKeywords.some(kw => text.includes(kw));
            
            // 3. Test/Fake Detection
            const testKeywords = ['test', 'fake', 'trial', 'demo', 'example', 'உதாரணம்', 'சோதனை', 'பொய்'];
            const isTest = testKeywords.some(kw => text.includes(kw));
            
            // 4. Hazard Detection (for urgency)
            const hazardKeywords = ['fire', 'hazard', 'danger', 'wire', 'flood', 'ஆபத்து', 'நெருப்பு', 'வெள்ளம்', 'மின்சாரம்'];
            const isHazard = hazardKeywords.some(kw => text.includes(kw));

            // 5. Department Prediction (Simple keyword matching)
            let predictedDept = userCategory;
            if (text.includes('தண்ணீர்') || text.includes('water')) predictedDept = 'water';
            else if (text.includes('சாலை') || text.includes('road')) predictedDept = 'road';
            else if (text.includes('மின்') || text.includes('light')) predictedDept = 'electricity';
            else if (text.includes('குப்பை') || text.includes('garbage')) predictedDept = 'sanitation';

            const mockFakeProb = isNonsense ? 99 : isTest ? 75 : isPersonal ? 85 : 0;
            const mockUrgency = isHazard ? 0.95 : 0.2;

            return {
                fakeProbability: mockFakeProb,
                urgencyScore: mockUrgency,
                departmentPrediction: predictedDept,
                departmentConfidence: 0.9,
                summary: description.length > 50 ? description.substring(0, 50) + '...' : description,
                reason: `AI Analysis is currently in LOCAL mode (Key Issue: ${error.message}). Basic pattern matching applied.`,
                steps: [
                    { name: "Spam Check", passed: !isNonsense, detail: isNonsense ? "Nonsense/Gibberish detected locally." : "Basic quality check passed." },
                    { name: "Civic Relevance", passed: !isPersonal, detail: isPersonal ? "Topic appears personal or irrelevant to government." : "Relevant keywords detected." },
                    { name: "Authenticity Check", passed: !isTest, detail: isTest ? "Petition flagged as a 'Test' or 'Fake' submission." : "Local pattern check passed." },
                    { name: "Final Assessment", passed: mockFakeProb < 50, detail: "Analyzed via Local Safety Engine." }
                ]
            };
        }
    }
}

export const aiService = new AiService();
