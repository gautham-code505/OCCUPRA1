import React, { useEffect, useState } from 'react';
import { FlaskConical, Play, TrendingDown, TrendingUp, CalendarDays } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { campusAPI } from '../services/api';
import { useLiveData } from '../contexts/LiveDataContext';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];

type ScenarioType = 'shift_slot' | 'stagger' | 'attendance';

interface ResourceResult {
  id: string; name: string; type: string;
  baseline: { peakPct: number; peakTime: string; minutesOver85: number };
  scenario: { peakPct: number; peakTime: string; minutesOver85: number };
  peakChange: number; overcrowdChange: number;
  baselineSeries: number[]; scenarioSeries: number[];
}
interface Result {
  times: string[];
  movedSessions: number;
  campus: { overcrowdedRoomMinutesBefore: number; overcrowdedRoomMinutesAfter: number; change: number };
  resources: ResourceResult[];
}

export const WhatIfPage: React.FC = () => {
  const { clock } = useLiveData();
  const [day, setDay] = useState<number>(clock?.dow && clock.dow >= 1 && clock.dow <= 5 ? clock.dow : 1);
  const [type, setType] = useState<ScenarioType>('shift_slot');
  const [slot, setSlot] = useState('12:00');
  const [minutes, setMinutes] = useState(30);
  const [factor, setFactor] = useState(1.2);
  const [result, setResult] = useState<Result | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState<number | null>(null);

  useEffect(() => {
    campusAPI.getTimetable(day).then((t) => setSessions(t.sessions.length)).catch(() => setSessions(null));
  }, [day]);

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const r: Result = await campusAPI.whatIf({ type, day, slotStart: slot, minutes, factor });
      setResult(r);
      setSelected(r.resources[0]?.id ?? null);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const sel = result?.resources.find((r) => r.id === selected);
  const chart = result && sel ? result.times.map((t, i) => ({ t, baseline: sel.baselineSeries[i], scenario: sel.scenarioSeries[i] })) : [];

  const describe = () => {
    if (type === 'shift_slot') return `Move every class that starts at ${slot} by ${minutes >= 0 ? '+' : ''}${minutes} min`;
    if (type === 'stagger') return `Stagger: every other department starts ${minutes >= 0 ? '+' : ''}${minutes} min later all day`;
    return `Attendance at ${Math.round(factor * 100)}% of normal (e.g. exam week)`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><FlaskConical className="text-violet-400" size={22} /> What-If Simulator</h1>
        <p className="text-slate-400 text-sm mt-1 max-w-3xl">
          Change the timetable and see how crowds move before you change anything on campus. The same crowd model that drives the live digital twin and trains the forecaster replays the whole day.
        </p>
      </div>

      <div className="glass-card rounded-2xl border border-white/10 p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <CalendarDays size={16} className="text-slate-400" />
          <div className="flex bg-white/5 rounded-xl p-1">
            {DAYS.slice(1, 6).map((d, i) => (
              <button key={d} onClick={() => setDay(i + 1)} className={`px-3 py-1 text-xs rounded-lg ${day === i + 1 ? 'bg-violet-600 text-white' : 'text-slate-400'}`}>{d}</button>
            ))}
          </div>
          {sessions !== null && <span className="text-xs text-slate-500">{sessions} classes in the timetable</span>}
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          {([
            ['shift_slot', 'Shift a class slot', 'e.g. move the 12:00 classes 30 min later'],
            ['stagger', 'Stagger departments', 'half the departments start later'],
            ['attendance', 'Attendance swing', 'exam week, festival, rain'],
          ] as [ScenarioType, string, string][]).map(([id, label, hint]) => (
            <button key={id} onClick={() => setType(id)}
              className={`text-left rounded-xl border p-3 transition-all ${type === id ? 'border-violet-500/50 bg-violet-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="text-xs text-slate-500">{hint}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {type === 'shift_slot' && (
            <label className="text-xs text-slate-400 flex items-center gap-2">Slot
              <select value={slot} onChange={(e) => setSlot(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs">
                {SLOTS.map((s) => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
              </select>
            </label>
          )}
          {type !== 'attendance' ? (
            <label className="text-xs text-slate-400 flex items-center gap-2">Shift
              <input type="range" min={-30} max={60} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
              <span className="font-mono text-white w-14">{minutes >= 0 ? '+' : ''}{minutes} min</span>
            </label>
          ) : (
            <label className="text-xs text-slate-400 flex items-center gap-2">Attendance
              <input type="range" min={0.5} max={1.4} step={0.05} value={factor} onChange={(e) => setFactor(Number(e.target.value))} />
              <span className="font-mono text-white w-12">{Math.round(factor * 100)}%</span>
            </label>
          )}
          <button onClick={run} disabled={loading} className="ml-auto px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
            <Play size={14} /> {loading ? 'Simulating…' : 'Run scenario'}
          </button>
        </div>
        <p className="text-xs text-slate-500">{describe()}</p>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {result && (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="glass-card rounded-2xl border border-white/10 p-5">
              <p className="text-xs text-slate-400 uppercase tracking-widest">Overcrowded room-minutes (≥85%)</p>
              <p className="text-2xl font-bold text-white mt-1">{result.campus.overcrowdedRoomMinutesBefore} → {result.campus.overcrowdedRoomMinutesAfter}</p>
              <p className={`text-sm mt-1 flex items-center gap-1 ${result.campus.change <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.campus.change <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                {result.campus.change <= 0 ? `${Math.abs(result.campus.change)} fewer` : `${result.campus.change} more`} overcrowded minutes
              </p>
            </div>
            <div className="glass-card rounded-2xl border border-white/10 p-5">
              <p className="text-xs text-slate-400 uppercase tracking-widest">Classes moved</p>
              <p className="text-2xl font-bold text-white mt-1">{result.movedSessions}</p>
              <p className="text-sm text-slate-500 mt-1">on {DAYS[day]}</p>
            </div>
            <div className="glass-card rounded-2xl border border-white/10 p-5">
              <p className="text-xs text-slate-400 uppercase tracking-widest">Biggest effect</p>
              {result.resources[0] && (
                <>
                  <p className="text-lg font-bold text-white mt-1 truncate">{result.resources[0].name}</p>
                  <p className="text-sm text-slate-400">peak {result.resources[0].baseline.peakPct}% → {result.resources[0].scenario.peakPct}% ({result.resources[0].peakChange > 0 ? '+' : ''}{result.resources[0].peakChange})</p>
                </>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            <div className="glass-card rounded-2xl border border-white/10 p-5 lg:col-span-3">
              <h2 className="text-sm font-bold text-white mb-3">{sel?.name ?? 'Select a space'} — expected occupancy</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="t" stroke="#64748b" fontSize={11} interval={11} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} unit="%" />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine y={85} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'overcrowded', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />
                    <Line type="monotone" dataKey="baseline" name="Current timetable" stroke="#64748b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="scenario" name="Scenario" stroke="#a78bfa" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass-card rounded-2xl border border-white/10 p-5 lg:col-span-2 overflow-y-auto max-h-[22rem]">
              <h2 className="text-sm font-bold text-white mb-3">Impact by space</h2>
              <div className="space-y-1">
                {result.resources.map((r) => (
                  <button key={r.id} onClick={() => setSelected(r.id)}
                    className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-lg text-sm ${selected === r.id ? 'bg-violet-500/15 border border-violet-500/30' : 'hover:bg-white/5'}`}>
                    <span className="text-slate-300 truncate">{r.name}</span>
                    <span className="text-xs font-mono whitespace-nowrap">
                      <span className="text-slate-500">{r.baseline.peakPct}→</span>
                      <span className="text-white">{r.scenario.peakPct}%</span>
                      <span className={`ml-2 ${r.peakChange < 0 ? 'text-emerald-400' : r.peakChange > 0 ? 'text-red-400' : 'text-slate-500'}`}>{r.peakChange > 0 ? '+' : ''}{r.peakChange}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
