import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
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
            // In some environments, v1beta is required for specific models
            this.genAiOptions = { apiVersion: 'v1beta' }; 
            console.log('AI Service Check: ✅ Ready for Petition Analysis');
        } else {
            console.log('AI Service Check: ⚠️ Missing GEMINI_API_KEY (Running in mock mode)');
        }
    }

    /**
     * Analyze a petition using a multi-stage process to ensure quality and authenticity.
     * Steps: 1. Spam Check, 2. Civic Relevance, 3. Duplicate/Pattern Check, 4. Final Scoring, 5. Visual Proof (if image provided).
     * @param {string} title 
     * @param {string} description 
     * @param {string} userCategory
     * @param {object} location { lat, lng, address }
     * @param {string} mediaPath
     * @returns {Promise<{fakeProbability: number, reason: string, steps: Array<{name: string, passed: boolean, detail: string}>}>}
     */
    async analyzePetition(title, description, userCategory = 'sanitation', location = {}, mediaPath = null) {
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
            const locInfo = location ? `Location: ${location.address || 'Unknown'} (Coords: ${location.lat}, ${location.lng})` : 'Location: Not provided';
            
            let prompt = `You are a Senior Government Compliance Officer for "Civic Harmony", a platform for public grievances.
Analyze the following petition with 100% accuracy.

DATA TO ANALYZE:
Title: "${title}"
Description: "${description}"
User-Selected Category: "${userCategory}"
${locInfo}

STRICT 5-STAGE VERIFICATION PROTOCOL:

Stage 1: Spam & Quality Check
- Is it gibberish, just random letters (e.g. "asdf"), or non-grievance text (e.g. "I love pizza")?
- PASSED only if it's a coherent petition.

Stage 2: Civic Relevance & Location Check
- Does this fall under GOVERNMENT/CIVIC responsibility?
- VALID: Potholes, street lights, water leaks, garbage, drainage, public parks, electricity.
- LOCATION: Is the reported issue plausible at the given location?

Stage 3: Authenticity & Pattern Check
- Look for signs of "copy-paste" spam, bots, or intentional "Fake/Test" submissions.

Stage 4: Visual Proof Check (If image provided)
- IF an image is attached: Does the image show the problem described? (e.g. If text says "garbage", does the image show garbage?).
- Flag as "Inconsistent" if the image is irrelevant or doesn't match the text.

Stage 5: Final Metrics & Routing
- Calculate Fake Probability (0-100). Any "nonsense", "test", or "image mismatch" reduces authenticity score significantly.
- Calculate Urgency Score (0.0 to 1.0).
- Identify the best Department: water, road, electricity, sanitation, or healthcare.

RESPONSE FORMAT (Strict JSON, no markdown):
{
  "steps": [
    { "name": "Spam Check", "passed": boolean, "detail": "Reason" },
    { "name": "Civic Relevance", "passed": boolean, "detail": "Reason" },
    { "name": "Authenticity Check", "passed": boolean, "detail": "Reason" },
    { "name": "Visual Proof", "passed": boolean, "detail": "Does the image match the text? (N/A if no image)" },
    { "name": "Final Assessment", "passed": boolean, "detail": "Summary" }
  ],
  "fakeProbability": number,
  "urgencyScore": number,
  "departmentPrediction": "water|road|electricity|sanitation|healthcare",
  "departmentConfidence": number,
  "summary": "A concise 10-word summary",
  "reason": "Explanatory text for the citizen"
}`;

            const model = this.ai.getGenerativeModel({ model: 'gemini-1.5-flash' }, this.genAiOptions);
            
            let contents = [{ role: 'user', parts: [{ text: prompt }] }];

            // Add image to contents if mediaPath exists
            if (mediaPath && fs.existsSync(mediaPath)) {
                try {
                    const imageData = fs.readFileSync(mediaPath);
                    contents[0].parts.push({
                        inlineData: {
                            data: imageData.toString('base64'),
                            mimeType: 'image/jpeg' // Supporting common image formats
                        }
                    });
                } catch (readErr) {
                    console.error('Error reading media file for AI analysis:', readErr);
                }
            }

            const result = await model.generateContent(contents);
            const response = await result.response;
            const textResponse = response.text();

            const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);

            // Safety overrides
            let fakeProb = parsed.fakeProbability || 0;
            const steps = parsed.steps || [];

            // If Step 1, 2, or 4 fails, it's a high probability of fake/invalid
            if (steps[0] && !steps[0].passed) fakeProb = Math.max(fakeProb, 95);
            if (steps[1] && !steps[1].passed) fakeProb = Math.max(fakeProb, 80);
            if (steps[3] && !steps[3].passed && steps[3].detail !== 'N/A') fakeProb = Math.max(fakeProb, 75);

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
            console.error('Error Details:', error);
            console.error('='.repeat(50) + '\n');

            // --- SMARTER FALLBACK FOR TESTING ---
            const combinedText = (title + ' ' + description + ' ' + (location?.address || '')).toLowerCase();
            
            // 1. Nonsense/Gibberish Detector (Improved for Tamil/Unicode)
            const latinOnly = combinedText.replace(/[^a-z]/g, '');
            const hasVowels = /[aeiouy]/.test(latinOnly);
            const isTooShort = combinedText.trim().length < 10;
            
            // Tamil character range check
            const hasTamil = /[\u0B80-\u0BFF]/.test(combinedText);
            
            // Gibberish: No vowels in latin part AND no Tamil characters AND length > 5
            const isGibberish = (latinOnly.length > 5 && !hasVowels && !hasTamil); 
            const isRepeating = /(.)\1{4,}/.test(combinedText); // 5+ repeating characters
            
            const isNonsense = isTooShort || isGibberish || isRepeating;
            
            // 2. Personal/Irrelevant Topics
            const personalKeywords = ['movie', 'pizza', 'relationship', 'love', 'dating', 'game', 'படம்', 'பிரியாணி', 'friend', 'நண்பன்'];
            const isPersonal = personalKeywords.some(kw => combinedText.includes(kw.toLowerCase()));
            
            // 3. Test/Fake Detection (Expanded)
            const testKeywords = [
                'test', 'fake', 'trial', 'demo', 'example', 'dummy', 'testing',
                'உதாரணம்', 'சோதனை', 'பொய்', 'சும்மா', 'டமி', 'செக்'
            ];
            const isTest = testKeywords.some(kw => combinedText.includes(kw.toLowerCase()));
            
            // 5. Complexity & Repetition Check
            const titleNorm = title.toLowerCase().trim();
            const descNorm = description.toLowerCase().trim();
            const isTooSimilar = titleNorm.length > 5 && (descNorm.includes(titleNorm) || titleNorm.includes(descNorm)) && Math.abs(titleNorm.length - descNorm.length) < 10;
            const isVeryShort = titleNorm.length < 5 || descNorm.length < 10;

            // 6. Urgency/Hazard Detection (Detailed)
            const highUrgencyKeywords = [
                'fire', 'hazard', 'danger', 'wire', 'flood', 'accident', 'critical', 'emergency', 'death', 'injury', 'hospital', 'gas leak', 'collapse',
                'ஆபத்து', 'நெருப்பு', 'வெள்ளம்', 'மின்சாரம்', 'பாம்பு', 'விபத்து', 'தீவிரம்', 'அவசரம்', 'மரணம்', 'காயம்', 'வாயு கசிவு'
            ];
            const mediumUrgencyKeywords = [
                'leak', 'burst', 'road block', 'overflow', 'outage', 'broken', 'damage', 'sewage',
                'கசிவு', 'தடை', 'உடைப்பு', 'சேதம்', 'சாக்கடை'
            ];

            const isHighUrgency = highUrgencyKeywords.some(kw => combinedText.includes(kw.toLowerCase()));
            const isMediumUrgency = mediumUrgencyKeywords.some(kw => combinedText.includes(kw.toLowerCase()));

            // 6. Department Prediction
            let predictedDept = userCategory;
            if (combinedText.includes('தண்ணீர்') || combinedText.includes('water') || combinedText.includes('leak')) predictedDept = 'water';
            else if (combinedText.includes('சாலை') || combinedText.includes('road') || combinedText.includes('pothole')) predictedDept = 'road';
            else if (combinedText.includes('மின்') || combinedText.includes('light') || combinedText.includes('current')) predictedDept = 'electricity';
            else if (combinedText.includes('குப்பை') || combinedText.includes('garbage') || combinedText.includes('waste')) predictedDept = 'sanitation';

            const mockFakeProb = isNonsense ? 99 : isTest ? 85 : isPersonal ? 80 : (isTooSimilar || isVeryShort) ? 65 : 0;
            const mockUrgency = isHighUrgency ? 0.95 : isMediumUrgency ? 0.65 : (isNonsense || isVeryShort ? 0.05 : 0.25);

            return {
                fakeProbability: mockFakeProb,
                urgencyScore: mockUrgency,
                departmentPrediction: predictedDept,
                departmentConfidence: 0.9,
                summary: description.length > 50 ? description.substring(0, 50) + '...' : description,
                reason: `AI Analysis is currently in LOCAL mode. Basic pattern matching applied. ${isTest ? 'Flagged as test.' : ''}`,
                steps: [
                    { name: "Spam Check", passed: !isNonsense && !isVeryShort, detail: isNonsense ? "Nonsense/Gibberish detected locally." : isVeryShort ? "Petition is too short to be valid." : "Basic quality check passed." },
                    { name: "Civic Relevance", passed: !isPersonal, detail: isPersonal ? "Topic appears personal or irrelevant to government." : "Relevant keywords detected." },
                    { name: "Authenticity Check", passed: !isTest && !isTooSimilar, detail: isTest ? "Petition flagged as a 'Test' submission." : isTooSimilar ? "Title and description are too similar (low effort)." : "Local pattern check passed." },
                    { name: "Final Assessment", passed: mockFakeProb < 50, detail: "Analyzed via Local Safety Engine." }
                ]
            };
        }
    }
    /**
     * Generates a formal official response for an officer to send back to a citizen.
     */
    async generateOfficialReply(petitionData) {
        if (this.isFallback) return `Thank you for bringing the issue regarding "${petitionData.title}" to our attention. Our team has reviewed your complaint, and we have initiated the necessary repairs. We expect the issue to be resolved shortly. We appreciate your patience as we work to improve the community.`;

        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `You are a professional government officer responding to a citizen petition.
            Petition Title: ${petitionData.title}
            Description: ${petitionData.description}
            Category: ${petitionData.category}
            Current AI Analysis: ${petitionData.officer_remark}

            Task: Generate a formal, polite, and reassuring official response (maximum 100 words). 
            - Acknowledge the problem.
            - Briefly mention that action is being taken.
            - Thank the citizen for their civic engagement.
            - Ensure the tone is helpful and professional.
            
            Return ONLY the plain text of the response.`;

            const result = await model.generateContent(prompt);
            return result.response.text().trim();
        } catch (error) {
            console.error('Error generating official reply:', error);
            return "Thank you for your petition. We have analyzed your concern and our department is currently working on a resolution. We appreciate your contribution to civic hygiene.";
        }
    }
}

export const aiService = new AiService();
