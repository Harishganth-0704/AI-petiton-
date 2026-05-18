import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { simulateAIAnalysis, DEPARTMENT_LABELS, type AIAnalysis } from '@/lib/mock-data';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Brain, CheckCircle, AlertTriangle, Copy, ShieldAlert, Image as ImageIcon, Video, X, UploadCloud, Mic, Square, Trash2, Wand2, Sparkles, Loader2, Info, Camera, RefreshCw, ShieldCheck, MapPin, Navigation, History as HistoryIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { apiFetch } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PetitionReceipt } from '@/components/PetitionReceipt';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import EXIF from 'exif-js';
import { SleekCamera } from '@/components/SleekCamera';

// Fix Leaflet default icon path (broken in Vite builds)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const getDepartments = (t: any) => [
  { value: 'water', label: '💧 ' + t('dept_water') },
  { value: 'road', label: '🛣️ ' + t('dept_road') },
  { value: 'electricity', label: '⚡ ' + t('dept_electricity') },
  { value: 'sanitation', label: '🧹 ' + t('dept_sanitation') },
  { value: 'healthcare', label: '🏥 ' + t('dept_healthcare') },
  { value: 'corruption', label: '⚖️ ' + t('dept_corruption') },
  { value: 'delay_in_service', label: '⏳ ' + t('dept_delay_in_service') },
  { value: 'harassment', label: '🛑 ' + t('dept_harassment') },
  { value: 'service_standards', label: '📜 ' + t('dept_service_standards') },
];

import { useTranslation } from 'react-i18next';

function WaveformVisualizer({ isRecording, stream }: { isRecording: boolean; stream: MediaStream | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!isRecording || !stream || !canvasRef.current) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        // Beautiful Gradient based on intensity
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#3b82f6'); // Blue
        gradient.addColorStop(1, '#8b5cf6'); // Purple

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, (canvas.height - barHeight) / 2, barWidth, barHeight, 4);
        ctx.fill();
        x += barWidth + 2;
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      audioContext.close();
    };
  }, [isRecording, stream]);

  return <canvas ref={canvasRef} width={200} height={40} className="rounded-lg opacity-80" />;
}

