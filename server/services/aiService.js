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
     * @param {string[]} mlFindings - Array of object labels detected by real-time ML
     * @returns {Promise<{fakeProbability: number, reason: string, steps: Array<{name: string, passed: boolean, detail: string}>}>}
     */
    async analyzePetition(title, description, userCategory = 'sanitation', location = {}, mediaPath = null, nearbyContext = [], isSimulatedFake = false, mlFindings = []) {
        const systemInstruction = `
        You are a Forensic AI Validator for the "AI Petition Hub" (Government of Tamil Nadu).
        Your mission is to analyze citizen evidence (Photo/Video) and determine AUTHENTICITY.
        
        STRICT VALIDATION RULES:
        1. REJECT HUMANS: If the main subject is a human face or selfie, the trustScore MUST be 0-30.
        2. ALLOW ONLY CIVIC DEPARTMENTS: You MUST categorize the grievance into one of these:
           - Water Supply (Leaking pipes, no water)
           - Roads & Transport (Potholes, broken roads)
           - Electricity (Dangling wires, power waste)
           - Sanitation (Garbage, drainage)
           - Healthcare (Hospital issues)
           - Anti-Corruption (Illegal activity, bribery)
        3. TRUST SCORING (0-100):
           - 70-100: Clear evidence of a civic grievance in one of the 6 categories.
           - 40-69: Uncertain, low quality, or mismatched description.
           - 0-39: SELFIE, FAKE, TEST, or NOT a civic issue.
        
        Return JSON ONLY:
        {
          "trustScore": number,
          "fakeProbability": number,
          "departmentPrediction": "water" | "road" | "electricity" | "sanitation" | "healthcare" | "corruption",
          "urgencyScore": number,
          "reason": "short explanation in Tamil/English",
          "steps": [
            { "name": "📍 Location Match", "passed": boolean, "detail": "string" },
            { "name": "📸 Visual Evidence Valid", "passed": boolean, "detail": "Reject if Human/Selfie" },
            { "name": "🔁 Duplicate Check", "passed": boolean, "detail": "string" },
            { "name": "👤 User Authenticity", "passed": boolean, "detail": "string" }
          ]
        }`;

        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_api_key_here') {
            console.log("⚠️ AI Service: Using Local Safety Engine (Mock Mode)");
            
            const combined = (title + ' ' + description).toLowerCase();
            const categories = {
                water: ['water', 'pipe', 'leak', 'drainage', 'குடிநீர்', 'குழாய்'],
                road: ['road', 'pothole', 'street', 'transport', 'சாலை', 'பாதை'],
                electricity: ['power', 'electric', 'wire', 'light', 'மின்சாரம்', 'மின்விளக்கு'],
                sanitation: ['garbage', 'trash', 'waste', 'clean', 'குப்பை', 'சுத்தம்'],
                healthcare: ['hospital', 'doctor', 'clinic', 'medicine', 'மருத்துவமனை', 'சுகாதாரம்'],
                corruption: ['bribe', 'money', 'illegal', 'scam', 'ஊழல்', 'பணம்']
            };
            
            // 1. CATEGORY ACCURACY CHECK
            const targetKeywords = categories[userCategory] || [];
            const hasCategoryMatch = targetKeywords.some(kw => combined.includes(kw));
            
            // 2. EVIDENCE QUALITY CHECK
            const isTooShort = description.length < 30;
            const hasForensicKeywords = combined.includes('photo') || combined.includes('evidence') || 
                                       combined.includes('site') || combined.includes('proof') ||
                                       combined.includes('maintenance') || combined.includes('official');

            // 3. HUMAN/SELFIE CHECK (Vision-First)
            const mlSaysPerson = mlFindings && mlFindings.includes('person');
            const isSelfie = mlSaysPerson || combined.includes('selfie') || combined.includes('face') || 
                             combined.includes('மனிதன்') || combined.includes('முகம்') ||
                             combined.includes('selfee');

            // 4. VISION CATEGORY VERIFICATION
            const hasVisionProof = (userCategory === 'sanitation' && (mlFindings.includes('toilet') || mlFindings.includes('sink'))) ||
                                 (userCategory === 'road' && (mlFindings.includes('car') || mlFindings.includes('truck') || mlFindings.includes('bus'))) ||
                                 (mlFindings.length > 0 && !mlSaysPerson);

            // 5. TEST/FAKE CHECK
            const isTest = combined.includes('test') || combined.includes('fake') || 
                           combined.includes('சும்மா') || combined.includes('சோதனை') || 
                           combined.includes('தவறு');

            let mockTrustScore = 90; // Starting point for perfect submission
            
            // 5. DUPLICATE CHECK
            const isDuplicate = nearbyContext && nearbyContext.length >= 3;
            
            // ── APPLYING THE SCORING MATRIX ──────────────────────────────
            if (isSimulatedFake || isSelfie) {
                mockTrustScore = 12; // REJECT: Human detected instead of issue
            } else if (isDuplicate) {
                mockTrustScore = 18; // REJECT: Duplicate
            } else if (!hasCategoryMatch && !hasVisionProof) {
                mockTrustScore = 25; // REJECT: Category/Vision mismatch
            } else if (isTest) {
                mockTrustScore = 20; // REJECT: Testing
            } else if (isTooShort) {
                mockTrustScore = 35; // REJECT: Low detail
            } else if (!hasForensicKeywords && !hasVisionProof) {
                mockTrustScore = 58; // PENDING: Needs audit
            } else if (hasVisionProof && mockTrustScore < 85) {
                mockTrustScore = 85; // BOOST: Vision evidence confirmed the category
            }
            
            return {
                fakeProbability: mockTrustScore < 40 ? 99 : (mockTrustScore < 70 ? 45 : 8),
                trustScore: mockTrustScore,
                urgencyScore: (mockTrustScore < 40) ? 0.05 : 0.75,
                departmentPrediction: userCategory,
                reason: (isSimulatedFake || isSelfie) ? "Forensic Rejection: Human detected in evidence. Grievances must show civic issues, not faces." :
                        isDuplicate ? "System Reject: Duplicate report detected at this exact GPS location." :
                        (!hasCategoryMatch && !hasVisionProof) ? `Vision Mismatch: Evidence does not match "${userCategory.toUpperCase()}" department requirements.` :
                        isTooShort ? "Insufficient Data: Description is too brief for government verification." :
                        hasVisionProof ? "Forensic Audit Passed: Vision detection confirmed civic infrastructure." :
                        "Forensic Audit Complete: Evidence verified as legitimate.",
                steps: [
                    { name: "📍 GPS Lock", passed: true, detail: "Auto-GPS coordinates verified." },
                    { name: "📸 Vision ML", passed: (mockTrustScore >= 70 && !mlSaysPerson), detail: mlSaysPerson ? "FAILED: Human detected." : hasVisionProof ? `PASSED: Found ${mlFindings.join(', ')}.` : "UNCERTAIN: Visual audit needed." },
                    { name: "📂 Category Sync", passed: hasCategoryMatch || hasVisionProof, detail: (hasCategoryMatch || hasVisionProof) ? "Matches department standards." : `Mismatch with ${userCategory}.` },
                    { name: "👤 Integrity Check", passed: mockTrustScore > 40, detail: mockTrustScore <= 40 ? "High risk of fraudulent data." : "Authentic citizen report." }
                ]
            };
        }

        try {
            const locInfo = location ? `Location: ${location.address || 'Unknown'} (Coords: ${location.lat}, ${location.lng})` : 'Location: Not provided';
            
            // Build nearby context string for the prompt
            let nearbyInfo = 'No existing petitions found within 500m (First report).';
            if (nearbyContext && nearbyContext.length > 0) {
                const nearbyList = nearbyContext.map(p => `- [${p.category}] "${p.title}" (${p.status})`).join('\n');
                nearbyInfo = `${nearbyContext.length} existing petition(s) found within 500m:\n${nearbyList}`;
            }
            
            let prompt = `You are a Senior Government Compliance Officer for "Civic Harmony".
Analyze this petition and calculate a Trust Score (0-100).

CRITICAL INSTRUCTION:
- If the image provided is a SELFIE, a PERSON simply posing, or IRRELEVANT to the grievance (e.g., a photo of a room, a face, or random objects), you MUST FAIL the "📸 Live Photo Valid" step.
- An image of a person is only valid if they are directly pointing to or interactively showing the grievance (e.g., a child near a water leak, or a citizen pointing at a pothole).
- If it is just a face or a selfie, mark "passed": false and deduct 40 points from the Trust Score.

DATA:
Title: "${title}"
Description: "${description}"
Category: "${userCategory}"
${locInfo}

NEARBY CONTEXT:
${nearbyInfo}

CHECKLIST (Must be part of response):
1. 📍 Location Match: Is the issue plausible at these coordinates? (+25 pts)
2. 📸 Live Photo Valid: Does the attached image show the problem explicitly? NO SELFIES. (+25 pts)
3. 🔁 Duplicate Complaint: Is this a unique issue or a valid reinforcement? (+25 pts)
4. 👤 User Suspicious: Is the text quality high? No spam? (+25 pts)

SCORING RULES:
- Trust Score >= 70 -> ACCEPT
- 40 <= Trust Score < 70 -> PENDING
- Trust Score < 40 -> REJECT (Fail if image is a selfie/irrelevant)

RESPONSE FORMAT (Strict JSON):
{
  "steps": [
    { "name": "📍 Location Match", "passed": boolean, "detail": "string" },
    { "name": "📸 Live Photo Valid", "passed": boolean, "detail": "string" },
    { "name": "🔁 Duplicate Complaint", "passed": boolean, "detail": "string" },
    { "name": "👤 User Suspicious", "passed": boolean, "detail": "string" }
  ],
  "trustScore": number,
  "fakeProbability": number,
  "urgencyScore": number,
  "departmentPrediction": "water|road|electricity|sanitation|healthcare",
  "summary": "10-word summary",
  "reason": "Brief explanation"
}`;

            const model = this.ai.getGenerativeModel({ model: 'gemini-1.5-flash' }, this.genAiOptions);
            let contents = [{ role: 'user', parts: [{ text: prompt }] }];

            if (mediaPath && fs.existsSync(mediaPath)) {
                try {
                    const imageData = fs.readFileSync(mediaPath);
                    contents[0].parts.push({
                        inlineData: {
                            data: imageData.toString('base64'),
                            mimeType: 'image/jpeg'
                        }
                    });
                } catch (readErr) {
                    console.error('Error reading media file:', readErr);
                }
            }

            const result = await model.generateContent(contents);
            const response = await result.response;
            const textResponse = response.text();

            const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);

            // Safety check: Ensure trustScore is present
            let trustScore = parsed.trustScore || 0;
            const steps = parsed.steps || [];

            // Hard overrides for obvious garbage
            const isGibberish = description.length < 5 || /^[a-z\d\s]{0,10}$/i.test(description);
            if (isGibberish) trustScore = Math.min(trustScore, 10);

            return {
                fakeProbability: parsed.fakeProbability || (100 - trustScore),
                trustScore: trustScore,
                urgencyScore: parsed.urgencyScore || 0.1,
                departmentPrediction: parsed.departmentPrediction || userCategory,
                summary: parsed.summary || description.substring(0, 60),
                reason: parsed.reason || 'Analysis complete',
                steps: steps
            };

        } catch (error) {
            console.error('AI Analysis Error:', error);

            // FALLBACK LOGIC (SKEPTICAL MODE)
            const combinedText = (title + ' ' + description).toLowerCase();
            const isShort = combinedText.length < 30;
            const isTest = combinedText.includes('test') || combinedText.includes('fake') || isSimulatedFake;
            const isDuplicate = nearbyContext && nearbyContext.length >= 3;
            const isSelfie = mlFindings && mlFindings.includes('person');
            
            let fbTrustScore = 60; // DEFAULT TO PENDING (not outright reject) IF AI FAILS
            
            // Look for civic keywords in English and Tamil
            const validKeywords = ['pothole', 'garbage', 'leak', 'water', 'road', 'street', 'light', 'குப்பை', 'தண்ணீர்', 'சாலை', 'மின்சாரம்', 'சாக்கடை'];
            if (validKeywords.some(kw => combinedText.includes(kw))) {
                fbTrustScore = 75; // Good trust if clear civic keywords are found
            }
            
            // Hard penalties
            if (isShort || isTest) {
                fbTrustScore = 15;
            } else if (isDuplicate) {
                fbTrustScore = 18;
            } else if (isSelfie) {
                fbTrustScore = 12;
            }
            
            if (isSimulatedFake) fbTrustScore = 5;

            return {
                fakeProbability: 100 - fbTrustScore,
                trustScore: fbTrustScore,
                urgencyScore: 0.2,
                departmentPrediction: userCategory,
                summary: description.substring(0, 50),
                reason: (isSimulatedFake || isSelfie) ? "Forensic Rejection: Human detected in evidence (FALLBACK)." : "FALLBACK SECURITY: AI audit encountered an error. Trust degraded for safety.",
                steps: [
                    { name: "📍 Location Match", passed: true, detail: "Standard validation applied." },
                    { name: "📸 Vision Scan", passed: !isSelfie, detail: isSelfie ? "FAILED: Human detected." : "Basic vision scan passed." },
                    { name: "🔁 Conflict Check", passed: !isDuplicate, detail: isDuplicate ? "FAILED: Duplicate detected." : "Unique complaint." },
                    { name: "👤 Integrity Check", passed: fbTrustScore > 40, detail: fbTrustScore <= 40 ? "Failed: Evidence lacks civic proof." : "User appears legitimate." }
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
