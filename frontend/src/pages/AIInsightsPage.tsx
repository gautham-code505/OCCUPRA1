import React, { useEffect, useState } from 'react';
import { analyticsAPI } from '../services/api';
import { Lightbulb, RefreshCw } from 'lucide-react';
import { LoadingSkeleton } from '../components/ui/CoreComponents';
import { formatTimeAgo } from '../utils/helpers';

const SEVERITY_STYLE: Record<string, string> = {
  WARNING: 'border-amber-500/30 bg-amber-500/8',
  CRITICAL: 'border-red-500/30 bg-red-500/8',
  INFO: 'border-blue-500/20 bg-blue-500/5',
};

const CATEGORY_ICON: Record<string, string> = {
  PEAK_WARNING: '⚠️',
  UTILIZATION: '📊',
  RECOMMENDATION: '💡',
  ANOMALY: '🔍',
};

const CATEGORY_BADGE: Record<string, string> = {
  PEAK_WARNING: 'bg-red-500/15 text-red-400',
  UTILIZATION: 'bg-blue-500/15 text-blue-400',
  RECOMMENDATION: 'bg-purple-500/15 text-purple-400',
  ANOMALY: 'bg-amber-500/15 text-amber-400',
};

export const AIInsightsPage: React.FC = () => {
  const [insights, setInsights] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const d = await analyticsAPI.getInsights();
      setInsights(d.insights ?? []);
    } catch (_) {}
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Lightbulb size={20} className="text-amber-400" />
            AI Campus Insights
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Dynamically generated from live IoT data and occupancy patterns
          </p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300 hover:bg-white/10 transition-all">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl border border-white/5 p-6">
              <LoadingSkeleton lines={3} />
            </div>
          ))}
        </div>
      ) : insights.length === 0 ? (
        <div className="glass-card rounded-2xl border border-white/5 p-12 text-center">
          <Lightbulb size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No AI insights available. Insights are generated from live campus data.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((ins: any) => (
            <div key={ins.id}
              className={`glass-card rounded-2xl border p-5 transition-all ${SEVERITY_STYLE[ins.severity] ?? 'border-white/8'}`}>
              <div className="flex items-start gap-4">
                <span className="text-3xl mt-1 flex-shrink-0">
                  {CATEGORY_ICON[ins.category] ?? '📌'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-base font-bold text-white">{ins.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${CATEGORY_BADGE[ins.category] ?? 'bg-slate-500/15 text-slate-400'}`}>
                      {ins.category?.replace('_', ' ')}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                      ins.severity === 'WARNING' ? 'border-amber-500/40 text-amber-400'
                        : ins.severity === 'CRITICAL' ? 'border-red-500/40 text-red-400'
                        : 'border-slate-500/30 text-slate-400'
                    }`}>
                      {ins.severity}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{ins.description}</p>
                  <div className="flex items-center gap-4 mt-3">
                    {ins.resource?.name && (
                      <span className="text-xs text-blue-400">📍 {ins.resource.name}</span>
                    )}
                    <span className="text-xs text-slate-600">{formatTimeAgo(ins.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
