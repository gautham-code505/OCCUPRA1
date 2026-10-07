import React, { useEffect, useState } from 'react';
import { analyticsAPI } from '../services/api';
import { BarChart3, TrendingUp } from 'lucide-react';
import { LoadingSkeleton, LiveBadge } from '../components/ui/CoreComponents';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadialBarChart, RadialBar, Cell
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444'];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card border border-white/15 rounded-xl p-3 text-xs space-y-1">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}{typeof p.value === 'number' && p.value <= 100 ? '%' : ''}</p>
      ))}
    </div>
  );
};

export const CrowdAnalyticsPage: React.FC = () => {
  const [trends, setTrends] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    analyticsAPI.getTrends().then(d => { setTrends(d); setIsLoading(false); }).catch(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-400" />
            Crowd Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-1">Occupancy patterns, peak windows, and weekly distribution</p>
        </div>
        <LiveBadge />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl border border-white/5 p-6 h-64"><LoadingSkeleton lines={3} /></div>
          ))}
        </div>
      ) : (
        <>
          {/* Hourly trend – area chart */}
          <div className="glass-card rounded-2xl border border-white/5 p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-blue-400" /> Hourly Campus Occupancy (Today)
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trends?.hourlyTrends ?? []}>
                <defs>
                  {[
                    { id: 'campus', color: '#3b82f6' },
                    { id: 'library', color: '#10b981' },
                    { id: 'labs', color: '#f59e0b' },
                    { id: 'study', color: '#8b5cf6' },
                  ].map(({ id, color }) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }} />
                <Area type="monotone" dataKey="occupancy" name="Campus Avg" stroke="#3b82f6" fill="url(#campus)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="library" name="Libraries" stroke="#10b981" fill="url(#library)" strokeWidth={1.5} dot={false} />
                <Area type="monotone" dataKey="labs" name="Labs" stroke="#f59e0b" fill="url(#labs)" strokeWidth={1.5} dot={false} />
                <Area type="monotone" dataKey="study" name="Study Rooms" stroke="#8b5cf6" fill="url(#study)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly bar chart */}
            <div className="glass-card rounded-2xl border border-white/5 p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Weekly Average Occupancy</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trends?.weeklyTrends ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="avgOccupancy" name="Avg Occupancy" radius={[6, 6, 0, 0]}>
                    {(trends?.weeklyTrends ?? []).map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Peak windows */}
            <div className="glass-card rounded-2xl border border-white/5 p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Peak Activity Windows</h3>
              <div className="space-y-3">
                {(trends?.peakWindows ?? []).map((pw: any, i: number) => (
                  <div key={i} className={`p-4 rounded-xl border ${pw.intensity === 'CRITICAL' ? 'bg-red-500/10 border-red-500/20' : pw.intensity === 'HIGH' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-white">{pw.label}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pw.intensity === 'CRITICAL' ? 'text-red-400' : pw.intensity === 'HIGH' ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {pw.intensity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{pw.window}</p>
                  </div>
                ))}
              </div>

              {/* Weekly stats table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-white/5">
                      <th className="text-left pb-2">Day</th>
                      <th className="text-right pb-2">Avg %</th>
                      <th className="text-right pb-2">Peak Hour</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(trends?.weeklyTrends ?? []).map((w: any) => (
                      <tr key={w.day} className="text-slate-300">
                        <td className="py-2 font-medium">{w.day}</td>
                        <td className={`text-right py-2 font-bold ${w.avgOccupancy > 70 ? 'text-red-400' : w.avgOccupancy > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {w.avgOccupancy}%
                        </td>
                        <td className="text-right py-2 text-slate-500">{w.peakHour}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
