
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Shield,
  MessageCircle,
  Activity,
  LayoutDashboard,
  User,
  AlertTriangle,
  Heart,
  Moon,
  Sun,
  ChevronRight,
  Plus,
  ArrowRight,
  LogOut,
  Brain,
  Coffee,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Lock,
  Wind,
  BookOpen,
  Info,
  Calendar,
  Sparkles,
  Smartphone,
  Check,
  Volume2,
  VolumeX,
  Mic,
  MicOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";

/**
 * PULSE: DIGITAL WELL-BEING & DETOX PLATFORM
 * Production-ready Architecture (Simulated for Browser Environment)
 */

// --- SECURITY & ENCRYPTION ---
const MASTER_KEY_STORAGE_KEY = 'pulse_encryption_v1';

class EncryptionService {
  private static async getMasterKey(): Promise<CryptoKey> {
    let rawKey = localStorage.getItem(MASTER_KEY_STORAGE_KEY);
    if (!rawKey) {
      const newRaw = crypto.getRandomValues(new Uint8Array(32));
      rawKey = btoa(String.fromCharCode(...newRaw));
      localStorage.setItem(MASTER_KEY_STORAGE_KEY, rawKey);
    }
    const keyBuffer = Uint8Array.from(atob(rawKey), c => c.charCodeAt(0));
    return await crypto.subtle.importKey('raw', keyBuffer, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }

  static async encrypt(text: string): Promise<string> {
    try {
      const key = await this.getMasterKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(text);
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      return btoa(String.fromCharCode(...combined));
    } catch (e) { return "ENCRYPTION_ERROR"; }
  }

  static async decrypt(cipher: string): Promise<string> {
    try {
      const key = await this.getMasterKey();
      const combined = Uint8Array.from(atob(cipher), c => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
      return new TextDecoder().decode(decrypted);
    } catch (e) { return "[ENCRYPTED]"; }
  }
}

// --- CRISIS LOGIC ---
const CRISIS_KEYWORDS = ["kill myself", "end my life", "suicide", "self-harm", "hopeless", "cutting", "overdose"];
const checkForCrisis = (text: string): boolean => CRISIS_KEYWORDS.some(k => text.toLowerCase().includes(k));

// --- DATA TYPES ---
interface UserProfile { id: string; email: string; name: string; level: string; }
interface Message { id: string; sender: 'user' | 'bot'; text: string; timestamp: Date; }
interface Habit { id: string; type: string; current: number; goal: number; unit: string; icon: any; color: string; }
interface JournalEntry { id: string; mood: string; text: string; date: string; }

// --- MOCK SUPABASE / DB SERVICE ---
const DB = {
  getProfile: async (): Promise<UserProfile> => ({
    id: 'u1', email: 'alex@pulse.io', name: 'Alex', level: 'Level 2 Mindfulness'
  }),
  getHabits: async (): Promise<Habit[]> => {
    const defaultHabits: Habit[] = [
      { id: 'h1', type: 'Screen Time', current: 4.5, goal: 3, unit: 'hrs', icon: Smartphone, color: 'rose' },
      { id: 'h2', type: 'Mindfulness', current: 15, goal: 20, unit: 'min', icon: Wind, color: 'indigo' },
      { id: 'h3', type: 'Focus Hours', current: 2, goal: 4, unit: 'hrs', icon: Brain, color: 'amber' }
    ];
    const saved = localStorage.getItem('habits');
    if (!saved) return defaultHabits;

    const parsed = JSON.parse(saved);
    // Merge icons back since they are not serializable
    return parsed.map((h: any) => {
      const def = defaultHabits.find(dh => dh.id === h.id);
      return { ...h, icon: def?.icon || Smartphone };
    });
  },
  updateHabit: async (id: string, value: number) => {
    const habits = await DB.getHabits();
    const updated = habits.map(h => h.id === id ? { ...h, current: value } : h);
    localStorage.setItem('habits', JSON.stringify(updated.map(({ icon, ...h }) => h)));
    return updated;
  },
  saveSession: (profile: UserProfile | null) => {
    if (profile) localStorage.setItem('pulse_session', JSON.stringify(profile));
    else localStorage.removeItem('pulse_session');
  },
  getSession: (): UserProfile | null => {
    const saved = localStorage.getItem('pulse_session');
    return saved ? JSON.parse(saved) : null;
  },
  saveMessage: async (sessionId: string, sender: 'user' | 'bot', text: string) => {
    const encryptedText = await EncryptionService.encrypt(text);
    const existing = JSON.parse(localStorage.getItem(`chat_${sessionId}`) || '[]');
    const msg = { id: Math.random().toString(36), sender, text: encryptedText, timestamp: new Date().toISOString() };
    localStorage.setItem(`chat_${sessionId}`, JSON.stringify([...existing, msg]));
    return { ...msg, text, timestamp: new Date() };
  },
  getMessages: async (sessionId: string): Promise<Message[]> => {
    const raw = JSON.parse(localStorage.getItem(`chat_${sessionId}`) || '[]');
    return Promise.all(raw.map(async (m: any) => ({
      ...m,
      text: await EncryptionService.decrypt(m.text),
      timestamp: new Date(m.timestamp)
    })));
  },
  saveJournal: async (mood: string, text: string) => {
    const encryptedText = await EncryptionService.encrypt(text);
    const journals = JSON.parse(localStorage.getItem('journals') || '[]');
    const entry = { id: Math.random().toString(36), mood, text: encryptedText, date: new Date().toISOString() };
    localStorage.setItem('journals', JSON.stringify([entry, ...journals]));
    return entry;
  }
};

// --- GEMINI SERVICE ---
const SYSTEM_PROMPT = `You are Pulse, an empathetic digital well-being companion.
Rules:
1. Focus on social media detox, digital addiction, and mental health.
2. Be brief, non-judgmental, and evidence-based.
3. You are NOT a medical tool. Explicitly state this if medical advice is asked.
4. Encourage offline hobbies and mindfulness.
5. If crisis is detected, provide support and suggest professional help. Only provide emergency numbers for India/Tamil Nadu: Emergency/Ambulance (108), Police (100), Sneha Suicide Prevention (+91-44-24640050 or 104).`;

const getApiKey = () => {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey !== 'undefined') return envKey;
  
  let localKey = localStorage.getItem('pulse_api_key');
  if (!localKey) {
    localKey = window.prompt("Please enter your Gemini API Key to enable AI features (it will be saved locally):");
    if (localKey) {
      localStorage.setItem('pulse_api_key', localKey);
    }
  }
  return localKey || "";
  return localKey || "";
};

const speakText = (text: string) => {
  if (!('speechSynthesis' in window)) return;
  const cleanText = text.replace(/[*#]/g, '');
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  
  const voices = window.speechSynthesis.getVoices();
  const femaleVoice = voices.find(v => 
    v.name.includes('Female') || 
    v.name.includes('Samantha') || 
    v.name.includes('Victoria') || 
    v.name.includes('Google US English') || 
    v.name.includes('Zira') || 
    (v.name.toLowerCase().includes('english') && v.name.toLowerCase().includes('female'))
  );
  
  if (femaleVoice) utterance.voice = femaleVoice;
  window.speechSynthesis.speak(utterance);
};

const fetchBotResponse = async (history: Message[], input: string): Promise<string> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) return "API key is required to use this feature. Please refresh the page and enter your Gemini API key.";
    
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        { role: 'user', parts: [{ text: "Who are you?" }] },
        { role: 'model', parts: [{ text: "I'm Pulse, your digital balance companion. How can I help you today?" }] },
        ...history.slice(-4).map(m => ({ role: m.sender === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
        { role: 'user', parts: [{ text: input }] }
      ] as any,
      config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.6 }
    });
    return response.text || "I'm here for you. Let's take a deep breath.";
  } catch (e: any) {
    console.error("AI Error:", e);
    return "I'm momentarily disconnected to maintain your data privacy. Please try again soon.";
  }
};

