import React, { useState } from 'react';
import { Clock, FastForward, RotateCcw, Play } from 'lucide-react';
import { campusAPI } from '../../services/api';
import { useLiveData } from '../../contexts/LiveDataContext';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRESETS = [
  { label: 'Mon 12:20 · lunch rush', day: 1, time: '12:20' },
  { label: 'Tue 10:40 · class change', day: 2, time: '10:40' },
  { label: 'Thu 15:30 · afternoon labs', day: 4, time: '15:30' },
];

/** Admin control for the simulated campus clock, so any scenario can be demoed at any hour. */
export const DemoClockCard: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { clock } = useLiveData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [day, setDay] = useState(1);
  const [time, setTime] = useState('12:20');

  const run = async (body: Parameters<typeof campusAPI.setClock>[0]) => {
    setBusy(true);
    setError('');
    try {
      await campusAPI.setClock(body);
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  };

  const hhmm = clock ? `${String(Math.floor(clock.minuteOfDay / 60)).padStart(2, '0')}:${String(clock.minuteOfDay % 60).padStart(2, '0')}` : '--:--';

  return (
    <div className="glass-card rounded-2xl border border-amber-500/20 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-amber-400" />
          <h3 className="text-sm font-bold text-white">Demo Clock</h3>
        </div>
        <span className="font-mono text-sm text-amber-300">
          {clock ? `${DAYS[clock.dow]} ${hhmm}` : '…'}
          {clock && clock.rate !== 1 && <span className="text-amber-500/70"> ×{clock.rate}</span>}
          <span className="ml-2 text-[10px] uppercase text-slate-500">{clock?.mode === 'demo' ? 'simulated' : 'real time'}</span>
        </span>
      </div>
      {!compact && (
        <p className="text-xs text-slate-500 mb-3">
          Jump to any weekday and time so timetable effects (lunch rush, class changes) can be shown at any hour. Everything uses this clock: forecasts, nudges, planner, energy.
        </p>
      )}
      <div className="flex flex-wrap gap-2 mb-3">
        {PRESETS.map((p) => (
          <button key={p.label} disabled={busy} onClick={() => run({ day: p.day, time: p.time, rate: 10 })}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all">
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={day} onChange={(e) => setDay(Number(e.target.value))}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white">
          {DAYS.map((d, i) => <option key={d} value={i} className="bg-slate-900">{d}</option>)}
        </select>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white" />
        <button disabled={busy} onClick={() => run({ day, time })}
          className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/30 flex items-center gap-1">
          <Play size={12} /> Jump
        </button>
        {[1, 10, 30].map((r) => (
          <button key={r} disabled={busy} onClick={() => run({ rate: r })}
            className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1 ${clock?.rate === r ? 'bg-amber-500/25 border-amber-500/40 text-amber-200' : 'bg-white/5 border-white/10 text-slate-400'}`}>
            <FastForward size={11} /> ×{r}
          </button>
        ))}
        <button disabled={busy} onClick={() => run({ mode: 'real' })}
          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 flex items-center gap-1 ml-auto">
          <RotateCcw size={12} /> Real time
        </button>
      </div>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
};