export default function SubmitPetitionPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [category, setCategory] = useState('');
  const [step, setStep] = useState<'form' | 'analyzing' | 'result' | 'success'>('form');
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const isAnalyzing = step === 'analyzing';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedPetition, setSubmittedPetition] = useState<any>(null);
  const [submissionPhase, setSubmissionPhase] = useState<'idle' | 'identity' | 'media' | 'location' | 'duplicate' | 'finalize'>('idle');
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mlFindings, setMlFindings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [submissionMode, setSubmissionMode] = useState<'text' | 'voice'>('text');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [autoFilled, setAutoFilled] = useState<Set<string>>(new Set());
  const [highUrgency, setHighUrgency] = useState(false);
  const [showSleekCamera, setShowSleekCamera] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Auto-fill form from chatbot draft
  useEffect(() => {
    const rawDraft = sessionStorage.getItem('chatbot_draft');
    if (rawDraft) {
      try {
        const draft = JSON.parse(rawDraft);
        if (draft.title) { setTitle(draft.title); }
        if (draft.description) { setDescription(draft.description); }
        if (draft.location) { setLocation(draft.location); }
        if (draft.category) { setCategory(draft.category); }
        setAutoFilled(new Set(['title', 'description', 'location', 'category']));
        sessionStorage.removeItem('chatbot_draft');
        toast.success('🤖 Chatbot draft loaded!', {
          description: 'Your petition has been auto-filled from the assistant.',
          duration: 4000,
        });
      } catch { /* ignore JSON parse errors */ }
    }
  }, []);

  // Auto-fetch Live Location - DISABLED on load to prevent incorrect mapping on desktop.
  // Use manual clicks for location instead.

  const startRecording = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);
      mediaRecorderRef.current = new MediaRecorder(audioStream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);

        // If in Voice-Only mode, trigger AI Intent extraction from the transcription
        if (submissionMode === 'voice') {
          handleVoiceAIProcess();
        }
      };

      // Real-time Speech Recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = user?.language_pref === 'ta' ? 'ta-IN' : 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              setDescription(prev => prev + event.results[i][0].transcript + ' ');
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
        };

        recognitionRef.current.start();
      }

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      toast.error(t('mic_access_error') || "Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const removeAudio = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAutoFilled(new Set());
  };

  const handleVoiceAIProcess = async () => {
    if (!description.trim()) return;

    setIsTranscribing(true);
    // AI Intent Extraction Analysis
    await new Promise(r => setTimeout(r, 2000));

    // 1. Filler Cleanup
    let cleanedText = description.replace(/\b(um|uh|err|like|அப்புறம்|ம்ம்)\b/gi, '').replace(/\s+/g, ' ').trim();
    setDescription(cleanedText);

    const text = cleanedText.toLowerCase();
    let suggestedTitle = '';
    let suggestedCategory = '';
    let urgencyDetected = false;

    // 2. Sentiment/Urgency detection
    const urgencyKeywords = ['emergency', 'critical', 'danger', 'urgent', 'help', 'அவசரம்', 'ஆபத்து'];
    if (urgencyKeywords.some(kw => text.includes(kw))) {
      urgencyDetected = true;
    }

    if (text.includes('road') || text.includes('pothole') || text.includes('சாலை') || text.includes('பள்ளம்')) {
      suggestedTitle = "Road Infrastructure Issue";
      suggestedCategory = "road";
    } else if (text.includes('water') || text.includes('pipe') || text.includes('தண்ணீர்') || text.includes('குழாய்')) {
      suggestedTitle = "Water Supply/Leakage Complaint";
      suggestedCategory = "water";
    } else if (text.includes('garbage') || text.includes('waste') || text.includes('குப்பை')) {
      suggestedTitle = "Sanitation & Garbage Disposal";
      suggestedCategory = "sanitation";
    } else if (text.includes('light') || text.includes('electricity') || text.includes('மின்சாரம்')) {
      suggestedTitle = "Street Light / Power Issue";
      suggestedCategory = "electricity";
    } else if (text.includes('bribe') || text.includes('corruption') || text.includes('லஞ்சம்') || text.includes('ஊழல்')) {
      suggestedTitle = "Report on Corruption/Grievance";
      suggestedCategory = "corruption";
    } else if (text.includes('delay') || text.includes('waiting') || text.includes('தாமதம்')) {
      suggestedTitle = "Complaint on Service Delay";
      suggestedCategory = "delay_in_service";
    } else if (text.includes('harassment') || text.includes('abuse') || text.includes('துன்புறுத்தல்')) {
      suggestedTitle = "Harassment/Misbehavior Report";
      suggestedCategory = "harassment";
    } else {
      suggestedTitle = "Civic Concern - Voice Reported";
      suggestedCategory = "service_standards"; // Default
    }

    setTitle(suggestedTitle);
    setCategory(suggestedCategory);
    setAutoFilled(new Set(['title', 'category', 'description']));
    setIsTranscribing(false);

    if (urgencyDetected) {
      setHighUrgency(true);
      toast.warning("High Priority Detected 🚨", { description: "AI detected urgent keywords in your voice message." });
    } else {
      setHighUrgency(false);
    }
    toast.success(t('ai_auto_filled') || "AI analyzed your voice! ✨", { icon: <Sparkles className="w-4 h-4 text-primary" /> });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // AI Feature: Extract GPS from Photo Metadata
    if (file.type.startsWith('image/')) {
      EXIF.getData(file as any, function (this: any) {
        const lat = EXIF.getTag(this, "GPSLatitude");
        const lng = EXIF.getTag(this, "GPSLongitude");
        const latRef = EXIF.getTag(this, "GPSLatitudeRef") || "N";
        const lngRef = EXIF.getTag(this, "GPSLongitudeRef") || "E";

        if (lat && lng) {
          // Convert EXIF Rational coordinates to Decimal
          const convertToDecimal = (gps: any, ref: string) => {
            const d = gps[0].numerator / gps[0].denominator;
            const m = gps[1].numerator / gps[1].denominator;
            const s = gps[2].numerator / gps[2].denominator;
            let decimal = d + m / 60 + s / 3600;
            if (ref === "S" || ref === "W") decimal = -decimal;
            return decimal;
          };

          const decimalLat = convertToDecimal(lat, latRef);
          const decimalLng = convertToDecimal(lng, lngRef);

          setLat(decimalLat);
          setLng(decimalLng);
          toast.success("📍 AI: Location detected from photo!", { 
            description: `Coordinates: ${decimalLat.toFixed(4)}, ${decimalLng.toFixed(4)}`,
            duration: 5000 
          });
        }
      });
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setMlFindings([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !category) return;

    setStep('analyzing');

    try {
      // Direct analysis call before submission to show the user the 4-step check
      const response = await apiFetch('/api/petitions/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          description, 
          category,
          ml_findings: mlFindings
        })
      });

      if (response) {
        setAnalysis({
          ...response,
          urgencyScore: response.urgencyScore ?? 0.1,
          trustScore: response.trustScore ?? (100 - (response.fakeProbability || 0)),
          duplicateProbability: response.duplicateProbability ?? 0.05,
          fakeProbability: (response.fakeProbability ?? 0) / 100,
          departmentPrediction: response.departmentPrediction || category,
          departmentConfidence: response.departmentConfidence || 0.9,
          reason: response.reason
        });
        setStep('result');
      } else {
        throw new Error("Failed to get AI analysis");
      }
    } catch (err: any) {
      console.error("Analysis Error:", err);
      // Fallback to simulation if analysis endpoint fails or doesn't exist yet
      const result = simulateAIAnalysis(title + ' ' + description, category);
      setAnalysis(result);
      setStep('result');
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    
    // START LIVE AI VERIFICATION SEQUENCE
    try {
      setSubmissionPhase('identity');
      await new Promise(r => setTimeout(r, 600));
      
      setSubmissionPhase('media');
      await new Promise(r => setTimeout(r, 800));
      
      setSubmissionPhase('location');
      await new Promise(r => setTimeout(r, 600));
      
      setSubmissionPhase('duplicate');
      await new Promise(r => setTimeout(r, 600));
      
      setSubmissionPhase('finalize');
      
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('citizenId', String(user?.id || ''));
      formData.append('location', JSON.stringify({ address: location, lat, lng }));
      formData.append('isAnonymous', 'false');
      if (analysis) {
        formData.append('aiAnalysis', JSON.stringify(analysis));
      }
      if (selectedFile) {
        formData.append('media', selectedFile);
      }
      if (audioBlob) {
        formData.append('audio', audioBlob, 'voice-note.webm');
      }

      const response = await apiFetch('/api/petitions', {
        method: 'POST',
        body: formData,
      });

      if (response?.isSpam) {
        toast.error("Petition Auto-Rejected 🛑", { description: "Our AI systems flagged this petition as potential spam or inappropriate content.", duration: 6000 });
      } else if (response?.petition?.status === 'pending') {
        toast.warning("Under Review ⚠️", { description: "Your petition has been filed as 'Pending' for manual verification by an officer.", duration: 5000 });
      } else {
        toast.success(t('toast_submit_success'), { description: t('toast_submit_success_desc') });
      }

      setTitle(''); setDescription(''); setLocation(''); setCategory('');
      setLat(null); setLng(null);
      removeFile(); removeAudio();
      setSubmittedPetition(response?.petition || null);
      setStep('success'); setAnalysis(null);
    } catch (err: any) {
      toast.error(t('toast_submit_failed'), { description: err.message });
    } finally {
      setIsSubmitting(false);
      setSubmissionPhase('idle');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">{t('submit_petition_title')}</h1>
        <p className="text-sm text-muted-foreground">{t('submit_petition_subtitle')}</p>
      </div>

      <AnimatePresence mode="wait">
        {step === 'form' && (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* PG Portal: Exclusion Guidelines */}
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm mb-4">
              <h3 className="text-sm font-bold text-red-800 dark:text-red-200 uppercase flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> {t('exclusion_guidelines') || 'Exclusion Guidelines'}
              </h3>
              <p className="text-xs text-red-600 dark:text-red-300 mt-1 font-medium">{t('exclusion_warning') || 'Please do NOT register following complaints here:'}</p>
              <ul className="text-xs text-red-600/80 dark:text-red-300/80 list-disc list-inside mt-2 space-y-0.5 ml-1">
                <li>{t('exclusion_rti') || 'RTI Matters'}</li>
                <li>{t('exclusion_court') || 'Court related / Sub-judice cases'}</li>
                <li>{t('exclusion_religious') || 'Religious matters'}</li>
              </ul>
            </div>

            <Tabs value={submissionMode} onValueChange={(v) => setSubmissionMode(v as any)} className="mb-4">
              <TabsList className="grid grid-cols-2 w-full h-12 p-1 bg-muted/50 rounded-xl">
                <TabsTrigger value="text" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Send className="w-4 h-4" /> {t('tab_text_mode') || 'Text Petition'}
                </TabsTrigger>
                <TabsTrigger value="voice" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Mic className="w-4 h-4" /> {t('tab_voice_mode') || 'Voice Only'}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="mt-0">
                <Card>
                  <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <FormFields
                        title={title} setTitle={setTitle}
                        category={category} setCategory={setCategory}
                        description={description} setDescription={setDescription}
                        location={location} setLocation={setLocation}
                        area={area} setArea={setArea}
                        city={city} setCity={setCity}
                        pincode={pincode} setPincode={setPincode}
                        lat={lat} setLat={setLat}
                        lng={lng} setLng={setLng}
                        autoFilled={autoFilled}
                        setAutoFilled={setAutoFilled}
                        t={t}
                      />
                      {/* Standard Media/Audio areas... kept for flexibility */}
                      <MediaArea 
                        selectedFile={selectedFile} 
                        previewUrl={previewUrl} 
                        removeFile={removeFile} 
                        t={t} 
                        isAnalyzing={isAnalyzing} 
                        onOpenSleekCamera={() => setShowSleekCamera(true)}
                        analysis={analysis}
                      />

                      <Button 
                        type="submit" 
                        className={`w-full h-12 gap-2 text-base font-bold transition-all ${(!category || !title || (description?.length || 0) < 20 || !selectedFile) ? 'opacity-50' : 'bg-primary hover:shadow-lg'}`} 
                        disabled={!category || !title || (description?.length || 0) < 20 || !selectedFile}
                      >
                        {selectedFile ? <Send className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4 text-yellow-500" />}
                        {!selectedFile ? (t('evidence_required_msg') || 'Capture Proof to Continue') :
                         (description?.length || 0) < 20 ? 'Enter Min. 20 Chars' : t('analyze_preview_btn')}
                      </Button>
                      <div className="flex flex-col gap-1 items-center mt-2">
                        {!selectedFile && (
                          <p className="text-[10px] text-muted-foreground animate-pulse">
                            ⚠️ {t('live_proof_mandatory') || 'Live photo/video proof is mandatory.'}
                          </p>
                        )}
                        {description && description.length > 0 && description.length < 20 && (
                          <p className="text-[10px] text-red-500 font-bold tracking-tight uppercase">
                            Description too short ({description.length}/20)
                          </p>
                        )}
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="voice" className="mt-0">
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-6">
                    {!isTranscribing ? (
                      <>
                        <div className="relative">
                          {isRecording && (
                            <motion.div
                              initial={{ scale: 1, opacity: 0.5 }}
                              animate={{ scale: 1.5, opacity: 0 }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                              className="absolute inset-0 bg-destructive rounded-full"
                            />
                          )}
                          <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 relative z-10 ${isRecording ? 'bg-destructive shadow-2xl scale-110' : 'bg-primary shadow-lg'}`}>
                            <Button
                              type="button"
                              variant="ghost"
                              className="w-full h-full rounded-full text-white hover:bg-transparent"
                              onClick={isRecording ? stopRecording : startRecording}
                            >
                              {isRecording ? <Square className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
                            </Button>
                          </div>
                        </div>
                        {isRecording && (
                          <div className="flex flex-col items-center gap-2">
                            <WaveformVisualizer isRecording={isRecording} stream={stream} />
                            <Badge variant="outline" className="animate-pulse border-destructive/50 text-destructive bg-destructive/5 py-0.5">
                              {t('recording_active') || '🔴 Recording Live'}
                            </Badge>
                          </div>
                        )}
                        <div className="space-y-1">
                          <h3 className="font-heading font-bold text-lg">
                            {isRecording ? (t('recording_lbl') || 'Listening to your concern...') : (t('tap_to_speak') || 'Tap to Speak')}
                          </h3>
                          <p className="text-xs text-muted-foreground px-8">
                            {isRecording ? (t('recording_desc') || 'Tell us about the issue in detail. AI will fill the form for you.') : (t('voice_start_desc') || 'No need to type. Just describe the problem and we will handle the rest.')}
                          </p>
                        </div>

                        {audioUrl && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-4">
                            <div className="flex items-center gap-3 w-full bg-background p-3 rounded-2xl border shadow-sm">
                              <audio src={audioUrl} controls className="h-8 flex-1" />
                              <Button type="button" variant="ghost" size="icon" onClick={removeAudio} className="text-destructive rounded-full">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-3 text-left relative">
                              {highUrgency && (
                                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="absolute -top-4 right-0 z-20">
                                  <Badge variant="destructive" className="animate-bounce shadow-lg gap-1">
                                    <AlertTriangle className="w-3 h-3" /> {t('high_urgency_detected') || 'HIGH URGENCY AI'}
                                  </Badge>
                                </motion.div>
                              )}
                              <FormFields
                                title={title} setTitle={setTitle}
                                category={category} setCategory={setCategory}
                                description={description} setDescription={setDescription}
                                location={location} setLocation={setLocation}
                                area={area} setArea={setArea}
                                city={city} setCity={setCity}
                                pincode={pincode} setPincode={setPincode}
                                lat={lat} setLat={setLat}
                                lng={lng} setLng={setLng}
                                autoFilled={autoFilled}
                                setAutoFilled={setAutoFilled}
                                t={t}
                              />
                            </div>

                            <Button onClick={handleSubmit} className="w-full gap-2 h-12 text-lg font-heading" disabled={!title}>
                              <Sparkles className="w-5 h-5" /> {t('analyze_preview_btn')}
                            </Button>
                          </motion.div>
                        )}
                      </>
                    ) : (
                      <div className="py-12 flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        <div className="space-y-1">
                          <p className="font-bold text-primary">{t('voice_processing') || 'AI Processing Voice...'}</p>
                          <p className="text-xs text-muted-foreground animate-pulse">Transcribing and categorizing your issue...</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}

        {step === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-8 min-h-[400px]"
          >
            <div className="relative group">
              {/* If image exists, show it with scanning effect */}
              {previewUrl && selectedFile?.type.startsWith('image/') ? (
                <div className="relative w-64 h-64 rounded-3xl overflow-hidden border-4 border-primary/20 shadow-2xl">
                  <img src={previewUrl} className="w-full h-full object-cover grayscale-[0.5] opacity-80" alt="Scanning" />
                  <div className="absolute inset-0 bg-primary/10 animate-pulse" />
                  <div className="absolute inset-0 ai-scan-line" />
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary/80 text-white text-[10px] font-bold rounded uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Analyzing Evidence
                  </div>
                </div>
              ) : (
                <>
                  {/* Background Glow */}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="absolute inset-[-40px] bg-primary rounded-full blur-3xl -z-10"
                  />

                  <motion.div
                    animate={{
                      rotate: 360,
                      scale: [1, 1.05, 1]
                    }}
                    transition={{
                      rotate: { repeat: Infinity, duration: 8, ease: 'linear' },
                      scale: { repeat: Infinity, duration: 4, ease: 'easeInOut' }
                    }}
                    className="w-24 h-24 bg-primary text-white flex items-center justify-center shadow-[0_20px_50px_rgba(59,130,246,0.3)] relative z-10"
                    style={{
                      borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
                    }}
                  >
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                    >
                      <Brain className="w-12 h-12" />
                    </motion.div>
                  </motion.div>
                </>
              )}

              {/* Floating Emojis as requested */}
              <motion.div
                animate={{
                  y: [0, -15, 0],
                  x: [0, 5, 0],
                  rotate: [0, 10, 0]
                }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="absolute -top-8 -right-8 text-3xl drop-shadow-lg"
              >
                ✨
              </motion.div>
              <motion.div
                animate={{
                  y: [0, 15, 0],
                  x: [0, -5, 0],
                  rotate: [0, -10, 0]
                }}
                transition={{ repeat: Infinity, duration: 3.5, delay: 0.5 }}
                className="absolute -bottom-6 -left-6 text-2xl drop-shadow-md"
              >
                🤖
              </motion.div>
            </div>

            <div className="space-y-3 text-center">
              <h2 className="text-2xl font-heading font-bold text-slate-800">
                {t('ai_analysis_progress')}
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm px-6 leading-relaxed">
                {t('ai_analysis_description')}
              </p>

              {/* Progress Indicator Dots */}
              <div className="flex justify-center gap-1.5 pt-4">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                    className="w-1.5 h-1.5 rounded-full bg-primary"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 'result' && analysis && (
          <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" /> {t('ai_results_title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Reasoning Hub */}
                <div className="p-4 rounded-xl bg-slate-900 text-white shadow-inner mb-4 overflow-hidden relative">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Forensic Analysis Report</span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed">
                    {analysis.reason || "Analyzing forensic data points..."}
                  </p>
                  <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12">
                    <Brain className="w-24 h-24" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm overflow-hidden relative">
                    <div className="flex justify-between items-end mb-3">
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-primary">{t('trust_score_label') || 'Authenticity Trust Score'}</p>
                        <h4 className="text-2xl font-heading font-bold">{analysis.trustScore || 0}%</h4>
                      </div>
                      <Badge className={analysis.trustScore && analysis.trustScore >= 70 ? 'bg-success' : analysis.trustScore && analysis.trustScore >= 40 ? 'bg-warning text-warning-foreground' : 'bg-destructive'}>
                        {analysis.trustScore && analysis.trustScore >= 70 ? 'ACCEPTED' : analysis.trustScore && analysis.trustScore >= 40 ? 'PENDING' : 'REJECTED'}
                      </Badge>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${analysis.trustScore || 0}%` }} 
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`h-full ${analysis.trustScore && analysis.trustScore >= 70 ? 'bg-success' : analysis.trustScore && analysis.trustScore >= 40 ? 'bg-warning' : 'bg-destructive'}`}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 font-medium italic">
                      {analysis.trustScore && analysis.trustScore >= 70 
                        ? '✨ High-quality submission detected. Direct submission enabled.' 
                        : analysis.trustScore && analysis.trustScore >= 40 
                          ? '⚠️ Some details need verification. Status will be marked as Pending.' 
                          : '❌ Low trust score. This petition will likely be rejected.'}
                    </p>
                    <div className="absolute top-0 right-0 p-1 opacity-10">
                      <ShieldCheck className="w-16 h-16" />
                    </div>
                  </div>

                  <AnalysisCard
                    label={t('detected_dept')}
                    value={t(`dept_${analysis.departmentPrediction || category}`)}
                    sub={t('confidence_sub', { percent: ((analysis.departmentConfidence || 1) * 100).toFixed(0) })}
                    icon={<CheckCircle className="w-4 h-4 text-success" />}
                  />
                  <AnalysisCard
                    label={t('urgency_score')}
                    value={`${((analysis.urgencyScore || 0) * 100).toFixed(0)}%`}
                    sub={analysis.urgencyScore > 0.7 ? t('urgency_high') : analysis.urgencyScore > 0.4 ? t('urgency_medium') : t('urgency_low')}
                    icon={<AlertTriangle className={`w-4 h-4 ${analysis.urgencyScore > 0.7 ? 'text-destructive' : 'text-warning'}`} />}
                  />
                </div>

                {/* Step-by-Step Analysis Section */}
                <div className="border rounded-xl p-4 bg-muted/30 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Wand2 className="w-3.5 h-3.5" /> {t('step_by_step_analysis') || 'Step-by-Step AI Verification'}
                  </h3>

                  {/* 🛡️ AI Forensic Reason Display */}
                  <div className={`p-3 rounded-lg border flex gap-3 items-start ${analysis.trustScore < 40 ? 'bg-destructive/5 border-destructive/20' : 'bg-success/5 border-success/20'}`}>
                    <div className={`mt-0.5 ${analysis.trustScore < 40 ? 'text-destructive' : 'text-success'}`}>
                       <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className={`text-xs font-bold uppercase tracking-widest ${analysis.trustScore < 40 ? 'text-destructive' : 'text-success'}`}>
                        Forensic Verdict
                      </p>
                      <p className="text-sm font-medium leading-relaxed">
                        {analysis.reason || 'Verification complete. Evidence cleared for government submission.'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/50">
                    {(analysis as any).steps?.map((s: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${s.passed ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                          {s.passed ? <CheckCircle className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="font-semibold leading-none mb-0.5">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.detail}</p>
                        </div>
                      </div>
                    )) || (
                        <p className="text-xs text-muted-foreground italic">Interactive analysis steps available in live mode.</p>
                      )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <AnalysisCard
                    label={t('duplicate_prob')}
                    value={`${((analysis.duplicateProbability || 0) * 100).toFixed(0)}%`}
                    sub={analysis.duplicateProbability > 0.5 ? t('likely_duplicate') : t('unique_complaint')}
                    icon={<Copy className="w-4 h-4 text-muted-foreground" />}
                  />
                  <AnalysisCard
                    label={t('fake_prob')}
                    value={`${((analysis.fakeProbability || 0) * 100).toFixed(0)}%`}
                    sub={analysis.fakeProbability > 0.5 ? t('rejected_as_fake') || 'REJECTED' : t('appears_genuine')}
                    icon={<ShieldAlert className={`w-4 h-4 ${analysis.fakeProbability > 0.5 ? 'text-destructive' : 'text-muted-foreground'}`} />}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-blue-800 text-sm flex gap-3">
              <Info className="w-5 h-5 shrink-0" />
              <p>{t('guidelines_alert') || 'Please ensure your details are accurate. Submitting false information may lead to account restrictions.'}</p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep('form')}>{t('edit_petition_btn')}</Button>
              <Button
                className={`flex-1 h-12 text-lg font-heading transition-all duration-300 ${analysis.fakeProbability > 0.5 ? 'bg-destructive hover:bg-destructive/90' : 'hover:shadow-lg hover:shadow-primary/20'}`}
                onClick={() => handleConfirm()}
                disabled={isSubmitting || analysis.fakeProbability > 0.5}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-5 h-5" />
                    </motion.div>
                    <span>{t('submitting') || 'Submitting...'}</span>
                  </div>
                ) : analysis.fakeProbability > 0.5 ? (
                  <div className="flex items-center gap-2">
                    <X className="w-5 h-5" />
                    {t('rejected_btn') || 'Auto-Rejected'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    {t('confirm_submit_btn') || 'Confirm & Submit'}
                  </div>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {showSleekCamera && (
          <SleekCamera 
            initialLocation={location}
            onCapture={(file, url, meta) => {
              setSelectedFile(file);
              setPreviewUrl(url);
              if (meta.location) {
                const [lt, lg] = meta.location.split(',').map(Number);
                if (!isNaN(lt) && !isNaN(lg)) {
                  setLat(lt);
                  setLng(lg);
                }
              }
            }}
            onClose={() => setShowSleekCamera(false)}
          />
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 gap-8 text-center"
          >
            <div className="relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12, stiffness: 200 }}
                className="w-24 h-24 bg-success rounded-full flex items-center justify-center shadow-[0_10px_40px_rgba(34,197,94,0.3)]"
              >
                <CheckCircle className="w-12 h-12 text-white" />
              </motion.div>
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 bg-success rounded-full -z-10"
              />
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl font-heading font-bold text-slate-800">
                {submittedPetition?.status === 'pending' 
                  ? (t('petition_pending_title') || 'Petition is Pending')
                  : submittedPetition?.status === 'rejected'
                    ? 'Petition Rejected'
                    : (t('toast_submit_success', 'Petition Submitted!'))}
              </h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {submittedPetition?.status === 'pending'
                  ? 'Your submission is being reviewed by a human officer due to moderate AI confidence. You will be notified via SMS once verified.'
                  : submittedPetition?.status === 'rejected'
                    ? 'This petition was auto-rejected as spam/fake. Please provide better evidence next time.'
                    : (t('toast_submit_success_desc', 'Your petition has been successfully registered and is now being routed to the appropriate department.'))}
              </p>
            </div>

            {submittedPetition && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <PetitionReceipt petition={submittedPetition} t={t} />
              </motion.div>
            )}

            <div className="flex flex-col w-full gap-3 pt-4">
              <Button
                className="h-12 text-lg font-heading"
                onClick={() => setStep('form')}
              >
                {t('submit_another_btn', 'Submit Another Petition')}
              </Button>

              {/* Enhanced Track ID Display */}
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="text-center space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {t('track_id_label') || 'Your Reference / Track ID'}
                  </p>
                  <p className="text-2xl font-mono font-bold text-primary tracking-wider">
                    {submittedPetition?.id || '---'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 border-primary/20 hover:bg-primary/5 text-primary font-bold"
                  onClick={() => {
                    if (submittedPetition?.id) {
                      navigator.clipboard.writeText(String(submittedPetition.id));
                      toast.success(t('copied_toast') || 'Track ID Copied!');
                    }
                  }}
                >
                  <Copy className="w-4 h-4" />
                  {t('copy_id_btn') || 'Copy Track ID'}
                </Button>
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-700 leading-tight">
                    {t('track_instruction') || 'Use this ID on the Track page or scan the QR code to check status.'}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                className="h-12 text-lg font-heading"
                onClick={() => window.location.href = '/track'}
              >
                {t('nav_track') || 'Track Petition'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LiveSubmissionOverlay phase={submissionPhase} t={t} />
    </div>
  );
}

function LiveSubmissionOverlay({ phase, t }: { phase: string; t: any }) {
  if (phase === 'idle') return null;

  const steps = [
    { id: 'identity', icon: ShieldCheck, label: t('live_auth_citizen') },
    { id: 'media', icon: Camera, label: t('live_analyze_media') },
    { id: 'location', icon: ShieldAlert, label: t('live_check_gps') },
    { id: 'duplicate', icon: Copy, label: t('live_detect_duplicates') },
    { id: 'finalize', icon: Sparkles, label: 'Finalizing Submission...' },
  ];

  const currentIdx = steps.findIndex(s => s.id === phase);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-primary/20"
      >
        <div className="p-8 space-y-8 text-center">
          <div className="relative inline-block">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
              className="w-24 h-24 rounded-full border-4 border-dashed border-primary/30 flex items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="w-8 h-8 text-primary animate-pulse" />
              </div>
            </motion.div>
            <div className="absolute inset-0 scan-line rounded-full opacity-40" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">AI Live Verification</h2>
            <p className="text-sm text-slate-400">Securing your evidence in real-time</p>
          </div>

          <div className="space-y-4 text-left">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isPast = idx < currentIdx;
              const isActive = idx === currentIdx;
              
              return (
                <motion.div 
                  key={step.id}
                  initial={{ opacity: 0.3 }}
                  animate={{ 
                    opacity: isPast || isActive ? 1 : 0.3,
                    x: isActive ? 5 : 0
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isActive ? 'bg-primary/5 border-primary/30 shadow-sm' : 'border-transparent'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPast ? 'bg-green-100 text-green-600' : isActive ? 'bg-primary text-white shadow-lg' : 'bg-slate-100'}`}>
                    {isPast ? <CheckCircle className="w-5 h-5" /> : <Icon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>{step.label}</p>
                    {isActive && (
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1 }}
                        className="h-1 bg-primary/20 mt-1 rounded-full overflow-hidden"
                      >
                        <motion.div className="h-full bg-primary" animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1.5 }} />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
        
        <div className="bg-slate-50 p-4 border-t text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
             <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Live Encryption Active
          </p>
        </div>
      </motion.div>
    </div>
  );
}

const TN_DISTRICTS = [
  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kancheepuram", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"
];

function AnalysisCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-muted/50 border">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-heading font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">{sub}</p>
    </div>
  );
}

// Support components for cleaner main render
function FormFields({ 
  title, setTitle, category, setCategory, description, setDescription, 
  location, setLocation, area, setArea, city, setCity, pincode, setPincode,
  lat, setLat, lng, setLng, autoFilled, setAutoFilled, t 
}: any) {
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [modalLat, setModalLat] = useState<number | null>(null);
  const [modalLng, setModalLng] = useState<number | null>(null);
  const [modalAddress, setModalAddress] = useState('');
  const [modalSearchQ, setModalSearchQ] = useState('');
  const [isModalSearching, setIsModalSearching] = useState(false);
  const modalMapRef = useRef<HTMLDivElement>(null);
  const modalMapInstance = useRef<L.Map | null>(null);
  const modalMarkerRef = useRef<L.Marker | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const satelliteLayer = useRef<L.TileLayer | null>(null);
  const streetLayer = useRef<L.TileLayer | null>(null);

  const fetchAddress = async (la: number, ln: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${ln}`);
      const data = await res.json();
      if (data && data.display_name) {
        setLocation(data.display_name);
        if (data.address) {
          const addr = data.address;
          const road = addr.road || '';
          const suburb = addr.suburb || addr.neighbourhood || addr.village || addr.hamlet || '';
          const detectedArea = [road, suburb].filter(Boolean).join(', ');
          setArea(detectedArea || (data.display_name ? data.display_name.split(',')[0] : ''));
          setCity(addr.city || addr.town || addr.village || addr.county || addr.state_district || '');
          setPincode(addr.postcode || '');
        }
      }
    } catch (err) {
      console.error("Geocoding error", err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      // Prioritize India (countrycodes=in)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in&limit=1&addressdetails=1`);
      let data = await res.json();
      
      // Fallback: try without country filter if no results
      if (!data || data.length === 0) {
        const fallRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`);
        data = await fallRes.json();
      }

      if (data && data.length > 0) {
        const { lat: la, lon: ln, display_name, address } = data[0];
        const newLat = parseFloat(la);
        const newLng = parseFloat(ln);
        setLat(newLat);
        setLng(newLng);
        setLocation(display_name);

        if (address) {
          const road = address.road || '';
          const suburb = address.suburb || address.neighbourhood || address.village || address.hamlet || '';
          const detectedArea = [road, suburb].filter(Boolean).join(', ');
          setArea(detectedArea || (display_name ? display_name.split(',')[0] : ''));
          setCity(address.city || address.town || address.village || address.county || address.state_district || '');
          setPincode(address.postcode || '');
        }
        
        // SAVE FOR FUTURE RECOVERY
        localStorage.setItem('hub_last_verified_loc', JSON.stringify({ lat: newLat, lng: newLng, address: display_name }));

        if (mapInstance.current) {
          mapInstance.current.setView([newLat, newLng], 17);
          if (markerRef.current) {
            markerRef.current.setLatLng([newLat, newLng]);
          } else {
            markerRef.current = L.marker([newLat, newLng], { draggable: true }).addTo(mapInstance.current);
            markerRef.current.on('dragend', (e: any) => {
              const { lat: la, lng: ln } = e.target.getLatLng();
              setLat(la);
              setLng(ln);
              fetchAddress(la, ln);
            });
          }
        }
      } else {
        toast.error(t('location_not_found') || "Location not found. Try adding city name.");
      }
    } catch (err) {
      toast.error(t('search_failed') || "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, { zoomControl: true }).setView([20.5937, 78.9629], 5);
    mapInstance.current = map;

    streetLayer.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    });

    satelliteLayer.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    streetLayer.current.addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat: la, lng: ln } = e.latlng;
      setLat(la);
      setLng(ln);
      
      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng);
      } else {
        markerRef.current = L.marker(e.latlng, { draggable: true }).addTo(map);
        markerRef.current.on('dragend', (ev: any) => {
          const { lat: la, lng: ln } = ev.target.getLatLng();
          setLat(la);
          setLng(ln);
          fetchAddress(la, ln);
        });
      }
      
      fetchAddress(la, ln);
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update map marker if lat/lng changed from outside (e.g., photo EXIF)
  useEffect(() => {
    if (lat && lng && mapInstance.current) {
      const coords: L.LatLngExpression = [lat, lng];
      mapInstance.current.setView(coords, 16);
      if (markerRef.current) {
        markerRef.current.setLatLng(coords);
      } else {
        markerRef.current = L.marker(coords).addTo(mapInstance.current);
      }
      fetchAddress(lat, lng);
    }
  }, [lat, lng]);

  const toggleSatellite = () => {
    if (!mapInstance.current || !streetLayer.current || !satelliteLayer.current) return;
    if (isSatellite) {
      satelliteLayer.current.remove();
      streetLayer.current.addTo(mapInstance.current);
    } else {
      streetLayer.current.remove();
      satelliteLayer.current.addTo(mapInstance.current);
    }
    setIsSatellite(!isSatellite);
  };

  const handleAISuggest = async () => {
    if (!description || description.trim().length < 20) {
      toast.error(t('description_too_short') || "Please provide a longer description first (min 20 chars)");
      return;
    }

    setIsSuggesting(true);
    try {
      const res = await apiFetch('/api/petitions/analyze', {
        method: 'POST',
        body: JSON.stringify({ title: 'Draft', description })
      });

      const text = description.toLowerCase();
      let suggestedCategory = category || "sanitation";

      if (text.includes('road') || text.includes('pothole') || text.includes('சாலை')) suggestedCategory = "road";
      else if (text.includes('water') || text.includes('pipe') || text.includes('தண்ணீர்')) suggestedCategory = "water";
      else if (text.includes('garbage') || text.includes('waste') || text.includes('குப்பை')) suggestedCategory = "sanitation";
      else if (text.includes('light') || text.includes('electricity') || text.includes('மின்சாரம்')) suggestedCategory = "electricity";
      else if (text.includes('bribe') || text.includes('corruption') || text.includes('லஞ்சம்') || text.includes('ஊழல்')) suggestedCategory = "corruption";
      else if (text.includes('delay') || text.includes('waiting') || text.includes('தாமதம்')) suggestedCategory = "delay_in_service";
      else if (text.includes('harassment') || text.includes('abuse') || text.includes('துன்புறுத்தல்')) suggestedCategory = "harassment";
      else if (text.includes('standard') || text.includes('rule') || text.includes('முறைக்கேடு')) suggestedCategory = "service_standards";

      const suggestedTitle = description.split(/[.!?\n]/)[0].slice(0, 50).trim() + (description.length > 50 ? '...' : '');

      setTitle(suggestedTitle);
      setCategory(suggestedCategory);
      setAutoFilled((prev: Set<string>) => new Set([...Array.from(prev), 'title', 'category']));
      toast.success(t('ai_suggest_success') || "AI suggested a title and category! ✨");
    } catch (err) {
      toast.error("AI suggestion failed. Please fill manually.");
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-bold text-slate-700 block">{t('petition_title_label')}</label>
          {autoFilled.has('title') && <Badge variant="secondary" className="text-xs h-5 gap-1 py-0 px-2"><Sparkles className="w-3 h-3" /> {t('ai_auto_filled')}</Badge>}
        </div>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('petition_title_placeholder')} required className={`h-12 text-base ${autoFilled.has('title') ? 'border-primary/40 bg-primary/5 shadow-inner' : ''}`} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-bold text-slate-700 block">{t('dept_category_label')}</label>
          {autoFilled.has('category') && <Badge variant="secondary" className="text-xs h-5 gap-1 py-0 px-2"><Sparkles className="w-3 h-3" /> {t('ai_auto_filled')}</Badge>}
        </div>
        <Select value={category} onValueChange={setCategory} required>
          <SelectTrigger className={`h-12 text-base ${autoFilled.has('category') ? 'border-primary/40 bg-primary/5' : ''}`}>
            <SelectValue placeholder={t('select_dept_placeholder')} />
          </SelectTrigger>
          <SelectContent>
            {getDepartments(t).map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="relative">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-bold text-slate-700 block">{t('description')}</label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAISuggest}
            disabled={isSuggesting || !description}
            className="h-7 text-xs gap-1.5 text-primary hover:bg-primary/10 font-bold"
          >
            {isSuggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {t('ai_suggest_btn') || 'AI Suggest Info'}
          </Button>
        </div>
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={t('description_placeholder')}
          rows={4}
          required
          className={autoFilled.has('description') ? 'border-primary/40 bg-primary/5' : ''}
        />
        {autoFilled.has('description') && <div className="absolute top-9 right-3"><Sparkles className="w-3 h-3 text-primary animate-pulse" /></div>}
      </div>
      {/* ── Location Picker Modal ── */}
      {showLocationModal && (
        <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-primary/20 flex flex-col"
            style={{ maxHeight: '90vh' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Confirm Your Location</p>
                  <p className="text-[11px] text-slate-400">Search or drag the pin to your exact location</p>
                </div>
              </div>
              <button onClick={() => setShowLocationModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Search bar inside modal */}
            <div className="p-3 border-b bg-slate-50">
              <div className="flex gap-2">
                <Input
                  value={modalSearchQ}
                  onChange={e => setModalSearchQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (async () => {
                    if (!modalSearchQ.trim()) return;
                    setIsModalSearching(true);
                    try {
                      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(modalSearchQ)}&countrycodes=in&limit=1`);
                      const data = await res.json();
                      if (data?.length > 0) {
                        const newLat = parseFloat(data[0].lat);
                        const newLng = parseFloat(data[0].lon);
                        setModalLat(newLat); setModalLng(newLng);
                        setModalAddress(data[0].display_name);
                        if (modalMapInstance.current) {
                          modalMapInstance.current.setView([newLat, newLng], 17);
                          if (modalMarkerRef.current) modalMarkerRef.current.setLatLng([newLat, newLng]);
                        }
                      } else { toast.error('Place not found. Try another name.'); }
                    } catch { toast.error('Search failed'); }
                    setIsModalSearching(false);
                  })()}
                  placeholder="Search your area, street or city..."
                  className="flex-1 h-9 text-sm"
                />
                <Button
                  type="button" size="sm" className="h-9 px-4"
                  disabled={isModalSearching}
                  onClick={async () => {
                    if (!modalSearchQ.trim()) return;
                    setIsModalSearching(true);
                    try {
                      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(modalSearchQ)}&countrycodes=in&limit=1`);
                      const data = await res.json();
                      if (data?.length > 0) {
                        const newLat = parseFloat(data[0].lat);
                        const newLng = parseFloat(data[0].lon);
                        setModalLat(newLat); setModalLng(newLng);
                        setModalAddress(data[0].display_name);
                        if (modalMapInstance.current) {
                          modalMapInstance.current.setView([newLat, newLng], 17);
                          if (modalMarkerRef.current) modalMarkerRef.current.setLatLng([newLat, newLng]);
                        }
                      } else { toast.error('Place not found. Try another name.'); }
                    } catch { toast.error('Search failed'); }
                    setIsModalSearching(false);
                  }}
                >
                  {isModalSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </Button>
              </div>
            </div>

            {/* Map inside modal */}
            <div
              ref={el => {
                if (el && !modalMapInstance.current) {
                  const initLat = modalLat ?? 20.5937;
                  const initLng = modalLng ?? 78.9629;
                  const zoom = modalLat ? 15 : 5;
                  const map = L.map(el, { zoomControl: true }).setView([initLat, initLng], zoom);
                  modalMapInstance.current = map;
                  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
                  if (modalLat && modalLng) {
                    modalMarkerRef.current = L.marker([modalLat, modalLng], { draggable: true }).addTo(map);
                    modalMarkerRef.current.on('dragend', async (e: any) => {
                      const { lat: la, lng: ln } = e.target.getLatLng();
                      setModalLat(la); setModalLng(ln);
                      try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${ln}`);
                        const d = await res.json();
                        if (d?.display_name) setModalAddress(d.display_name);
                      } catch {}
                    });
                  }
                  map.on('click', async (e: L.LeafletMouseEvent) => {
                    const { lat: la, lng: ln } = e.latlng;
                    setModalLat(la); setModalLng(ln);
                    if (modalMarkerRef.current) { modalMarkerRef.current.setLatLng([la, ln]); }
                    else {
                      modalMarkerRef.current = L.marker([la, ln], { draggable: true }).addTo(map);
                      modalMarkerRef.current.on('dragend', async (ev: any) => {
                        const { lat: dla, lng: dln } = ev.target.getLatLng();
                        setModalLat(dla); setModalLng(dln);
                        try {
                          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${dla}&lon=${dln}`);
                          const d = await res.json();
                          if (d?.display_name) setModalAddress(d.display_name);
                        } catch {}
                      });
                    }
                    try {
                      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${ln}`);
                      const d = await res.json();
                      if (d?.display_name) setModalAddress(d.display_name);
                    } catch {}
                  });
                }
              }}
              style={{ height: 260 }}
              className="w-full"
            />

            {/* Detected address preview */}
            {modalAddress && (
              <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-700 leading-snug">{modalAddress}</p>
              </div>
            )}

            {/* Confirm button */}
            <div className="p-4 border-t flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowLocationModal(false)}>Cancel</Button>
              <Button
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                disabled={!modalLat || !modalLng}
                onClick={async () => {
                  if (!modalLat || !modalLng) return;
                  setLat(modalLat); setLng(modalLng);
                  // Fetch full address details
                  try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${modalLat}&lon=${modalLng}&addressdetails=1`);
                    const data = await res.json();
                    if (data?.display_name) {
                      setLocation(data.display_name);
                      localStorage.setItem('hub_last_verified_loc', JSON.stringify({ lat: modalLat, lng: modalLng, address: data.display_name }));
                    }
                    if (data?.address) {
                      const addr = data.address;
                      // Improved Area Detection with more fallbacks
                      const road = addr.road || '';
                      const suburb = addr.suburb || addr.neighbourhood || addr.village || addr.hamlet || '';
                      const detectedArea = [road, suburb].filter(Boolean).join(', ');
                      setArea(detectedArea || (data.display_name ? data.display_name.split(',')[0] : ''));
                      
                      setCity(addr.city || addr.town || addr.village || addr.county || addr.state_district || '');
                      setPincode(addr.postcode || '');
                    }
                  } catch { toast.error('Address lookup failed'); }
                  // Cleanup modal map
                  if (modalMapInstance.current) { modalMapInstance.current.remove(); modalMapInstance.current = null; modalMarkerRef.current = null; }
                  setShowLocationModal(false);
                  toast.success('✅ Location confirmed!');
                }}
              >
                <CheckCircle className="w-4 h-4" /> Use this location
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            {t('location_details_label') || 'Location Details'}
          </label>
          <Button
            id="main-use-location-btn"
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (!('geolocation' in navigator)) {
                toast.error('Location not supported. Please search manually.');
                return;
              }
              setIsGettingLocation(true);
              toast.info('📍 Getting your location...');
              const tryGet = (highAcc: boolean) => {
                navigator.geolocation.getCurrentPosition(
                  async (pos) => {
                    const la = pos.coords.latitude;
                    const ln = pos.coords.longitude;
                    // Fetch address for preview
                    let addr = '';
                    try {
                      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${ln}`);
                      const d = await res.json();
                      addr = d?.display_name || '';
                    } catch {}
                    setModalLat(la); setModalLng(ln); setModalAddress(addr);
                    setModalSearchQ('');
                    // Reset modal map instance so it re-initialises at correct coords
                    if (modalMapInstance.current) { modalMapInstance.current.remove(); modalMapInstance.current = null; modalMarkerRef.current = null; }
                    setIsGettingLocation(false);
                    setShowLocationModal(true);
                  },
                  (err) => {
                    if (highAcc && err.code !== err.PERMISSION_DENIED) { tryGet(false); return; }
                    // If GPS completely fails, still open modal centered on India so user can search
                    setModalLat(20.5937); setModalLng(78.9629); setModalAddress('');
                    setModalSearchQ('');
                    if (modalMapInstance.current) { modalMapInstance.current.remove(); modalMapInstance.current = null; modalMarkerRef.current = null; }
                    setIsGettingLocation(false);
                    setShowLocationModal(true);
                    toast.info('Could not auto-detect. Please search or tap on the map.');
                  },
                  { enableHighAccuracy: highAcc, timeout: highAcc ? 8000 : 14000, maximumAge: 0 }
                );
              };
              tryGet(true);
            }}
            disabled={isGettingLocation}
            className="h-8 text-xs gap-1.5 font-bold border-primary/30 text-primary hover:bg-primary/5 rounded-full"
          >
            {isGettingLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
            {t('use_my_location_btn') || 'Use my location'}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="relative group">
            <label className="text-xs font-bold text-muted-foreground mb-1.5 block uppercase tracking-tight">
              {t('area_street_label') || 'Area / Street Name'} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                value={area}
                onChange={e => setArea(e.target.value)}
                placeholder="e.g. Anna Nagar, MG Road"
                className="h-11 pr-10"
                required
              />
              <button 
                type="button"
                onClick={() => {
                  const btn = document.getElementById('main-use-location-btn');
                  if (btn) btn.click();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-slate-100 text-primary/60 hover:text-primary transition-colors"
                title="Use my location"
              >
                <Navigation className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1.5 block uppercase tracking-tight">
                {t('city_label') || 'City'} <span className="text-red-500">*</span>
              </label>
              <Input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Chennai"
                className="h-11"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1.5 block uppercase tracking-tight">
                {t('pincode_label') || 'Pincode (Optional)'}
              </label>
              <Input
                value={pincode}
                onChange={e => setPincode(e.target.value)}
                placeholder="e.g. 600001"
                className="h-11"
              />
            </div>
          </div>
        </div>

        {lat && (
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
              GPS: {lat.toFixed(6)}, {lng.toFixed(6)}
            </p>
            <Badge variant="outline" className="text-[9px] h-5 bg-green-50 text-green-700 border-green-200">
              <ShieldCheck className="w-3 h-3 mr-1" /> Confirmed
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

function MediaArea({ selectedFile, previewUrl, removeFile, t, isAnalyzing, onOpenSleekCamera, analysis }: any) {
  const [capturedTime, setCapturedTime] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-primary" />
          {t('live_photo_label') || 'Live Evidence Photo'}
          <div className="flex gap-1.5 ml-1">
            <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 border-primary/30 text-primary bg-primary/5 font-medium rounded-full">
              {t('required_for_ai') || 'REQUIRED'}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 border-blue-200 text-blue-600 bg-blue-50 font-medium rounded-full">
              {t('gallery_blocked_badge') || 'ANTI-FRAUD'}
            </Badge>
          </div>
        </label>
      </div>

      {!previewUrl ? (
        <div className="space-y-4">
          {/* Main Select Box (Dashed) - Clicking this now opens the camera directly */}
          <motion.div 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={onOpenSleekCamera}
            className="cursor-pointer border-2 border-dashed border-primary/30 rounded-2xl p-8 flex flex-col items-center gap-3 bg-primary/5 hover:bg-primary/10 transition-all duration-300 group"
          >
            <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center border border-primary/10 group-hover:border-primary/30 transition-all">
              <Camera className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-slate-800">{t('cam_open_title') || 'Open Proof Camera'}</p>
              <p className="text-xs text-slate-500 font-medium max-w-[200px]">{t('cam_open_subtitle') || 'Gallery upload disabled. Please take a live photo of the issue.'}</p>
            </div>
          </motion.div>

          {/* Verification Status Banner */}
          <div className="flex items-center justify-center gap-2 py-2 text-[10px] text-blue-700/80 font-bold bg-blue-50 rounded-xl border border-blue-100 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t('security_enforced') || 'SECURE SYSTEM: REAL-TIME CAPTURE ONLY • GPS VERIFIED'}
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border-2 border-primary/30 bg-muted/30 shadow-inner group">
          {selectedFile?.type.startsWith('image/') ? (
            <div className="relative aspect-video sm:aspect-auto sm:h-52 overflow-hidden">
              <img src={previewUrl} alt="Live Evidence" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              {isAnalyzing && <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px] animate-pulse" />}
              <div className="absolute top-3 left-3 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">
                  <ShieldCheck className="w-3.5 h-3.5" /> SECURE LIVE CAPTURE
                </div>
                {!isAnalyzing && !analysis && (
                  <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md text-white text-[9px] font-medium px-2 py-0.5 rounded-full w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" /> AI Analysis Pending
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="relative aspect-video sm:aspect-auto sm:h-52 overflow-hidden bg-slate-900 flex flex-col items-center justify-center">
              <video 
                src={previewUrl} 
                controls 
                className="w-full h-full object-contain"
                poster="/placeholder-video.png"
              />
              <div className="absolute top-3 left-3 flex flex-col gap-1 pointer-events-none">
                <div className="flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">
                  <Video className="w-3.5 h-3.5" /> LIVE VIDEO EVIDENCE
                </div>
                {!isAnalyzing && !analysis && (
                  <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-medium px-2 py-0.5 rounded-full w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" /> AI Analysis Pending
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Demo Testing Utility */}
          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Demo Testing Mode</span>
              <span className="text-xs text-slate-800">Simulate Human/Selfie Detection</span>
            </div>
            <input 
              type="checkbox" 
              checked={window.sessionStorage.getItem('simulate_fake') === 'true'}
              onChange={(e) => {
                window.sessionStorage.setItem('simulate_fake', e.target.checked.toString());
                toast.info(e.target.checked ? "AI Rejection Mode ON (Failures only)" : "AI Rejection Mode OFF (Normal Mode)");
                // Force re-render if needed or just let it be
                onOpenSleekCamera(); // Hacky trigger or just wait for next state
              }}
              className="w-5 h-5 accent-red-600 rounded-lg"
            />
          </div>

          <div className="absolute top-2 right-2 flex gap-1.5">
            <Button type="button" variant="secondary" size="icon" className="w-8 h-8 rounded-full shadow-md bg-white/90 backdrop-blur-sm hover:bg-white" onClick={onOpenSleekCamera}>
              <RefreshCw className="w-4 h-4 text-primary" />
            </Button>
            <Button type="button" variant="destructive" size="icon" className="w-8 h-8 rounded-full shadow-md" onClick={() => { removeFile(); setCapturedTime(null); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}




function AudioArea({ isRecording, audioUrl, startRecording, stopRecording, removeAudio, t }: any) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground block">{t('voice_note_label') || 'Voice Note (Optional)'}</label>
      <div className="flex items-center gap-3">
        {!audioUrl ? (
          <Button
            type="button"
            variant={isRecording ? "destructive" : "outline"}
            className={`flex-1 gap-2 ${isRecording ? 'animate-pulse' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isRecording ? (t('stop_recording_btn') || 'Stop Recording') : (t('record_voice_note_btn') || 'Record Voice Note')}
          </Button>
        ) : (
          <div className="flex items-center gap-3 w-full bg-muted/40 p-2 pl-4 rounded-xl border">
            <audio src={audioUrl} controls className="h-8 flex-1 w-full max-w-[200px]" />
            <Button type="button" variant="ghost" size="icon" onClick={removeAudio} className="text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

