import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, MapPin, Clock, CheckCircle, AlertTriangle, Users, Mic, Square, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { campusAPI, bookingAPI } from '../services/api';
import { PlannerRobot, RobotMood } from '../components/planner/PlannerRobot';
import { useVoiceInput, speak, stopSpeaking } from '../components/planner/useVoice';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface PlanStep {
  order: number;
  activity: string;
  resourceId: string;
  resourceName: string;
  resourceType: string;
  building: string;
  startMinute: number;
  endMinute: number;
  start: string;
  end: string;
  startLabel: string;
  endLabel: string;
  seats: number;
  predictedPct: number;
  currentPct: number;
  bookable: boolean;
  reason: string;
}

interface Plan {
  steps: PlanStep[];
  skipped?: { activity: string; label: string; reason: string; kind?: 'skipped' | 'shortened' }[];
  summary: string;
}

interface PlanAlert {
  stepIndex: number;
  resourceName: string;
  oldPredictedPct: number;
  newPredictedPct: number;
  message: string;
  alternative: { resourceId: string; resourceName: string; resourceType: string; building: string; predictedPct: number; bookable: boolean } | null;
}

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  plan?: Plan;
}

const EXAMPLES = [
  'Is the library crowded right now?',
  'I have 3 free hours: study for my DBMS exam, eat something, and print my notes',
  'Need a computer lab for 2 hours of coding, then lunch',
  'Where can 4 of us have a group meeting?',
  'How do I change my password?',
];

const ACTIVITY_ICON: Record<string, string> = {
  study: '📚', group_study: '👥', computer: '💻', print: '🖨️', research: '🧪', food: '🍽️', relax: '🎮',
};
const pctColor = (p: number) => (p >= 75 ? 'text-red-400' : p >= 45 ? 'text-amber-400' : 'text-emerald-400');
const uid = () => Math.random().toString(36).slice(2, 10);
const STORE_KEY = 'occupra_chat_v1';

