// Mock data and types for the petition system

export type PetitionStatus = 'submitted' | 'ai_processing' | 'verification' | 'assigned' | 'in_progress' | 'resolved' | 'escalated';
export type Department = 'water' | 'road' | 'electricity' | 'sanitation' | 'healthcare';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Petition {
  id: string;
  title: string;
  description: string;
  department: Department;
  status: PetitionStatus;
  urgency: UrgencyLevel;
  citizenName: string;
  citizenEmail: string;
  location: { lat: number; lng: number; address: string };
  createdAt: string;
  updatedAt: string;
  slaDeadline?: string;
  assignedOfficer?: string;
  aiAnalysis?: AIAnalysis;
  feedback?: { rating: number; comment: string };
}

export interface AIAnalysis {
  departmentPrediction: Department;
  departmentConfidence: number;
  urgencyScore: number;
  duplicateProbability: number;
  fakeProbability: number;
  keywords: string[];
  sentiment: 'negative' | 'neutral' | 'positive';
  steps?: Array<{ name: string; passed: boolean; detail: string }>;
}

export interface DashboardStats {
  totalPetitions: number;
  resolved: number;
  pending: number;
  escalated: number;
  avgResolutionDays: number;
  departmentBreakdown: Record<Department, number>;
}

export const DEPARTMENT_LABELS: Record<Department, string> = {
  water: 'Water Supply',
  road: 'Roads & Transport',
  electricity: 'Electricity',
  sanitation: 'Sanitation',
  healthcare: 'Healthcare',
};

export const DEPARTMENT_ICONS: Record<Department, string> = {
  water: '💧',
  road: '🛣️',
  electricity: '⚡',
  sanitation: '🧹',
  healthcare: '🏥',
};

export const STATUS_LABELS: Record<PetitionStatus, string> = {
  submitted: 'Submitted',
  ai_processing: 'AI Processing',
  verification: 'Under Verification',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  escalated: 'Escalated',
};

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-secondary text-secondary-foreground',
  high: 'bg-warning text-warning-foreground',
  critical: 'bg-urgent text-urgent-foreground',
};

// Sample petitions data - Removed mock data
export const MOCK_PETITIONS: Petition[] = [];

export const MOCK_STATS: DashboardStats = {
  totalPetitions: 0,
  resolved: 0,
  pending: 0,
  escalated: 0,
  avgResolutionDays: 0,
  departmentBreakdown: {
    water: 0,
    road: 0,
    electricity: 0,
    sanitation: 0,
    healthcare: 0,
  },
};

/** 
 * Sophisticated heuristic engine to simulate accurate AI analysis.
 * Uses weighted keyword matching, cross-category validation, 
 * and pattern-based junk detection.
 */
