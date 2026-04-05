import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { MessageCircle, X, Send, Bot, User, FileText, Loader2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

interface DraftPetition {
  title: string;
  category: string;
  description: string;
  location: string;
}

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ta', label: 'தமிழ்', name: 'Tamil' },
  { code: 'te', label: 'తెలుగు', name: 'Telugu' },
  { code: 'hi', label: 'हिंदी', name: 'Hindi' },
  { code: 'kn', label: 'ಕನ್ನಡ', name: 'Kannada' },
];

export default function GrievanceChatbot() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [draft, setDraft] = useState<DraftPetition | null>(null);
  const [started, setStarted] = useState(false);
  const [chatLang, setChatLang] = useState<string>(user?.language_pref || i18n.language || 'en');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const lang = chatLang;

  // Only show for citizens
  if (!user || user.role !== 'citizen') return null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

  const greetings: Record<string, string> = {
    en: "👋 Hi! I'm your Grievance Assistant. Tell me your problem and I'll help you draft a petition!",
    ta: "👋 வணக்கம்! நான் உங்கள் மனு உதவியாளர். உங்கள் பிரச்சனையை சொல்லுங்கள், மனு தயார் செய்கிறேன்!",
    te: "👋 నమస్కారం! నేను మీ పిటిషన్ సహాయకుడు. మీ సమస్యను చెప్పండి!",
    hi: "👋 नमस्ते! मैं आपका शिकायत सहायक हूँ। अपनी समस्या बताएं!",
    kn: "👋 ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಅರ್ಜಿ ಸಹಾಯಕ. ನಿಮ್ಮ ಸಮಸ್ಯೆ ಹೇಳಿ!",
    ml: "👋 നമസ്കാരം! ഞാൻ നിങ്ങളുടെ ഹർജി സഹായി. നിങ്ങളുടെ പ്രശ്നം പറയൂ!",
  };

  const placeholders: Record<string, string> = {
    en: "Type your message...",
    ta: "உங்கள் செய்தியை தட்டச்சு செய்யுங்கள்...",
    te: "మీ సందేశం టైప్ చేయండి...",
    hi: "अपना संदेश टाइप करें...",
    kn: "ನಿಮ್ಮ ಸಂದೇಶ ಟೈಪ್ ಮಾಡಿ...",
    ml: "നിങ്ങളുടെ സന്ദേശം ടൈപ്പ് ചെയ്യുക...",
  };

  const fillFormLabels: Record<string, string> = {
    en: "✅ Fill Petition Form",
    ta: "✅ மனு படிவம் நிரப்பு",
    te: "✅ పిటిషన్ ఫారమ్ నింపండి",
    hi: "✅ याचिका फॉर्म भरें",
    kn: "✅ ಅರ್ಜಿ ಫಾರ್ಮ್ ಭರ್ತಿ ಮಾಡಿ",
    ml: "✅ ഹർജി ഫോം പൂരിപ്പിക്കുക",
  };

  const draftReadyMessages: Record<string, string> = {
    en: "🎉 Your petition draft is ready! Click the button below to auto-fill the form.",
    ta: "🎉 உங்கள் மனு வரைவு தயார்! கீழே உள்ள பொத்தானை கிளிக் செய்து படிவம் நிரப்புங்கள்.",
    te: "🎉 మీ పిటిషన్ డ్రాఫ్ట్ సిద్ధం! దిగువ బటన్ నొక్కి ఫారమ్ నింపండి.",
    hi: "🎉 आपका याचिका ड्राफ्ट तैयार है! नीचे दबाकर फॉर्म भरें।",
    kn: "🎉 ನಿಮ್ಮ ಅರ್ಜಿ ಡ್ರಾಫ್ಟ್ ಸಿದ್ಧವಾಗಿದೆ! ಕೆಳಗಿನ ಬಟನ್ ಒತ್ತಿ ಫಾರ್ಮ್ ಭರ್ತಿ ಮಾಡಿ.",
    ml: "🎉 നിങ്ങളുടെ ഹർജി ഡ്രാഫ്റ്റ് തയ്യാർ! ചുവടെ ഉള്ള ബട്ടൺ ക്ലിക്ക് ചെയ്ത് ഫോം പൂരിപ്പിക്കുക.",
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!started) {
      setStarted(true);
      const greeting = greetings[lang] || greetings['en'];
      setMessages([{ role: 'bot', content: greeting }]);
    }
  };

  const switchLanguage = (code: string) => {
    setChatLang(code);
    setMessages([{ role: 'bot', content: greetings[code] || greetings['en'] }]);
    setDraft(null);
    setStarted(true);
    setInput('');
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const history = newMessages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
      
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ message: input.trim(), history, lang })
      });

      const data = await res.json();

      if (data.petition) {
        setDraft(data.petition);
        const draftMsg = draftReadyMessages[lang] || draftReadyMessages['en'];
        setMessages(prev => [...prev, { role: 'bot', content: draftMsg }]);
      } else if (data.text) {
        setMessages(prev => [...prev, { role: 'bot', content: data.text }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'bot', content: '❌ Error connecting to chatbot. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const fillForm = () => {
    if (!draft) return;
    // Store draft in sessionStorage so the submit page can pick it up
    sessionStorage.setItem('chatbot_draft', JSON.stringify(draft));
    setIsOpen(false);
    navigate('/submit');
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-all duration-300 hover:scale-110 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #1a56db 0%, #7e3af2 100%)' }}
          title="Grievance Assistant"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-16px)] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{ height: '520px', background: 'white', border: '1px solid rgba(0,0,0,0.1)' }}>

          {/* Header */}
          <div className="shrink-0" style={{ background: 'linear-gradient(135deg, #1a56db 0%, #7e3af2 100%)' }}>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">Grievance Assistant</p>
                <p className="text-white/70 text-xs">AI-powered petition helper</p>
              </div>
              <button onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <Minimize2 className="w-4 h-4 text-white" />
              </button>
            </div>
            {/* Language Selector Bar */}
            <div className="flex items-center gap-1 px-3 pb-2">
              {LANGUAGES.map(lng => (
                <button
                  key={lng.code}
                  onClick={() => switchLanguage(lng.code)}
                  title={lng.name}
                  className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    chatLang === lng.code
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-white/70 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  {lng.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: '#f8faff' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'
                }`}>
                  {msg.role === 'user'
                    ? <User className="w-3.5 h-3.5 text-white" />
                    : <Bot className="w-3.5 h-3.5 text-white" />
                  }
                </div>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-100'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm border border-gray-100 flex items-center gap-1.5">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Draft Ready Button */}
          {draft && (
            <div className="px-4 py-2 bg-green-50 border-t border-green-100 shrink-0">
              <button onClick={fillForm}
                className="w-full py-2 rounded-xl text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-95"
                style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                <span className="flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" />
                  {fillFormLabels[lang] || fillFormLabels['en']}
                </span>
              </button>
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 p-3 bg-white border-t border-gray-100 shrink-0">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={placeholders[lang] || placeholders['en']}
              disabled={isLoading}
              className="flex-1 px-3 py-2 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-blue-400 transition-colors bg-gray-50 disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #1a56db 0%, #7e3af2 100%)' }}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
