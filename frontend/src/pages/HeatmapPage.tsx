import React, { useState } from 'react';
import { useLiveData } from '../contexts/LiveDataContext';
import { Activity, AlertTriangle } from 'lucide-react';
import { LiveBadge } from '../components/ui/CoreComponents';
import { getCrowdGlow, getResourceTypeIcon, getResourceTypeLabel } from '../utils/helpers';

const FILTER_TYPES = ['ALL', 'LIBRARY', 'COMPUTER_LAB', 'STUDY_ROOM', 'CANTEEN', 'SEMINAR_HALL', 'CLASSROOM', 'RESEARCH_LAB', 'ACTIVITY_CENTER'];

export const HeatmapPage: React.FC = () => {
  const { resources, lastUpdate } = useLiveData();
  const [filter, setFilter] = useState('ALL');

  const filtered = resources.filter(r => filter === 'ALL' || r.type === filter);

  const getHeatColor = (pct: number): string => {
    if (pct > 70) return 'rgba(239,68,68,';
    if (pct > 40) return 'rgba(245,158,11,';
    return 'rgba(16,185,129,';
  };

  const campusAvg = resources.length > 0
    ? Math.round(resources.reduce((a, r) => a + r.occupancyPercent, 0) / resources.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity size={20} className="text-cyan-400" />
            Campus Crowd Heatmap
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time occupancy intensity across all campus zones
            {lastUpdate && ` · Updated ${Math.round((Date.now() - lastUpdate.getTime()) / 1000)}s ago`}
          </p>
        </div>
        <LiveBadge />
      </div>

      {/* Filter + Legend */}
      <div className="glass-card rounded-2xl border border-white/5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2 flex-1">
            {FILTER_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  filter === t
                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {t === 'ALL' ? 'All Resources' : `${getResourceTypeIcon(t)} ${getResourceTypeLabel(t)}`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6 mt-3 pt-3 border-t border-white/5">
          <span className="text-xs text-slate-400 font-medium">Crowd intensity:</span>
          {[
            { color: 'bg-emerald-500', label: 'Quiet (0-40%)' },
            { color: 'bg-amber-500', label: 'Moderate (41-70%)' },
            { color: 'bg-red-500', label: 'Crowded (71-100%)' },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-2 text-xs text-slate-400">
              <span className={`w-3 h-3 rounded ${l.color}`} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Campus-wide summary bar */}
      <div className="glass-card rounded-2xl border border-white/5 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Campus-Wide Occupancy</h3>
          <span className={`text-xl font-bold ${campusAvg > 70 ? 'text-red-400' : campusAvg > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {campusAvg}%
          </span>
        </div>
        <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${campusAvg > 70 ? 'bg-gradient-to-r from-amber-500 to-red-500' : campusAvg > 40 ? 'bg-gradient-to-r from-emerald-500 to-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${campusAvg}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map(r => {
          const pct = r.occupancyPercent;
          const baseColor = getHeatColor(pct);
          const alpha = 0.15 + (pct / 100) * 0.55;

          return (
            <div
              key={r.id}
              className="rounded-2xl border transition-all duration-700 hover:scale-105 cursor-pointer overflow-hidden"
              style={{
                background: `${baseColor}${alpha.toFixed(2)})`,
                borderColor: `${baseColor}0.4)`,
              }}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{getResourceTypeIcon(r.type)}</span>
                  <span
                    className="text-xl font-black"
                    style={{ color: getCrowdGlow(r.currentCrowdStatus) }}
                  >
                    {Math.round(pct)}%
                  </span>
                </div>

                <h3 className="text-xs font-semibold text-white leading-tight mb-1">{r.name}</h3>
                <p className="text-[10px] text-slate-400 mb-3">{r.building}</p>

                {/* Intensity bar */}
                <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: getCrowdGlow(r.currentCrowdStatus),
                    }}
                  />
                </div>

                <div className="flex justify-between items-center mt-2">
                  <span className="text-[10px] text-slate-400">{r.currentOccupancy}/{r.capacity}</span>
                  <span className="text-[10px]" style={{ color: getCrowdGlow(r.currentCrowdStatus) }}>
                    {r.currentCrowdStatus}
                  </span>
                </div>
              </div>

              {/* Alert strip for crowded */}
              {r.currentCrowdStatus === 'CROWDED' && (
                <div className="bg-red-500/20 border-t border-red-500/30 px-3 py-1.5 flex items-center gap-1.5">
                  <AlertTriangle size={10} className="text-red-400" />
                  <span className="text-[9px] text-red-300 font-medium">HIGH OCCUPANCY</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Activity size={40} className="mx-auto mb-3 opacity-40" />
          <p>No resources match the selected filter.</p>
        </div>
      )}
    </div>
  );
};
