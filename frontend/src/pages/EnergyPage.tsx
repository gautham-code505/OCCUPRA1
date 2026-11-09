import React, { useEffect, useState, useCallback } from 'react';
import { Leaf, Zap, IndianRupee, Cloud, Power, ArrowRight, RefreshCw, Info } from 'lucide-react';
import { campusAPI } from '../services/api';
import { StatCard, LoadingSkeleton } from '../components/ui/CoreComponents';
import { useLiveData } from '../contexts/LiveDataContext';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface EnergyData {
  dayName: string;
  summary: { baselineKwh: number; optimizedKwh: number; savedKwh: number; savedPct: number; savedInr: number; savedCo2Kg: number; monthlySavedInr: number; monthlySavedCo2Kg: number };
  consolidationPlan: { from: string; to: string; people: number; hours: number }[];
  rooms: { id: string; name: string; type: string; kw: number; closedHours: number; savedKwh: number; timeline: { t: string; pct: number; state: 'on' | 'off' | 'closed' }[] }[];
  actionsNow: { action: string; resourceId: string; detail: string }[];
  assumptions: Record<string, any>;
}

const cellColor = (s: { state: string; pct: number }) => {
  if (s.state === 'off') return 'bg-slate-800/60';
  if (s.state === 'closed') return 'bg-emerald-500/70';
  if (s.pct >= 75) return 'bg-red-500/70';
  if (s.pct >= 40) return 'bg-amber-500/60';
  return 'bg-blue-500/50';
};