export const SmartPlannerPage: React.FC = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const welcome: Msg = {
    id: 'welcome',
    role: 'assistant',
    text: `Hi ${firstName}! I’m Occy 🤖 Ask me anything about campus — how crowded a place is, where to study, how to use the app — or tell me what you need to do and I’ll plan it around the crowds.`,
  };

  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null');
      if (Array.isArray(saved) && saved.length) return saved;
    } catch (_) {}
    return [welcome];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const [booked, setBooked] = useState<Record<string, string>>({});
  const [bookingKey, setBookingKey] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<PlanAlert[]>([]);
  const [readAloud, setReadAloud] = useState<boolean>(() => {
    try { return localStorage.getItem('occupra_voice_reply') === '1'; } catch (_) { return false; }
  });
  const fromVoiceRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const voice = useVoiceInput(lang, (text) => {
    fromVoiceRef.current = true;
    send(text);
  });

  useEffect(() => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-30))); } catch (_) {}
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    try { localStorage.setItem('occupra_voice_reply', readAloud ? '1' : '0'); } catch (_) {}
    if (!readAloud) stopSpeaking();
  }, [readAloud]);
  useEffect(() => () => stopSpeaking(), []);

  const latestPlanMsg = [...messages].reverse().find((m) => m.plan && m.plan.steps.length);

  // Keep watching the latest plan; suggest a switch if a place gets crowded
  useEffect(() => {
    if (!latestPlanMsg?.plan) return;
    setAlerts([]);
    const id = setInterval(async () => {
      try {
        const r = await campusAPI.checkPlan(latestPlanMsg.plan!.steps);
        setAlerts(r.alerts || []);
      } catch (_) {}
    }, 20000);
    return () => clearInterval(id);
  }, [latestPlanMsg?.id]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput('');
    setError('');
    const userMsg: Msg = { id: uid(), role: 'user', text: content };
    const history = [...messagesRef.current, userMsg];
    setMessages(history);
    setLoading(true);
    try {
      const payload = history
        .filter((m) => m.id !== 'welcome')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.plan ? `${m.text} ${m.plan.summary}` : m.text }));
      const data = await campusAPI.chat(payload, lang);
      const reply: Msg = { id: uid(), role: 'assistant', text: data.reply, plan: data.plan };
      setMessages((prev) => [...prev, reply]);
      if (data.plan?.steps?.length) {
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 2600);
      }
      if (readAloud || fromVoiceRef.current) speak(data.plan ? `${data.reply} ${data.plan.summary}` : data.reply, lang);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    }
    fromVoiceRef.current = false;
    setLoading(false);
  };

  const book = async (key: string, s: PlanStep) => {
    setBookingKey(key);
    try {
      const r = await bookingAPI.create({ resourceId: s.resourceId, startTime: s.startLabel, endTime: s.endLabel, seats: s.seats, purpose: `Smart Planner: ${s.activity}` });
      setBooked((b) => ({ ...b, [key]: r.booking.bookingCode }));
    } catch (e: any) {
      setError(e.message);
    }
    setBookingKey(null);
  };

  const acceptAlternative = (a: PlanAlert) => {
    if (!latestPlanMsg?.plan || !a.alternative) return;
    const alt = a.alternative;
    const steps = latestPlanMsg.plan.steps.map((s, i) =>
      i === a.stepIndex
        ? { ...s, resourceId: alt.resourceId, resourceName: alt.resourceName, resourceType: alt.resourceType, building: alt.building, predictedPct: alt.predictedPct, bookable: alt.bookable, reason: `Re-planned: ${a.resourceName} got busy (${a.newPredictedPct}%), switched to ${alt.resourceName} (~${alt.predictedPct}%).` }
        : s
    );
    setMessages((prev) => prev.map((m) => (m.id === latestPlanMsg.id ? { ...m, plan: { ...m.plan!, steps } } : m)));
    setAlerts((prev) => prev.filter((x) => x !== a));
  };

  const resetChat = () => {
    stopSpeaking();
    setMessages([welcome]);
    setAlerts([]);
    setBooked({});
    setError('');
  };

  const mood: RobotMood = voice.state === 'listening' ? 'listening'
    : loading || voice.state === 'transcribing' ? 'thinking'
    : celebrate ? 'happy'
    : error || voice.error ? 'sad'
    : 'idle';
  const status = voice.state === 'listening' ? (voice.interim ? `“${voice.interim}”` : 'Listening… go ahead!')
    : voice.state === 'transcribing' ? 'Catching your words…'
    : loading ? 'Thinking… checking live crowds'
    : celebrate ? 'Ta-da! Plan ready 🎉'
    : voice.error || error || 'Online · knows live campus crowds';

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header with Occy */}
      <div className="glass-card rounded-2xl border border-white/10 px-5 pt-3 pb-2 flex items-end gap-4">
        <div className="flex-shrink-0 pt-5"><PlannerRobot mood={mood} size={78} /></div>
        <div className="flex-1 min-w-0 pb-3">
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Sparkles className="text-cyan-400" size={18} /> Smart Planner · chat with Occy</h1>
          <p className={`text-xs mt-1 truncate ${voice.error || error ? 'text-red-400' : 'text-emerald-400'}`} aria-live="polite">● {status}</p>
        </div>
        <button onClick={resetChat} className="mb-3 text-xs text-slate-400 hover:text-white flex items-center gap-1" title="Start a new chat">
          <RotateCcw size={13} /> New chat
        </button>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="glass-card rounded-2xl border border-white/10 p-4 h-[52vh] min-h-[320px] overflow-y-auto space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] ${m.role === 'user' ? 'order-2' : ''}`}>
              {m.role === 'assistant' && <div className="text-[10px] text-cyan-400 font-semibold mb-1 ml-1">🤖 Occy</div>}
              <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-sm'}`}>
                {m.text}
              </div>

              {m.plan && (
                <div className="mt-2 space-y-2">
                  {m.plan.summary && <p className="text-xs text-slate-400 px-1">{m.plan.summary}</p>}
                  {m.plan.skipped?.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs rounded-lg bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-amber-200">
                      <span>{ACTIVITY_ICON[s.activity] ?? '⏸'}</span>
                      <span><b>{s.label}</b> {s.kind === 'shortened' ? s.reason : <>not scheduled — {s.reason}</>}</span>
                    </div>
                  ))}
                  {m.plan.steps.map((s, i) => {
                    const key = `${m.id}:${i}`;
                    return (
                      <div key={key} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-center gap-3">
                        <div className="text-2xl">{ACTIVITY_ICON[s.activity] ?? '📍'}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <Clock size={11} /> {s.start} – {s.end}
                            {s.seats > 1 && <span className="flex items-center gap-1"><Users size={11} /> {s.seats}</span>}
                          </div>
                          <p className="text-sm font-semibold text-white truncate">{s.resourceName}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate"><MapPin size={10} /> {s.building}</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-lg font-bold ${pctColor(s.predictedPct)}`}>{s.predictedPct}%</p>
                          <p className="text-[9px] text-slate-500">forecast</p>
                        </div>
                        {s.bookable ? (
                          booked[key] ? (
                            <span className="text-[11px] text-emerald-400 flex items-center gap-1"><CheckCircle size={13} /> {booked[key]}</span>
                          ) : (
                            <button onClick={() => book(key, s)} disabled={bookingKey === key} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-50">
                              {bookingKey === key ? '…' : 'Book'}
                            </button>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-500 w-12 text-center">walk-in</span>
                        )}
                      </div>
                    );
                  })}
                  {latestPlanMsg?.id === m.id && alerts.map((a) => (
                    <div key={a.stepIndex + a.message} className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2">
                      <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={15} />
                      <p className="flex-1 text-xs text-amber-100">{a.message}{a.alternative && ` ${a.alternative.resourceName} is forecast at ~${a.alternative.predictedPct}%.`}</p>
                      {a.alternative && (
                        <button onClick={() => acceptAlternative(a)} className="px-2.5 py-1 rounded-lg bg-amber-500 text-black text-[11px] font-bold">Switch</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-white/5 border border-white/10 px-4 py-3 flex gap-1.5" aria-label="Occy is typing">
              {[0, 1, 2].map((i) => <span key={i} className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
          </div>
        )}

        {messages.length === 1 && !loading && (
          <div className="flex flex-wrap gap-2 pt-1">
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => send(ex)} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-cyan-500/40 text-left">
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="glass-card rounded-2xl border border-white/10 p-3">
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
          <input
            value={voice.state === 'listening' && voice.interim ? voice.interim : input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message Occy… e.g. “Is the canteen busy?” or “Plan 2 hours of study”"
            maxLength={500}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            type="button"
            onClick={voice.state === 'listening' ? voice.stop : voice.start}
            disabled={!voice.supported || loading || voice.state === 'transcribing'}
            title={voice.supported ? (voice.state === 'listening' ? 'Stop listening' : 'Speak to Occy') : 'Voice input is not supported in this browser'}
            aria-label={voice.state === 'listening' ? 'Stop listening' : 'Speak to Occy'}
            className={`px-4 rounded-xl border flex items-center transition-all disabled:opacity-40 ${voice.state === 'listening' ? 'bg-rose-500 border-rose-400 text-white animate-pulse' : 'bg-white/5 border-white/10 text-slate-200 hover:border-cyan-500/40'}`}
          >
            {voice.state === 'listening' ? <Square size={16} /> : <Mic size={16} />}
          </button>
          <button disabled={loading || !input.trim()} aria-label="Send" className="px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white flex items-center disabled:opacity-50">
            <Send size={16} />
          </button>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 px-1 text-[11px] text-slate-500">
          <span>
            {voice.engine === 'browser' ? '🎙️ Browser voice recognition' : voice.engine === 'whisper' ? '🎙️ Groq Whisper voice' : 'Voice not supported here'}
            {' · '}{({ en: 'English', hi: 'हिन्दी', bn: 'বাংলা', ta: 'தமிழ்', te: 'తెలుగు' } as Record<string, string>)[lang]}{' (Settings → Language)'}
          </span>
          <button type="button" onClick={() => setReadAloud((v) => !v)} className="flex items-center gap-1.5 hover:text-slate-300">
            {readAloud ? <Volume2 size={13} /> : <VolumeX size={13} />} {readAloud ? 'Reading replies aloud' : 'Read replies aloud'}
          </button>
        </div>
      </div>
    </div>
  );
};
