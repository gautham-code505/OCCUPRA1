import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, MapPin, Clock, CheckCircle, AlertTriangle, RefreshCw, Users, Cpu } from 'lucide-react';
import { campusAPI, bookingAPI } from '../services/api';
import { useLiveData } from '../contexts/LiveDataContext';

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

interface PlanAlert {
  stepIndex: number;
  resourceName: string;
  oldPredictedPct: number;
  newPredictedPct: number;
  message: string;
  alternative: { resourceId: string; resourceName: string; resourceType: string; building: string; predictedPct: number; bookable: boolean } | null;
}

const EXAMPLES = [
  'I have 3 free hours: study for my DBMS exam, eat something, and print my notes. Somewhere quiet please.',
  'Need a computer lab for 2 hours of coding, then lunch',
  'Group project meeting with 3 friends for an hour, then coffee',
];

const ACTIVITY_ICON: Record<string, string> = {
  study: '📚', group_study: '👥', computer: '💻', print: '🖨️', research: '🧪', food: '🍽️', relax: '🎮',
};

const pctColor = (p: number) => (p >= 75 ? 'text-red-400' : p >= 45 ? 'text-amber-400' : 'text-emerald-400');

export const SmartPlannerPage: React.FC = () => {
  const { clock } = useLiveData();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<{ steps: PlanStep[]; summary: string; llmUsed: boolean; reordered: boolean } | null>(null);
  const [alerts, setAlerts] = useState<PlanAlert[]>([]);
  const [booked, setBooked] = useState<Record<number, string>>({});
  const [bookingStep, setBookingStep] = useState<number | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const planRef = useRef<PlanStep[] | null>(null);

  const submit = async (text?: string) => {
    const msg = (text ?? message).trim();
    if (!msg) return;
    setMessage(msg);
    setLoading(true);
    setError('');
    setAlerts([]);
    setBooked({});
    try {
      const data = await campusAPI.plan(msg);
      setPlan(data);
      planRef.current = data.steps;
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  // Watch the active plan: re-check against fresh forecasts every 20s
  useEffect(() => {
    if (!plan?.steps.length) return;
    const check = async () => {
      if (!planRef.current) return;
      try {
        const r = await campusAPI.checkPlan(planRef.current);
        setAlerts(r.alerts || []);
        setLastCheck(new Date());
      } catch (_) {}
    };
    const id = setInterval(check, 20000);
    return () => clearInterval(id);
  }, [plan]);

  const acceptAlternative = (a: PlanAlert) => {
    if (!plan || !a.alternative) return;
    const steps = plan.steps.map((s, i) =>
      i === a.stepIndex
        ? { ...s, resourceId: a.alternative!.resourceId, resourceName: a.alternative!.resourceName, resourceType: a.alternative!.resourceType, building: a.alternative!.building, predictedPct: a.alternative!.predictedPct, bookable: a.alternative!.bookable, reason: `Re-planned: ${a.resourceName} got busy (${a.newPredictedPct}%), switched to ${a.alternative!.resourceName} (~${a.alternative!.predictedPct}%).` }
        : s
    );
    setPlan({ ...plan, steps });
    planRef.current = steps;
    setAlerts((prev) => prev.filter((x) => x !== a));
    setBooked((b) => { const n = { ...b }; delete n[a.stepIndex]; return n; });
  };

  const book = async (i: number, s: PlanStep) => {
    setBookingStep(i);
    try {
      const r = await bookingAPI.create({ resourceId: s.resourceId, startTime: s.startLabel, endTime: s.endLabel, seats: s.seats, purpose: `Smart Planner: ${s.activity}` });
      setBooked((b) => ({ ...b, [i]: r.booking.bookingCode }));
    } catch (e: any) {
      setError(e.message);
    }
    setBookingStep(null);
  };

  const now = clock ? `${String(Math.floor(clock.minuteOfDay / 60)).padStart(2, '0')}:${String(clock.minuteOfDay % 60).padStart(2, '0')}` : '';

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="text-cyan-400" size={22} /> Smart Planner
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Tell it what you need to get done. It plans where and when, using live occupancy and the timetable-aware crowd forecast, then keeps watching and re-plans if a spot gets crowded.
        </p>
      </div>

      <div className="glass-card rounded-2xl border border-white/10 p-5">
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex gap-3">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. I have 2 hours: study, then lunch"
            maxLength={500}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
          />
          <button disabled={loading || !message.trim()} className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />} Plan
          </button>
        </form>
        <div className="flex flex-wrap gap-2 mt-3">
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => submit(ex)} disabled={loading}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-cyan-500/30 text-left">
              {ex}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
      </div>

      {plan && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-blue-600/5 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Your plan {now && `· planned at ${now}`}</span>
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Cpu size={11} /> {plan.llmUsed ? 'Groq LLM for language · forecast engine for decisions' : 'Offline parser · forecast engine for decisions'}
              </span>
            </div>
            <p className="text-slate-200 text-sm leading-relaxed">{plan.summary}</p>
          </div>

          {alerts.map((a) => (
            <div key={a.stepIndex + a.message} className="glass-card rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
              <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <p className="text-sm text-amber-100 font-semibold">Re-plan suggested</p>
                <p className="text-sm text-amber-200/80">{a.message}{a.alternative && ` ${a.alternative.resourceName} is forecast at ~${a.alternative.predictedPct}%.`}</p>
              </div>
              {a.alternative && (
                <button onClick={() => acceptAlternative(a)} className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold">
                  Switch to {a.alternative.resourceName}
                </button>
              )}
            </div>
          ))}

          <div className="space-y-3">
            {plan.steps.map((s, i) => (
              <div key={i} className="glass-card rounded-2xl border border-white/10 p-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-3xl">{ACTIVITY_ICON[s.activity] ?? '📍'}</div>
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                      <Clock size={12} /> {s.start} – {s.end}
                      {s.seats > 1 && <span className="flex items-center gap-1"><Users size={12} /> {s.seats}</span>}
                    </div>
                    <h3 className="text-white font-bold">{s.resourceName}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={11} /> {s.building}</p>
                    <p className="text-xs text-slate-400 mt-1.5">{s.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${pctColor(s.predictedPct)}`}>{s.predictedPct}%</p>
                    <p className="text-[10px] text-slate-500">forecast</p>
                  </div>
                  {s.bookable ? (
                    booked[i] ? (
                      <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle size={14} /> {booked[i]}</span>
                    ) : (
                      <button onClick={() => book(i, s)} disabled={bookingStep === i}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold disabled:opacity-50">
                        {bookingStep === i ? 'Booking…' : 'Book seat'}
                      </button>
                    )
                  ) : (
                    <span className="text-[11px] text-slate-500 w-20 text-center">walk-in</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-600">
            Watching this plan — re-checked every 20s against the latest forecast{lastCheck ? ` (last check ${lastCheck.toLocaleTimeString()})` : ''}. Nothing is booked unless you press "Book seat".
          </p>
        </div>
      )}
    </div>
  );
};