export const EnergyPage: React.FC = () => {
  const { clock, resources } = useLiveData();
  const [day, setDay] = useState<number | undefined>(undefined);
  const [tariff, setTariff] = useState(9);
  const [data, setData] = useState<EnergyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await campusAPI.getEnergy({ day, tariff }));
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, [day, tariff]);

  useEffect(() => { load(); }, [load]);

  const apply = async (resourceId: string, open: boolean) => {
    setApplying(resourceId);
    try {
      await campusAPI.applyEnergy(resourceId, open);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
    setApplying(null);
  };

  const closedNow = resources.filter((r) => r.isAvailable === false);
  const effectiveDay = day ?? clock?.dow ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Leaf className="text-emerald-400" size={22} /> Energy Optimizer</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Rooms usually run lights and AC for their full opening hours. Using the timetable-aware occupancy forecast, this switches off empty teaching rooms and consolidates under-used study rooms and labs into neighbours with headroom.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 rounded-xl p-1">
            {DAYS.map((d, i) => (
              <button key={d} onClick={() => setDay(i)}
                className={`px-2.5 py-1 text-xs rounded-lg ${effectiveDay === i ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>{d}</button>
            ))}
          </div>
          <label className="text-xs text-slate-400 flex items-center gap-1">
            ₹/kWh
            <input type="number" min={1} max={30} step={0.5} value={tariff} onChange={(e) => setTariff(Number(e.target.value) || 9)}
              className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs" />
          </label>
          <button onClick={load} className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white"><RefreshCw size={14} /></button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {loading && !data && <LoadingSkeleton lines={6} />}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title={`Energy saved (${data.dayName})`} value={`${data.summary.savedKwh} kWh`} subtitle={`${data.summary.savedPct}% of ${data.summary.baselineKwh} kWh baseline`} icon={<Zap size={18} />} accent="green" />
            <StatCard title="Cost saved / day" value={`₹${data.summary.savedInr.toLocaleString('en-IN')}`} subtitle={`₹${data.summary.monthlySavedInr.toLocaleString('en-IN')} / month (22 days)`} icon={<IndianRupee size={18} />} accent="cyan" />
            <StatCard title="CO₂ avoided / day" value={`${data.summary.savedCo2Kg} kg`} subtitle={`${(data.summary.monthlySavedCo2Kg / 1000).toFixed(1)} t / month`} icon={<Cloud size={18} />} accent="purple" />
            <StatCard title="Rooms with savings" value={data.rooms.filter((r) => r.savedKwh > 0).length} subtitle={`of ${data.rooms.length} monitored`} icon={<Power size={18} />} accent="amber" />
          </div>

          {/* Act now */}
          <div className="glass-card rounded-2xl border border-white/10 p-5">
            <h2 className="text-sm font-bold text-white mb-3">Act now (live occupancy)</h2>
            {data.actionsNow.length === 0 && closedNow.length === 0 && (
              <p className="text-sm text-slate-500">No safe savings right now — every open room is in use. Try the demo clock at a quieter time.</p>
            )}
            <div className="space-y-2">
              {data.actionsNow.map((a) => (
                <div key={a.resourceId + a.action} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${a.action === 'SWITCH_OFF' ? 'bg-slate-500/20 text-slate-300' : 'bg-emerald-500/20 text-emerald-300'}`}>{a.action.replace('_', ' ')}</span>
                  <p className="text-sm text-slate-300 flex-1">{a.detail}</p>
                  <button disabled={applying === a.resourceId} onClick={() => apply(a.resourceId, false)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white disabled:opacity-50">Close &amp; notify students</button>
                </div>
              ))}
              {closedNow.map((r) => (
                <div key={r.id} className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">CLOSED</span>
                  <p className="text-sm text-slate-300 flex-1">{r.name} is powered down; the planner and recommendations route students elsewhere.</p>
                  <button disabled={applying === r.id} onClick={() => apply(r.id, true)} className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-slate-200">Reopen</button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Consolidation plan */}
            <div className="glass-card rounded-2xl border border-white/10 p-5">
              <h2 className="text-sm font-bold text-white mb-3">Consolidation plan ({data.dayName})</h2>
              {data.consolidationPlan.length === 0 && <p className="text-sm text-slate-500">No consolidation needed.</p>}
              <div className="space-y-2">
                {data.consolidationPlan.map((m, i) => (
                  <div key={i} className="text-sm bg-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-slate-200">
                      <span className="truncate">{m.from}</span> <ArrowRight size={13} className="text-emerald-400 flex-shrink-0" /> <span className="truncate">{m.to}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{m.hours} h total · up to {m.people} people moved</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="glass-card rounded-2xl border border-white/10 p-5 lg:col-span-2 overflow-x-auto">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="text-sm font-bold text-white">Room schedule 07:00–23:00 (15-min slots)</h2>
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1"><i className="w-3 h-3 rounded-sm bg-emerald-500/70 inline-block" /> powered down</span>
                  <span className="flex items-center gap-1"><i className="w-3 h-3 rounded-sm bg-blue-500/50 inline-block" /> &lt;40%</span>
                  <span className="flex items-center gap-1"><i className="w-3 h-3 rounded-sm bg-amber-500/60 inline-block" /> 40–75%</span>
                  <span className="flex items-center gap-1"><i className="w-3 h-3 rounded-sm bg-red-500/70 inline-block" /> &gt;75%</span>
                  <span className="flex items-center gap-1"><i className="w-3 h-3 rounded-sm bg-slate-800/60 inline-block" /> closed hours</span>
                </div>
              </div>
              <div className="space-y-1 min-w-[640px]">
                {data.rooms.map((r) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <div className="w-44 text-xs text-slate-300 truncate" title={r.name}>{r.name}</div>
                    <div className="flex-1 flex gap-px">
                      {r.timeline.map((s, i) => (
                        <div key={i} className={`h-4 flex-1 rounded-[2px] ${cellColor(s)}`} title={`${s.t} · ${s.state === 'closed' ? 'powered down' : s.state === 'off' ? 'outside opening hours' : `${s.pct}%`}`} />
                      ))}
                    </div>
                    <div className="w-20 text-right text-xs text-emerald-400">{r.savedKwh > 0 ? `−${r.savedKwh} kWh` : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl border border-white/5 p-4 text-xs text-slate-500 flex gap-2">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <p>
              Assumptions: {data.assumptions.baseline}. Tariff ₹{data.assumptions.tariffInrPerKwh}/kWh, grid {data.assumptions.gridKgCo2PerKwh} kg CO₂/kWh,
              load per seat {Object.entries(data.assumptions.kwPerSeat).map(([k, v]) => `${k.toLowerCase().replace('_', ' ')} ${v} kW`).join(', ')}; a powered-down room still draws {data.assumptions.standbyFraction * 100}%.
              Receiving rooms are kept below {data.assumptions.maxReceiverPct}%. {data.assumptions.note}
            </p>
          </div>
        </>
      )}
    </div>
  );
};