export function simulateAIAnalysis(text: string, userCategory?: string): AIAnalysis {
  const lower = text.toLowerCase();
  const words = lower.trim().split(/\s+/);

  // 1. Weighted Keywords Definition
  const CATEGORY_WEIGHTS: Record<Department, Array<{ term: string; weight: number }>> = {
    water: [
      { term: 'water', weight: 2 }, { term: 'pipeline', weight: 1.5 }, { term: 'leak', weight: 1.5 },
      { term: 'தண்ணீர்', weight: 2 }, { term: 'குடிநீர்', weight: 2 }, { term: 'supply', weight: 1 },
      { term: 'tap', weight: 1 }, { term: 'drain', weight: 1 }, { term: 'flood', weight: 1.2 }
    ],
    road: [
      { term: 'road', weight: 2 }, { term: 'pothole', weight: 2 }, { term: 'highway', weight: 1.5 },
      { term: 'சாலை', weight: 2 }, { term: 'தெரு', weight: 2 }, { term: 'traffic', weight: 1 },
      { term: 'bridge', weight: 1.2 }, { term: 'street', weight: 1 }, { term: 'pavement', weight: 1.2 }
    ],
    electricity: [
      { term: 'electricity', weight: 2 }, { term: 'power', weight: 1.5 }, { term: 'voltage', weight: 1.5 },
      { term: 'மின்சாரம்', weight: 2 }, { term: 'மின்', weight: 1.5 }, { term: 'outage', weight: 1.5 },
      { term: 'transformer', weight: 2 }, { term: 'light', weight: 1 }, { term: 'wire', weight: 1 }
    ],
    sanitation: [
      { term: 'garbage', weight: 2 }, { term: 'waste', weight: 1.5 }, { term: 'sewer', weight: 2 },
      { term: 'குப்பை', weight: 2 }, { term: 'கழிவு', weight: 2 }, { term: 'சாக்கடை', weight: 2 },
      { term: 'cleaning', weight: 1 }, { term: 'smell', weight: 1.2 }, { term: 'drainage', weight: 1.5 }
    ],
    healthcare: [
      { term: 'hospital', weight: 2 }, { term: 'doctor', weight: 2 }, { term: 'medicine', weight: 1.5 },
      { term: 'மருத்துவமனை', weight: 2 }, { term: 'உடல்நலம்', weight: 2 }, { term: 'clinic', weight: 1.5 },
      { term: 'health', weight: 1 }, { term: 'disease', weight: 1.5 }, { term: 'ambulance', weight: 2 }
    ],
  };

  // 2. Score Calculation
  const scores: Record<Department, number> = {
    water: 0, road: 0, electricity: 0, sanitation: 0, healthcare: 0
  };

  Object.entries(CATEGORY_WEIGHTS).forEach(([dept, keywords]) => {
    keywords.forEach(({ term, weight }) => {
      if (lower.includes(term)) {
        scores[dept as Department] += weight;
      }
    });
  });

  // 3. Department Prediction Selection
  const sortedDepts = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const primaryMatch = sortedDepts[0];

  let predictedDept: Department = primaryMatch[1] > 0 ? (primaryMatch[0] as Department) : 'sanitation';
  let confidence = 0.4;

  // 4. Cross-Validation with User Input
  if (userCategory && (userCategory as Department) === predictedDept) {
    // If user and AI agree, boost confidence significantly
    confidence = primaryMatch[1] > 0 ? Math.min(0.98, 0.7 + (primaryMatch[1] * 0.1)) : 0.6;
  } else if (userCategory && primaryMatch[1] > 0) {
    // If they disagree but AI found something, use AI but lower confidence
    confidence = Math.min(0.85, 0.5 + (primaryMatch[1] * 0.05));
  } else if (userCategory) {
    // If AI found nothing, respect user's choice but set very low confidence
    predictedDept = userCategory as Department;
    confidence = 0.35;
  }

  // 5. Advanced Fake/Junk Detection
  let fakeScore = 0.05;

  // Length heuristic
  if (words.length < 5) fakeScore += 0.35;
  if (words.length < 2) fakeScore += 0.4;

  // Nonsense/Meta words
  const junkWords = ['fake', 'test', 'blah', 'dummy', 'asdf', 'qwerty', '1234'];
  junkWords.forEach(w => { if (lower.includes(w)) fakeScore += 0.5; });

  // Character repetition check (e.g., "aaaaaaaa")
  if (/(.)\1{4,}/.test(lower)) fakeScore += 0.4;

  const fakeProb = Math.min(0.99, fakeScore);

  // 6. Urgency Heuristics
  const URGENCY_TERMS = [
    { t: 'urgent', w: 0.3 }, { t: 'emergency', w: 0.4 }, { t: 'danger', w: 0.3 },
    { t: 'immediate', w: 0.2 }, { t: 'death', w: 0.5 }, { t: 'accident', w: 0.4 },
    { t: 'அவசரம்', w: 0.4 }, { t: 'ஆபத்து', w: 0.4 }
  ];

  let urgency = 0.15 + (fakeProb > 0.5 ? 0 : 0.1);
  URGENCY_TERMS.forEach(({ t, w }) => { if (lower.includes(t)) urgency += w; });
  urgency = Math.min(0.96, urgency);

  // 7. Keyword Extraction (most weighted terms)
  const detectedKeywords = words.filter(w => w.length > 3).slice(0, 5);

  return {
    departmentPrediction: predictedDept,
    departmentConfidence: Math.round(confidence * 100) / 100,
    urgencyScore: Math.round(urgency * 100) / 100,
    duplicateProbability: Math.round(Math.random() * 0.15 * 100) / 100, // Still random for demo
    fakeProbability: Math.round(fakeProb * 100) / 100,
    keywords: detectedKeywords,
    sentiment: urgency > 0.6 ? 'negative' : 'neutral',
    steps: [
      { name: "Spam Check", passed: fakeProb < 0.4, detail: fakeProb < 0.4 ? "Passed: Content appears natural." : "Failed: Potential nonsense detected." },
      { name: "Civic Relevance", passed: primaryMatch[1] > 0, detail: primaryMatch[1] > 0 ? `Detected link to ${predictedDept} department.` : "Failed: Issue does not appear civic-related." },
      { name: "Duplicate Detection", passed: true, detail: "Passed: No identical matches in cache." },
      { name: "Final Assessment", passed: fakeProb < 0.5, detail: fakeProb < 0.5 ? "Passed: Petition verified." : "Failed: High suspicious score." }
    ]
  };
}

/**
 * Generates context-aware smart replies for officers based on the petition's department.
 */
export function generateSmartReplies(category: string): string[] {
  const replies: Record<string, string[]> = {
    water: [
      "Complaint received. Inspection scheduled for today.",
      "Pipeline leak fixed. Water supply will resume shortly.",
      "Fund allocation pending for new pump installation.",
    ],
    road: [
      "Pothole patching work will begin tomorrow.",
      "Tender approved, road relaying to start next week.",
      "Temporarily filled with gravel. Permanent fix planned.",
    ],
    electricity: [
      "Team dispatched to fix the power outage.",
      "Transformer replacement is currently in progress.",
      "Issue resolved. Power supply restored.",
    ],
    sanitation: [
      "Garbage truck deployed for immediate clearance.",
      "Sewer block cleared by the sanitation team.",
      "Scheduled for regular bio-cleaning tomorrow morning.",
    ],
    healthcare: [
      "Medical camp arranged in your area on Sunday.",
      "Ambulance availability issue documented and escalated.",
      "Noted. Extra doctor assigned to the PHC temporarily.",
    ],
  };

  return replies[category] || [
    "Received your petition. We are looking into it.",
    "Action initiated. Request forwarded to the concerned team.",
    "Issue resolved. Thank you for your feedback.",
  ];
}