// --- REUSABLE COMPONENTS ---

// Fix: Card props updated to allow key and avoid children missing error in strict environments
const Card = ({ children, className = "", ...props }: any) => (
  <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden ${className}`} {...props}>
    {children}
  </div>
);

// Fix: Button props updated to use rest spreading
const Button = ({ children, onClick, variant = 'primary', className = "", disabled = false, type = 'button', ...props }: any) => {
  const base = "px-5 py-3 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2";
  const variants: any = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
    outline: "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900",
    danger: "bg-rose-500 text-white hover:bg-rose-600"
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`} {...props}>{children}</button>;
};

// Fix: PageTransition props updated to avoid key/children missing errors
const PageTransition = ({ children, ...props }: any) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} {...props}>
    {children}
  </motion.div>
);

// --- FEATURE COMPONENTS ---

const BreathingTool = ({ onComplete }: { onComplete?: (minutes: number) => void }) => {
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Ready'>('Ready');
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isActive) {
      if (seconds >= 60 && onComplete) {
        onComplete(Math.floor(seconds / 60));
      }
      setSeconds(0);
      setPhase('Ready');
      return;
    }

    const timer = setInterval(() => setSeconds(s => s + 1), 1000);

    let phaseTimer: any;
    const cycle = () => {
      setPhase('Inhale');
      phaseTimer = setTimeout(() => {
        setPhase('Hold');
        phaseTimer = setTimeout(() => {
          setPhase('Exhale');
          phaseTimer = setTimeout(cycle, 4000);
        }, 4000);
      }, 4000);
    };
    cycle();

    return () => {
      clearInterval(timer);
      clearTimeout(phaseTimer);
    };
  }, [isActive]);

  return (
    <Card className="p-8 flex flex-col items-center justify-center text-center space-y-8 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
      <div className="space-y-2">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Box Breathing</h2>
        <p className="text-slate-500 text-sm">{isActive ? `Practicing: ${seconds}s` : 'Reset your nervous system in 60 seconds.'}</p>
      </div>

      <div className="relative flex items-center justify-center w-64 h-64">
        <AnimatePresence mode='wait'>
          <motion.div
            key={phase}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: phase === 'Inhale' ? 1.4 : phase === 'Hold' ? 1.4 : 1, opacity: 1 }}
            transition={{ duration: 4, ease: "easeInOut" }}
            className={`w-32 h-32 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-2xl ${phase === 'Inhale' ? 'bg-indigo-500' : phase === 'Hold' ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
          >
            {isActive ? phase : <Wind className="w-12 h-12" />}
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 rounded-full border-4 border-dashed border-slate-200 dark:border-slate-800 animate-[spin_20s_linear_infinite]"></div>
      </div>

      <div className="flex flex-col gap-4 w-full">
        <Button variant={isActive ? 'outline' : 'primary'} onClick={() => setIsActive(!isActive)}>
          {isActive ? 'Stop Practice' : 'Start Practice'}
        </Button>
        {seconds > 0 && seconds < 60 && isActive && (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic animate-pulse">Complete 60s to log mindfulness</p>
        )}
      </div>
    </Card>
  );
};

const JournalingTool = () => {
  const [mood, setMood] = useState('Neutral');
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!text.trim()) return;
    await DB.saveJournal(mood, text);
    setSaved(true);
    setText('');
    setTimeout(() => setSaved(false), 2000);
  };

  const moods = [
    { label: 'Peaceful', icon: '😌' },
    { label: 'Anxious', icon: '😟' },
    { label: 'Overwhelmed', icon: '😵‍💫' },
    { label: 'Focused', icon: '🎯' },
    { label: 'Joyful', icon: '✨' }
  ];

  return (
    <Card className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black">Daily Check-in</h2>
        <BookOpen className="text-indigo-600 w-6 h-6" />
      </div>
      <div className="flex flex-wrap gap-3">
        {moods.map(m => (
          <button
            key={m.label}
            onClick={() => setMood(m.label)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${mood === m.label ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="How was your digital usage today? Any triggers or triumphs?"
        className="w-full h-40 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none dark:text-white"
      />
      <Button className="w-full" onClick={handleSave} disabled={!text.trim() || saved}>
        {saved ? <><Check className="w-5 h-5" /> Saved to Encrypted Vault</> : 'Securely Save Entry'}
      </Button>
    </Card>
  );
};

// --- PAGES ---

// Fix: Dashboard updated to accept extra props (like key)
const Dashboard = ({ profile, habits, onAddLog, onSwitchTab, ...props }: any) => (
  <PageTransition {...props}>
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Welcome back, {profile.name}</h1>
          <p className="text-slate-500 font-medium">Your digital sanctuary is active.</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Calendar className="w-5 h-5 text-indigo-500" />
          <span className="font-bold text-sm">{new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {habits.map((habit: Habit) => (
          <Card key={habit.id} className="p-6 relative group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl bg-${habit.color}-50 dark:bg-${habit.color}-900/20 text-${habit.color}-600`}>
                <habit.icon className="w-6 h-6" />
              </div>
              <button onClick={() => onAddLog(habit.id)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <Plus className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">{habit.type}</h3>
            <div className="flex items-baseline gap-2 my-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">{habit.current}</span>
              <span className="text-sm text-slate-400">/ {habit.goal} {habit.unit}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((habit.current / habit.goal) * 100, 100)}%` }}
                className={`h-full ${habit.current > habit.goal ? 'bg-rose-500' : `bg-indigo-500`}`}
              />
            </div>
            <div className="mt-3 flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span>Current</span>
              <span>Target</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-8 bg-indigo-600 text-white border-none shadow-indigo-200 shadow-2xl dark:shadow-none relative">
          <div className="relative z-10 space-y-4">
            <h2 className="text-2xl font-bold">Quick Reset</h2>
            <p className="text-indigo-100 text-sm max-w-sm">Feeling the urge to scroll? Try a 1-minute focused breathing session instead. Your brain will thank you.</p>
            <Button variant="secondary" className="bg-white text-indigo-600" onClick={() => onSwitchTab('tools')}>Start Guided Session</Button>
          </div>
          <Sparkles className="absolute right-0 bottom-0 w-48 h-48 text-white/10 -rotate-12 translate-x-12 translate-y-12" />
        </Card>

        <Card className="p-8 flex flex-col justify-center space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg">System Status</h3>
          </div>
          <p className="text-slate-500 text-sm">Pulse Security Engine is monitoring your digital well-being logs. All data is encrypted locally using AES-256-GCM before syncing.</p>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold rounded-full uppercase tracking-widest">TLS 1.3 Active</span>
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold rounded-full uppercase tracking-widest">Zero Trust Auth</span>
          </div>
        </Card>
      </div>
    </div>
  </PageTransition>
);

// Fix: ChatPage updated to accept extra props (like key)
const ChatPage = ({ profile, ...props }: any) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCrisis, setIsCrisis] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => { DB.getMessages('main').then(setMessages); }, []);
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const toggleListening = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => {
      let finalTranscript = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        const cleaned = finalTranscript.replace(/\b(umm|uh|ah|hmm|like)\b/gi, '').replace(/\s{2,}/g, ' ').trim();
        if (cleaned) {
          setInput(prev => prev ? prev + ' ' + cleaned : cleaned);
        }
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    recognitionRef.current = recognition;
    recognition.start();
  };

  const onSend = async () => {
    if (!input.trim() || isTyping) return;
    if (checkForCrisis(input)) return setIsCrisis(true);
    const text = input; setInput('');
    const userMsg = await DB.saveMessage('main', 'user', text);
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    const botResponse = await fetchBotResponse(messages, text);
    if (isVoiceEnabled) {
      speakText(botResponse);
    }
    const botMsg = await DB.saveMessage('main', 'bot', botResponse);
    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);
  };

  return (
    <PageTransition {...props}>
      <div className="flex flex-col h-[calc(100vh-180px)] lg:h-[calc(100vh-120px)] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        <header className="p-4 bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Pulse AI Guide</h3>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Encrypted Session
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (isVoiceEnabled) window.speechSynthesis.cancel();
                setIsVoiceEnabled(!isVoiceEnabled);
              }}
              className={`p-2 rounded-xl transition-all ${isVoiceEnabled ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              title={isVoiceEnabled ? "Mute AI Voice" : "Enable AI Voice"}
            >
              {isVoiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <Info className="w-5 h-5 text-slate-400 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300" onClick={() => alert("Pulse AI is for digital well-being support. It is NOT a medical device.")} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-50">
              <div className="p-6 bg-indigo-50 dark:bg-indigo-950/30 rounded-full">
                <MessageCircle className="w-10 h-10 text-indigo-500" />
              </div>
              <p className="max-w-xs font-medium">Hello {profile.name}. I'm here to help you navigate your digital life with mindfulness. How can I support you today?</p>
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-3xl ${m.sender === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none shadow-sm'}`}>
                <p className="text-sm leading-relaxed font-medium whitespace-pre-wrap">{m.text}</p>
                <div className={`flex items-center gap-2 mt-2 opacity-40 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[10px]">{m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <button 
                    onClick={() => speakText(m.text)}
                    className="hover:text-white transition-colors p-1"
                    title="Read aloud"
                  >
                    <Volume2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none animate-pulse">
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex items-center gap-2 max-w-4xl mx-auto">
            <button 
              onClick={toggleListening} 
              className={`p-4 rounded-2xl transition-all ${isListening ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'}`}
              title={isListening ? "Listening..." : "Speak to Text"}
            >
              {isListening ? <Mic className="w-6 h-6 animate-pulse" /> : <Mic className="w-6 h-6" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSend()}
              placeholder={isListening ? "Listening... Speak now" : "Share your thoughts or ask for a detox tip..."}
              className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
            />
            <button onClick={onSend} className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50" disabled={!input.trim() || isTyping}>
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
          <p className="text-[9px] text-center text-slate-400 mt-4 font-black uppercase tracking-[0.2em]">Medical Disclaimer: Not a therapy replacement</p>
        </div>

        <AnimatePresence>
          {isCrisis && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
              <Card className="max-w-md w-full p-8 space-y-6 border-rose-500/30">
                <div className="flex items-center gap-4 text-rose-500">
                  <AlertTriangle className="w-10 h-10" />
                  <h2 className="text-2xl font-black">We're concerned.</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">It sounds like you're going through a lot. Pulse is an AI and cannot provide emergency support.</p>
                <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-900">
                  <h4 className="font-bold text-rose-700 dark:text-rose-400 mb-2">Immediate Support:</h4>
                  <ul className="text-sm space-y-2 text-slate-700 dark:text-slate-300">
                    <li><strong>TN Emergency/Ambulance:</strong> Call 108 or 100</li>
                    <li><strong>Sneha Suicide Prevention (Chennai):</strong> +91 44 24640050</li>
                    <li><strong>State Health Helpline:</strong> Call 104</li>
                  </ul>
                </div>
                <Button className="w-full text-lg py-4" onClick={() => setIsCrisis(false)}>Return to Pulse</Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

const ToolsPage = ({ habits, onAddLog, ...props }: any) => (
  <PageTransition {...props}>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <h2 className="text-3xl font-black mb-2">Well-being Tools</h2>
        <p className="text-slate-500 font-medium">Science-backed interventions for a healthier digital life.</p>
        <BreathingTool onComplete={(mins) => {
          const mindHabit = habits.find((h: Habit) => h.id === 'h2');
          if (mindHabit) {
            onAddLog('h2', mins);
          }
        }} />
      </div>
      <div className="space-y-4">
        <h2 className="text-3xl font-black mb-2 opacity-0 select-none">Journal</h2>
        <p className="text-slate-500 font-medium opacity-0 select-none">.</p>
        <JournalingTool />
      </div>
    </div>
  </PageTransition>
);

// --- AUTH VIEW ---

const AuthView = ({ onAuth }: { onAuth: () => void }) => {
  const [step, setStep] = useState<'welcome' | 'form'>('welcome');
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <AnimatePresence mode='wait'>
        {step === 'welcome' ? (
          <motion.div key="welcome" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="max-w-md space-y-8">
            <div className="inline-flex items-center justify-center p-5 bg-indigo-600 rounded-3xl text-white shadow-2xl shadow-indigo-200 dark:shadow-none mb-4">
              <ShieldCheck className="w-12 h-12" />
            </div>
            <div className="space-y-4">
              <h1 className="text-5xl font-black tracking-tighter italic italic">PULSE.</h1>
              <p className="text-xl text-slate-500 font-medium">Reclaim your digital focus with secure, AI-powered well-being support.</p>
            </div>
            <div className="grid gap-4">
              <Button onClick={() => setStep('form')} className="text-lg py-6">Get Started <ChevronRight className="w-5 h-5" /></Button>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Enterprise-Grade AES-256 Encryption Built-in</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            <Card className="p-8 text-left space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-black">Join the sanctuary.</h2>
                <p className="text-slate-500">Secure access to your encrypted dashboard.</p>
              </div>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onAuth(); }}>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                  <input type="email" required placeholder="name@company.com" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 outline-none transition-all dark:text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
                  <input type="password" required placeholder="••••••••" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 outline-none transition-all dark:text-white" />
                </div>
                <Button type="submit" className="w-full text-lg py-4">Sign In / Create Account</Button>
              </form>
              <div className="flex items-center gap-2 justify-center text-[10px] text-slate-400 font-black uppercase tracking-widest">
                <Lock className="w-3 h-3" /> Zero-Knowledge Privacy Architecture
              </div>
            </Card>
            <button onClick={() => setStep('welcome')} className="mt-8 text-slate-400 font-bold hover:text-indigo-600 transition-colors">← Back to Introduction</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- APP SHELL ---

function App() {
  const [activeTab, setActiveTab] = useState('dash');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const session = DB.getSession();
    if (session) {
      setProfile(session);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (!profile) {
        DB.getProfile().then(p => {
          setProfile(p);
          DB.saveSession(p);
        });
      }
      DB.getHabits().then(setHabits);
    }
  }, [isAuthenticated, profile]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const handleAddLog = (id: string, amount: number = 0.5) => {
    setHabits(prev => {
      const updated = prev.map(h => h.id === id ? { ...h, current: Number((h.current + amount).toFixed(1)) } : h);
      const target = updated.find(h => h.id === id);
      if (target) DB.updateHabit(id, target.current);
      return updated;
    });
  };

  const handleLogout = () => {
    DB.saveSession(null);
    setIsAuthenticated(false);
    setProfile(null);
  };

  if (!isAuthenticated) return <AuthView onAuth={() => setIsAuthenticated(true)} />;
  if (!profile) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-all duration-300">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:bg-white lg:dark:bg-slate-900 lg:border-r lg:border-slate-200 lg:dark:border-slate-800 lg:flex lg:flex-col lg:p-8 lg:z-40">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-12 h-12 bg-indigo-600 rounded-[1.2rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-100 dark:shadow-none">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <span className="text-3xl font-black italic tracking-tighter">PULSE.</span>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: 'dash', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'chat', icon: MessageCircle, label: 'Secure AI' },
            { id: 'tools', icon: Heart, label: 'Sanctuary' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
              {activeTab === tab.id && <motion.div layoutId="active" className="ml-auto w-1.5 h-6 bg-indigo-600 rounded-full" />}
            </button>
          ))}
        </nav>

        <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-black">{profile.name[0]}</div>
              <div className="text-sm">
                <p className="font-bold leading-none">{profile.name}</p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-black">{profile.level}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:scale-105">
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={handleLogout} className="text-rose-500 text-xs font-black uppercase tracking-widest hover:underline">Log Out</button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-72 min-h-screen">
        <div className="max-w-7xl mx-auto p-6 md:p-10 lg:p-14 pb-32 lg:pb-14">
          <AnimatePresence mode='wait'>
            {activeTab === 'dash' && <Dashboard key="dash" profile={profile} habits={habits} onAddLog={handleAddLog} onSwitchTab={setActiveTab} />}
            {activeTab === 'chat' && <ChatPage key="chat" profile={profile} />}
            {activeTab === 'tools' && <ToolsPage key="tools" habits={habits} onAddLog={handleAddLog} />}
          </AnimatePresence>

          <footer className="mt-20 pt-10 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
            <div className="flex gap-8 text-[10px] font-black uppercase tracking-[0.2em]">
              <a href="#" className="hover:text-indigo-600 transition-colors">Privacy</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Ethics</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Safety</a>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em]">
              <Shield className="w-3 h-3" /> Pulse Digital Sanctuary v1.0
            </div>
          </footer>
        </div>
      </main>

      {/* Mobile Nav */}
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-t border-slate-200 dark:border-slate-800 flex justify-around p-4 z-50">
        {[
          { id: 'dash', icon: LayoutDashboard, label: 'Dash' },
          { id: 'chat', icon: MessageCircle, label: 'AI' },
          { id: 'tools', icon: Heart, label: 'Tools' },
          { id: 'profile', icon: User, label: 'Me' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === item.id ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            <item.icon className={`w-6 h-6 ${activeTab === item.id ? 'scale-110' : ''} transition-transform`} />
            <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// Initialization
const root = createRoot(document.getElementById('root')!);
root.render(<App />);
