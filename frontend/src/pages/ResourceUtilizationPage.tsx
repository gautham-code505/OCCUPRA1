import React, { useEffect, useState } from 'react';
import { analyticsAPI } from '../services/api';
import { Zap, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { LoadingSkeleton, OccupancyGauge } from '../components/ui/CoreComponents';
import { getResourceTypeIcon } from '../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const ResourceUtilizationPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    analyticsAPI.getUtilization()
      .then(d => { setData(d); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, []);

  const getBarColor = (pct: number) =>
    pct > 70 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#10b981';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap size={20} className="text-amber-400" />
          Resource Utilization Analysis
        </h1>
        <p className="text-slate-400 text-sm mt-1">Identify over and under-utilized campus resources</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="glass-card rounded-2xl border border-white/5 p-6 h-32"><LoadingSkeleton lines={2} /></div>)}
        </div>
      ) : (
        <>
          {/* Optimization insight banner */}
          {data?.optimizationInsight && (
            <div className="glass-card rounded-xl border border-amber-500/25 bg-amber-500/8 p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-300">AI Optimization Recommendation</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{data.optimizationInsight}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most utilized */}
            <div className="glass-card rounded-2xl border border-white/5 p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-red-400" /> Most Utilized Resources
              </h3>
              <div className="space-y-3">
                {(data?.mostUtilized ?? []).map((r: any, i: number) => (
                  <div key={r.id} className="flex items-center gap-4">
                    <span className="text-slate-500 text-sm w-4">#{i + 1}</span>
                    <span className="text-lg">{getResourceTypeIcon(r.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{r.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-white/5 rounded-full">
                          <div className="h-full rounded-full bg-red-500 transition-all duration-700"
                            style={{ width: `${r.occupancyPercent}%` }} />
                        </div>
                        <span className="text-xs font-bold text-red-400 w-10 text-right">{Math.round(r.occupancyPercent)}%</span>
                      </div>
                    </div>
                    <OccupancyGauge percent={r.occupancyPercent} size="sm" />
                  </div>
                ))}
              </div>
            </div>

            {/* Least utilized */}
            <div className="glass-card rounded-2xl border border-white/5 p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingDown size={14} className="text-emerald-400" /> Least Utilized (Potential)
              </h3>
              <div className="space-y-3">
                {(data?.leastUtilized ?? []).map((r: any, i: number) => (
                  <div key={r.id} className="flex items-center gap-4">
                    <span className="text-slate-500 text-sm w-4">#{i + 1}</span>
                    <span className="text-lg">{getResourceTypeIcon(r.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{r.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-white/5 rounded-full">
                          <div className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                            style={{ width: `${r.occupancyPercent}%` }} />
                        </div>
                        <span className="text-xs font-bold text-emerald-400 w-10 text-right">{Math.round(r.occupancyPercent)}%</span>
                      </div>
                    </div>
                    <OccupancyGauge percent={r.occupancyPercent} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Full comparison bar chart */}
          <div className="glass-card rounded-2xl border border-white/5 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">All Resources — Occupancy Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.comparison ?? []} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={150} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0d1527', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 12 }}
                  formatter={(v: any) => [`${Math.round(v)}%`, 'Occupancy']}
                />
                <Bar dataKey="occupancyPercent" radius={[0, 6, 6, 0]}>
                  {(data?.comparison ?? []).map((r: any, i: number) => (
                    <Cell key={i} fill={getBarColor(r.occupancyPercent)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category breakdown */}
          {data?.categoryUtilization && (
            <div className="glass-card rounded-2xl border border-white/5 p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Utilization by Category</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {data.categoryUtilization.map((cat: any) => (
                  <div key={cat.category} className="bg-white/4 rounded-xl p-4 text-center border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{cat.category.replace('_', ' ')}</p>
                    <p className={`text-2xl font-bold mb-1 ${cat.occupancyPercent > 70 ? 'text-red-400' : cat.occupancyPercent > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {Math.round(cat.occupancyPercent)}%
                    </p>
                    <p className="text-[10px] text-slate-600">{cat.resourceCount} resource{cat.resourceCount !== 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
