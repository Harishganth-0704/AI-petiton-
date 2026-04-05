import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { simulateAIAnalysis, DEPARTMENT_LABELS, type AIAnalysis } from '@/lib/mock-data';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Brain, CheckCircle, AlertTriangle, Copy, ShieldAlert, Image as ImageIcon, Video, X, UploadCloud, Mic, Square, Trash2, Wand2, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { apiFetch } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PetitionReceipt } from '@/components/PetitionReceipt';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import EXIF from 'exif-js';

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
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [category, setCategory] = useState('');
  const [step, setStep] = useState<'form' | 'analyzing' | 'result' | 'success'>('form');
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedPetition, setSubmittedPetition] = useState<any>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
    } else {
      suggestedTitle = "Civic Concern - Voice Reported";
      suggestedCategory = "sanitation"; // Default
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
        body: JSON.stringify({ title, description, category })
      });

      if (response) {
        setAnalysis({
          ...response,
          // Ensure these are mapped correctly if the backend uses different property names than mock
          urgencyScore: response.urgencyScore ?? 0.1,
          duplicateProbability: response.duplicateProbability ?? 0.05,
          fakeProbability: (response.fakeProbability ?? 0) / 100, // Frontend expects 0-1 range
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
    try {
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
                        lat={lat} setLat={setLat}
                        lng={lng} setLng={setLng}
                        autoFilled={autoFilled}
                        setAutoFilled={setAutoFilled}
                        t={t}
                      />
                      {/* Standard Media/Audio areas... kept for flexibility */}
                      <MediaArea selectedFile={selectedFile} previewUrl={previewUrl} fileInputRef={fileInputRef} handleFileChange={handleFileChange} removeFile={removeFile} t={t} />

                      <Button type="submit" className="w-full gap-2" disabled={!category || !title || !description}>
                        <Send className="w-4 h-4" /> {t('analyze_preview_btn')}
                      </Button>
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
                <div className="grid sm:grid-cols-2 gap-4">
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
                <div className="border rounded-xl p-4 bg-muted/30 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Wand2 className="w-3.5 h-3.5" /> {t('step_by_step_analysis') || 'Step-by-Step AI Verification'}
                  </h3>
                  <div className="space-y-2">
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

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep('form')}>{t('edit_petition_btn')}</Button>
              <Button
                className={`flex-1 h-12 text-lg font-heading transition-all duration-300 ${analysis.fakeProbability > 0.5 ? 'bg-destructive hover:bg-destructive/90' : 'hover:shadow-lg hover:shadow-primary/20'}`}
                onClick={handleConfirm}
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
                    <span>{t('submitting', 'Submitting...')}</span>
                  </div>
                ) : analysis.fakeProbability > 0.5 ? (
                  <div className="flex items-center gap-2">
                    <X className="w-5 h-5" />
                    {t('rejected_btn') || 'Auto-Rejected'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    {t('confirm_submit_btn')}
                  </div>
                )}
              </Button>
            </div>
          </motion.div>
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
                {t('toast_submit_success', 'Petition Submitted!')}
              </h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {t('toast_submit_success_desc', 'Your petition has been successfully registered and is now being routed to the appropriate department.')}
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
    </div>
  );
}

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
function FormFields({ title, setTitle, category, setCategory, description, setDescription, location, setLocation, lat, setLat, lng, setLng, autoFilled, setAutoFilled, t }: any) {
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
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
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in&limit=1`);
      let data = await res.json();
      
      // Fallback: try without country filter if no results
      if (!data || data.length === 0) {
        const fallRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
        data = await fallRes.json();
      }

      if (data && data.length > 0) {
        const { lat: la, lon: ln, display_name } = data[0];
        const newLat = parseFloat(la);
        const newLng = parseFloat(ln);
        setLat(newLat);
        setLng(newLng);
        setLocation(display_name);
        
        if (mapInstance.current) {
          mapInstance.current.setView([newLat, newLng], 15);
          if (markerRef.current) {
            markerRef.current.setLatLng([newLat, newLng]);
          } else {
            markerRef.current = L.marker([newLat, newLng]).addTo(mapInstance.current);
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
        markerRef.current = L.marker(e.latlng).addTo(map);
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
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center justify-between">
          <span>{t('location_label')} — {t('map_pin_instruction') || 'Click on map to pick exact location'}</span>
          <button 
            type="button" 
            onClick={toggleSatellite} 
            className={`text-[9px] px-2 py-0.5 rounded-full border transition-all ${isSatellite ? 'bg-primary text-white border-primary' : 'bg-muted hover:bg-muted-foreground/10'}`}
          >
            {isSatellite ? '🛰️ Satellite On' : '🗺️ Map View'}
          </button>
        </label>
        <div className="relative group mb-2">
          <div ref={mapRef} className="h-48 w-full rounded-xl border z-0 relative overflow-hidden shadow-inner" />
          <div className="absolute top-2 left-2 right-2 z-[400] flex gap-1">
            <Input 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search area, street or landmark..." 
              className="h-8 text-xs bg-background/90 backdrop-blur-sm shadow-md border-primary/20"
            />
            <Button 
              type="button" 
              size="sm" 
              onClick={handleSearch} 
              disabled={isSearching}
              className="h-8 px-3 shadow-md"
            >
              {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Search'}
            </Button>
          </div>
        </div>
        <Input value={location} onChange={e => setLocation(e.target.value)} placeholder={t('location_placeholder')} className="text-xs" />
        {lat && (
          <div className="flex items-center justify-between mt-1 px-1">
            <p className="text-[10px] text-muted-foreground">
              GPS: {lat.toFixed(6)}, {lng.toFixed(6)}
            </p>
            <Badge variant="outline" className="text-[8px] font-normal leading-none h-4">Verified Pin</Badge>
          </div>
        )}
      </div>
    </div>
  );
}

function MediaArea({ selectedFile, previewUrl, fileInputRef, handleFileChange, removeFile, t }: any) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground block">{t('upload_media_label') || 'Upload Photo or Video'}</label>
      {!previewUrl ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors border-muted-foreground/20"
        >
          <UploadCloud className="w-6 h-6 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground text-center">
            {t('upload_media_placeholder') || 'Click to upload a photo or video'}
          </p>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden border bg-muted/30">
          {selectedFile?.type.startsWith('image/') ? (
            <img src={previewUrl} alt="Preview" className="w-full h-32 object-cover" />
          ) : (
            <div className="w-full h-32 flex items-center justify-center bg-slate-900 text-white gap-2">
              <Video className="w-6 h-6" />
              <span className="text-xs font-medium">{selectedFile?.name}</span>
            </div>
          )}
          <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 w-6 h-6 rounded-full" onClick={removeFile}>
            <X className="w-3 h-3" />
          </Button>
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
