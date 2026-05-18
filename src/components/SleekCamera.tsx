import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, X, ShieldCheck, MapPin, Clock, AlertTriangle, Camera, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

interface SleekCameraProps {
  onCapture: (file: File, previewUrl: string, metadata: { timestamp: string; location?: string; ml_findings?: string[] }) => void;
  onClose: () => void;
  initialLocation?: string | null;
}

export function SleekCamera({ onCapture, onClose, initialLocation }: SleekCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Ref holds the latest stream — cleanup functions never see a stale value
  const streamRef = useRef<MediaStream | null>(null);

  const [hasStream, setHasStream] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isCapturing, setIsCapturing] = useState(false);
  const [location, setLocation] = useState<string | null>(initialLocation || null);
  const [timestamp, setTimestamp] = useState<string>('');
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [coords, setCoords] = useState<string | null>(null);
  const [detections, setDetections] = useState<cocoSsd.DetectedObject[]>([]);
  const [isFaceBlocked, setIsFaceBlocked] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const mlModelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const isModelLoadingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDetectionRef = useRef<number>(0);

  /** Stop whatever camera is currently running */
  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  /**
   * Try progressively relaxed constraints so we never crash on desktop
   * (which may not have an "environment"-facing camera).
   */
  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    stopCurrentStream();
    setHasStream(false);
    setCameraError(null);

    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
      { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: true, audio: false },
    ];

    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasStream(true);
        return; // success
      } catch (err: any) {
        console.warn('Camera attempt failed:', err.name, constraints);
      }
    }

    // Every attempt failed (permission denied or no camera device)
    setCameraError(
      'Camera access was denied or no camera was found.\n\n' +
      'To fix this:\n' +
      '1. Click the camera icon in your browser address bar.\n' +
      '2. Allow camera access for this site.\n' +
      '3. Tap "Retry" below.'
    );
  }, [stopCurrentStream]);

  useEffect(() => {
    startCamera(facingMode);

    // Initialize ML Model (Once only)
    const loadModel = async () => {
      if (mlModelRef.current || isModelLoadingRef.current) return;
      isModelLoadingRef.current = true;
      try {
        await tf.ready();
        const model = await cocoSsd.load();
        mlModelRef.current = model;
        setIsModelReady(true);
        console.log("✅ ML Forensic Model Loaded");
      } catch (err) {
        console.error("❌ Failed to load ML model:", err);
      } finally {
        isModelLoadingRef.current = false;
      }
    };
    loadModel();

    // High-Precision Real-time GPS tracking
    let watchId: number | null = null;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        pos => {
          const { latitude, longitude, accuracy } = pos.coords;
          setCoords(`${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${Math.round(accuracy)}m)`);
          
          // Reverse geocode to get a readable address if we don't have one
          if (!initialLocation) {
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
              .then(res => res.json())
              .then(data => {
                if (data && data.display_name) {
                  setLocation(data.display_name);
                }
              })
              .catch(() => setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`));
          }
        },
        err => {
          console.warn('GPS Error:', err);
          if (err.code === 1) toast.error("Please enable GPS for forensic verification.");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
    
    // Set up the drawing loop for baked-in watermarks (refreshes at 30+ fps)
    const drawLoop = async () => {
      if (videoRef.current && canvasRef.current && hasStream) {
        const vid = videoRef.current;
        const cvs = canvasRef.current;
        const ctx = cvs.getContext('2d', { alpha: false });
        
        if (ctx && vid.readyState >= 2) {
          // Sync canvas size to video aspect
          if (cvs.width !== vid.videoWidth) {
            cvs.width = vid.videoWidth;
            cvs.height = vid.videoHeight;
          }

          // Draw Video Frame
          ctx.save();
          if (facingMode === 'user') {
            ctx.translate(cvs.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(vid, 0, 0, cvs.width, cvs.height);
          ctx.restore();

          // Real-time ML Inference (throttle to every 500ms for performance)
          const nowMs = Date.now();
          if (mlModelRef.current && nowMs - lastDetectionRef.current > 500) {
            lastDetectionRef.current = nowMs;
            const preds = await mlModelRef.current.detect(cvs);
            setDetections(preds);
            
            // Selfie Detection Logic
            const personFound = preds.some(p => p.class === 'person' && p.score > 0.5);
            setIsFaceBlocked(personFound);
            if (personFound) {
              window.sessionStorage.setItem('simulate_fake', 'true');
            }
          }

          // Draw ML Boxes (Forensic Overlay)
          detections.forEach(det => {
            const [x, y, w, h] = det.bbox;
            const isDanger = det.class === 'person';
            
            ctx.strokeStyle = isDanger ? '#ef4444' : '#22c55e';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, w, h);
            
            ctx.fillStyle = isDanger ? '#ef4444' : '#22c55e';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(`${det.class.toUpperCase()} (${Math.round(det.score * 100)}%)`, x, y > 20 ? y - 5 : y + 15);
          });

          // Draw Forensic Watermark
          const nowStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' });
          const fontSize = Math.max(12, Math.round(cvs.width * 0.025));
          const padding = 20;

          // Background Bar
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(0, cvs.height - (fontSize * 3.8), cvs.width, fontSize * 3.8);

          // Location Info
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.fillText(`📍 ADDR: ${location || initialLocation || 'Determining location...'}`, padding, cvs.height - (fontSize * 2.2));
          
          ctx.font = `${fontSize * 0.8}px monospace`;
          ctx.fillStyle = '#cbd5e1'; // slate-300
          ctx.fillText(`🌐 GPS: ${coords || 'GPS Signal Search...'}`, padding, cvs.height - (fontSize * 1.0));
          
          ctx.font = `${fontSize * 0.7}px sans-serif`;
          ctx.fillStyle = '#94a3b8'; // slate-400
          ctx.fillText(`📅 TIME: ${now}`, padding, cvs.height - (fontSize * 0.25));

          // Security Badge
          const badgeText = "🛡️ SECURE LIVE PROOF";
          ctx.font = `bold ${fontSize * 0.75}px sans-serif`;
          const metrics = ctx.measureText(badgeText);
          ctx.fillStyle = 'rgba(34, 197, 94, 0.2)'; // success/20
          ctx.roundRect(cvs.width - metrics.width - padding*2, cvs.height - (fontSize * 3.2), metrics.width + padding, fontSize * 1.5, 4);
          ctx.fill();
          ctx.fillStyle = '#4ade80'; // success-400
          ctx.fillText(badgeText, cvs.width - metrics.width - padding - 8, cvs.height - (fontSize * 2.2));
        }
      }
      rafRef.current = requestAnimationFrame(drawLoop);
    };
    
    rafRef.current = requestAnimationFrame(drawLoop);

    // Live clock overlay fallback for UI
    const interval = setInterval(() => {
      setTimestamp(new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' }));
    }, 1000);

    return () => {
      stopCurrentStream();
      clearInterval(interval);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode, hasStream, location, coords, initialLocation]);

  const toggleCamera = () => setFacingMode(p => p === 'user' ? 'environment' : 'user');

  const capturePhoto = () => {
    if (!canvasRef.current || !hasStream) return;
    setIsCapturing(true);

    canvasRef.current.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `petition_proof_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        const mlFindings = detections.map(d => d.class);
        onCapture(file, url, { 
          timestamp: new Date().toLocaleString(), 
          location: location || initialLocation || undefined,
          ml_findings: mlFindings
        });
        toast.success('Forensic photo captured! 📸');
        onClose();
      }
      setIsCapturing(false);
    }, 'image/jpeg', 0.95);
  };

  const startRecording = () => {
    if (!canvasRef.current) return;
    
    chunksRef.current = [];
    try {
      const options = { mimeType: 'video/webm;codecs=vp8,opus' };
      // Capture the watermarked canvas stream instead of the raw camera stream
      const stream = (canvasRef.current as any).captureStream(30);
      const recorder = new MediaRecorder(stream, options);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const file = new File([blob], `petition_video_${Date.now()}.webm`, { type: 'video/webm' });
        const mlFindings = detections.map(d => d.class);
        onCapture(file, url, { 
          timestamp: new Date().toLocaleString(), 
          location: location || undefined,
          ml_findings: mlFindings
        });
        toast.success('Live video captured successfully! 🎥');
        onClose();
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 14) { // 15s limit
            stopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Recording error:", err);
      toast.error("Could not start video recording.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  const handleAction = () => {
    if (mode === 'photo') capturePhoto();
    else if (!isRecording) startRecording();
    else stopRecording();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700">

        {/* ── Error State ─────────────────────────────────────────── */}
        {cameraError ? (
          <div className="flex flex-col items-center justify-center gap-6 p-10 text-center min-h-[360px]">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/30">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-white font-bold text-lg">Camera Access Required</h3>
              <p className="text-slate-400 text-sm max-w-xs leading-relaxed whitespace-pre-line">
                {cameraError}
              </p>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
              <Button
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={onClose}
              >
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={() => startCamera(facingMode)}
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Retry
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Viewfinder ───────────────────────────────────────── */}
            <div className="relative aspect-[3/4] sm:aspect-video bg-black overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity duration-300 ${hasStream ? 'opacity-100' : 'opacity-0'} ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Loading spinner while camera starts */}
              {!hasStream && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Camera className="w-10 h-10 text-slate-500 animate-pulse" />
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Starting camera…</span>
                  </div>
                </div>
              )}

              {/* Scanning line */}
              {hasStream && (
                <motion.div
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                  className="absolute left-0 right-0 h-[2px] bg-primary/60 shadow-[0_0_12px_rgba(59,130,246,0.7)] z-10 pointer-events-none"
                />
              )}

              {/* ML Warning Overlay */}
              {isFaceBlocked && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-auto px-6">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-red-600/95 text-white px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 backdrop-blur-md border border-white/20 text-center max-w-[280px]"
                  >
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                      <AlertTriangle className="w-8 h-8 animate-pulse text-white" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-lg font-bold uppercase tracking-tight">Person Detected!</span>
                      <span className="text-[11px] opacity-90 leading-tight">Live audit failed. Evidence must show infrastructure (Roads, Water, etc.), not humans.</span>
                    </div>
                    
                    <div className="flex flex-col w-full gap-2 mt-2">
                       <Button 
                        variant="secondary" 
                        className="w-full bg-white text-red-600 hover:bg-white/90 font-bold text-xs h-10"
                        onClick={() => setIsFaceBlocked(false)}
                      >
                        Try Again (Move Camera)
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full text-white hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest h-8"
                        onClick={onClose}
                      >
                        Cancel & Go Back
                      </Button>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* TOP-LEFT overlays */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
                <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-widest">Live Preview</span>
                </div>
                {location && (
                  <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-bold text-white leading-none">{location}</span>
                  </div>
                )}
              </div>

              {/* TOP-RIGHT clock */}
              {timestamp && (
                <div className="absolute top-4 right-4 z-20">
                  <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                    <Clock className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-bold text-white leading-none">{timestamp}</span>
                  </div>
                </div>
              )}

              {/* Rule-of-thirds grid */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-[0.15]">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="border border-white/40" />
                ))}
              </div>

              {/* Recording Indicator */}
              {isRecording && (
                <div className="absolute inset-0 border-4 border-red-500/50 animate-pulse pointer-events-none z-20">
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-bold">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    REC {recordingTime}s / 15s
                  </div>
                </div>
              )}

              {/* Capture flash */}
              {isCapturing && (
                <motion.div
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-0 bg-white z-30 pointer-events-none"
                />
              )}
            </div>

            {/* ── Controls ─────────────────────────────────────────── */}
            <div className="bg-slate-900 px-6 py-5 flex items-center justify-between border-t border-slate-800">
              {/* Close */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-12 h-12 rounded-full text-white hover:bg-white/10"
              >
                <X className="w-6 h-6" />
              </Button>

              {/* Shutter */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex bg-slate-800 p-0.5 rounded-full border border-slate-700 mb-2">
                  <button 
                    onClick={() => setMode('photo')}
                    className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all ${mode === 'photo' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                  >
                    PHOTO
                  </button>
                  <button 
                    onClick={() => setMode('video')}
                    className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all ${mode === 'video' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400'}`}
                  >
                    VIDEO
                  </button>
                </div>

                 <div className="flex flex-col items-center gap-1 group relative">
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={handleAction}
                    disabled={isCapturing || !hasStream || (isFaceBlocked && !isRecording)}
                    className={`w-20 h-20 rounded-full border-4 flex items-center justify-center p-1.5 transition-all
                               ${isFaceBlocked && !isRecording ? 'border-slate-700 opacity-50' : mode === 'video' ? 'border-red-500' : 'border-white'} 
                               disabled:cursor-not-allowed`}
                  >
                    <div className={`w-full h-full rounded-full transition-all duration-300 ${isFaceBlocked && !isRecording ? 'bg-slate-800' : isRecording ? 'bg-red-500 scale-50 rounded-md' : mode === 'video' ? 'bg-red-500 group-hover:bg-red-400' : 'bg-white group-hover:bg-slate-100'}`} />
                  </motion.button>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isFaceBlocked && !isRecording ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                    {isFaceBlocked && !isRecording ? 'LOCKED' : isRecording ? 'STOP' : mode === 'video' ? 'RECORD' : 'CAPTURE'}
                  </span>
                  
                  {isFaceBlocked && !isRecording && (
                    <div className="absolute -top-8 bg-red-600 text-[9px] font-bold text-white px-2 py-0.5 rounded shadow-lg animate-bounce">
                      HUMAN DETECTED
                    </div>
                  )}
                </div>
              </div>

              {/* Flip camera */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCamera}
                className="w-12 h-12 rounded-full text-white hover:bg-white/10"
              >
                <RefreshCw className="w-6 h-6" />
              </Button>
            </div>
          </>
        )}

        {/* ── Security header badge ─────────────────────────────── */}
        <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none z-40">
          <div className={`${isModelReady ? 'bg-green-600' : 'bg-primary'} text-white text-[10px] font-bold px-4 py-1.5 rounded-b-xl shadow-lg flex items-center gap-2 transition-colors duration-500`}>
            {isModelReady ? <Brain className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            {isModelReady ? 'ML FORENSIC SHIELD ACTIVE' : 'ENFORCED LIVE CAPTURE · GALLERY BLOCKED'}
          </div>
        </div>
      </div>

      {/* Hidden canvas for watermark processing */}
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}
