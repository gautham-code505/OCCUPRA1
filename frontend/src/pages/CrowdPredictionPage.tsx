import React, { useState, useEffect } from 'react';
import { useLiveData } from '../contexts/LiveDataContext';
import { predictionAPI } from '../services/api';
import { Resource, ResourceForecast } from '../types';
import { CrowdBadge, LiveBadge, LoadingSkeleton, OccupancyGauge } from '../components/ui/CoreComponents';
import { getResourceTypeIcon, getResourceTypeLabel } from '../utils/helpers';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Brain, ChevronRight } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card border border-white/15 rounded-xl p-3 text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-white font-bold">{payload[0].value.toFixed(1)}% predicted</p>
    </div>
  );
};

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'INCREASING') return <TrendingUp size={14} className="text-red-400" />;
  if (trend === 'DECREASING') return <TrendingDown size={14} className="text-emerald-400" />;
  return <Minus size={14} className="text-slate-400" />;
};

export const CrowdPredictionPage: React.FC = () => {
  const { resources } = useLiveData();
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [forecast, setForecast] = useState<ResourceForecast | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (resources.length > 0 && !selectedResource) {
      setSelectedResource(resources[0]);
    }
  }, [resources]);

  useEffect(() => {
    if (!selectedResource) return;
    setIsLoading(true);
    predictionAPI.getForResource(selectedResource.id)
      .then(data => { setForecast(data); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, [selectedResource]);

  const filteredResources = resources.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const chartData = forecast ? [
    { time: 'Now', pct: forecast.currentOccupancyPercent },
    ...(forecast.predictions || []).map(p => ({
      time: p.timeOffsetMinutes === 30 ? '+30m' : p.timeOffsetMinutes === 60 ? '+1h' : p.timeOffsetMinutes === 120 ? '+2h' : '+4h',
      pct: p.predictedPercent,
    })),
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Brain size={20} className="text-purple-400" />
            AI Crowd Prediction
          </h1>
          <p className="text-slate-400 text-sm mt-1">ML-powered multi-horizon occupancy forecasting</p>
        </div>
        <LiveBadge />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Resource List */}
        <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <input
              type="text"
              placeholder="Search resources…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {filteredResources.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedResource(r)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 ${selectedResource?.id === r.id ? 'bg-blue-600/10 border-l-2 border-l-blue-500' : ''}`}
              >
                <span className="text-xl flex-shrink-0">{getResourceTypeIcon(r.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{r.name}</p>
                  <p className="text-xs text-slate-500">{getResourceTypeLabel(r.type)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs font-bold ${r.occupancyPercent > 70 ? 'text-red-400' : r.occupancyPercent > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {Math.round(r.occupancyPercent)}%
                  </span>
                  <ChevronRight size={12} className="text-slate-600" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Forecast Detail */}
        <div className="xl:col-span-2 space-y-5">
          {isLoading ? (
            <div className="glass-card rounded-2xl border border-white/5 p-8">
              <LoadingSkeleton lines={4} />
            </div>
          ) : selectedResource && forecast ? (
            <>
              {/* Resource header */}
              <div className="glass-card rounded-2xl border border-white/5 p-5 bg-gradient-to-r from-purple-600/10 to-blue-600/10">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{getResourceTypeIcon(selectedResource.type)}</span>
                      <div>
                        <h2 className="text-lg font-bold text-white">{selectedResource.name}</h2>
                        <p className="text-xs text-slate-400">{selectedResource.building}</p>
                      </div>
                    </div>
                    <CrowdBadge status={selectedResource.currentCrowdStatus} />
                  </div>
                  <OccupancyGauge percent={selectedResource.occupancyPercent} size="lg" />
                </div>

                {/* Interpretation */}
                <div className={`mt-4 p-3 rounded-xl text-sm ${forecast.overallTrend === 'INCREASING' ? 'bg-red-500/10 border border-red-500/20 text-red-300' : forecast.overallTrend === 'DECREASING' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-slate-500/10 border border-slate-500/20 text-slate-300'}`}>
                  <div className="flex items-center gap-2">
                    <TrendIcon trend={forecast.overallTrend} />
                    {forecast.interpretation}
                  </div>
                </div>
              </div>

              {/* Prediction horizon cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {forecast.predictions.map(pred => (
                  <div key={pred.horizon} className="glass-card rounded-xl border border-white/5 p-4 text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">+{pred.horizon}</p>
                    <p className={`text-2xl font-bold mb-1 ${pred.predictedPercent > 70 ? 'text-red-400' : pred.predictedPercent > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {pred.predictedPercent.toFixed(0)}%
                    </p>
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <TrendIcon trend={pred.trend} />
                      <span className="text-[10px] text-slate-500 capitalize">{pred.trend.toLowerCase()}</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5">
                      <div
                        className={`h-full rounded-full ${pred.predictedPercent > 70 ? 'bg-red-500' : pred.predictedPercent > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${pred.predictedPercent}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-slate-600 mt-1.5">{Math.round(pred.confidence * 100)}% confidence</p>
                  </div>
                ))}
              </div>

              {/* Prediction Chart */}
              <div className="glass-card rounded-2xl border border-white/5 p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Occupancy Trend Forecast</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Crowded (70%)', fill: '#ef4444', fontSize: 10 }} />
                    <Line
                      type="monotone"
                      dataKey="pct"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={{ r: 5, fill: '#3b82f6', stroke: '#1e3a8a', strokeWidth: 2 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Summary table */}
              <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5">
                  <h3 className="text-sm font-semibold text-white">Prediction Summary</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {forecast.predictions.map(p => (
                    <div key={p.horizon} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <TrendIcon trend={p.trend} />
                        <div>
                          <p className="text-sm text-white font-medium">+{p.horizon}</p>
                          <p className="text-xs text-slate-500">{p.summary}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-bold text-sm ${p.predictedPercent > 70 ? 'text-red-400' : p.predictedPercent > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {p.predictedPercent.toFixed(1)}%
                        </span>
                        <span className="text-xs text-slate-600">{Math.round(p.confidence * 100)}% conf.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card rounded-2xl border border-white/5 p-12 text-center">
              <Brain size={40} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Select a resource to view crowd predictions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
