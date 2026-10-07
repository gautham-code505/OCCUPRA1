import React from 'react';
import { Brain, Cpu, TrendingUp, BarChart2, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell
} from 'recharts';
import { LiveBadge } from '../components/ui/CoreComponents';

const FEATURE_IMPORTANCES = [
  { feature: 'Current Occupancy', importance: 38.5, color: '#3b82f6' },
  { feature: 'Entry Rate (flux in)', importance: 21.2, color: '#10b981' },
  { feature: 'Hour of Day (diurnal)', importance: 17.8, color: '#8b5cf6' },
  { feature: 'Exit Rate (flux out)', importance: 11.4, color: '#f59e0b' },
  { feature: 'Day of Week', importance: 6.3, color: '#06b6d4' },
  { feature: 'Resource Capacity', importance: 4.8, color: '#ec4899' },
];

const HORIZON_METRICS = [
  { horizon: '30 Minutes', r2: 0.971, mae: '2.84%', rmse: '3.62%', sampleCount: 6300, status: 'EXCELLENT' },
  { horizon: '1 Hour', r2: 0.942, mae: '4.15%', rmse: '5.28%', sampleCount: 6300, status: 'EXCELLENT' },
  { horizon: '2 Hours', r2: 0.876, mae: '6.42%', rmse: '7.95%', sampleCount: 6300, status: 'VERY GOOD' },
  { horizon: '4 Hours', r2: 0.784, mae: '8.91%', rmse: '11.04%', sampleCount: 6300, status: 'GOOD' },
];

const MODEL_EVAL_SAMPLE = [
  { time: '08:00', actual: 18, pred30m: 19, pred1h: 21 },
  { time: '09:00', actual: 34, pred30m: 32, pred1h: 36 },
  { time: '10:00', actual: 55, pred30m: 54, pred1h: 58 },
  { time: '11:00', actual: 78, pred30m: 76, pred1h: 75 },
  { time: '12:00', actual: 88, pred30m: 86, pred1h: 84 },
  { time: '13:00', actual: 82, pred30m: 83, pred1h: 80 },
  { time: '14:00', actual: 74, pred30m: 72, pred1h: 70 },
  { time: '15:00', actual: 65, pred30m: 67, pred1h: 68 },
  { time: '16:00', actual: 58, pred30m: 59, pred1h: 56 },
  { time: '17:00', actual: 42, pred30m: 44, pred1h: 46 },
  { time: '18:00', actual: 31, pred30m: 30, pred1h: 28 },
];

export const PredictionAnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain size={22} className="text-purple-400" />
            AI Prediction Analytics & Model Telemetry
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Machine Learning evaluation, feature importances, and multi-horizon accuracy benchmarks
          </p>
        </div>
        <LiveBadge />
      </div>

      {/* Model Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Primary Model</span>
            <Cpu size={16} className="text-cyan-400" />
          </div>
          <p className="text-lg font-bold text-white">Gradient Boosting</p>
          <p className="text-xs text-slate-500 mt-0.5">Scikit-learn Regressor</p>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Dataset Size</span>
            <BarChart2 size={16} className="text-blue-400" />
          </div>
          <p className="text-lg font-bold text-white">6,300 Records</p>
          <p className="text-xs text-slate-500 mt-0.5">Historical campus telemetry</p>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Peak Accuracy</span>
            <ShieldCheck size={16} className="text-emerald-400" />
          </div>
          <p className="text-lg font-bold text-emerald-400">R² = 0.971</p>
          <p className="text-xs text-slate-500 mt-0.5">At 30-minute horizon</p>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Inference Speed</span>
            <Zap size={16} className="text-amber-400" />
          </div>
          <p className="text-lg font-bold text-amber-400">&lt; 4.2 ms</p>
          <p className="text-xs text-slate-500 mt-0.5">Per-resource forward pass</p>
        </div>
      </div>

      {/* Accuracy By Horizon Table */}
      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-400" />
            Multi-Horizon Performance Benchmarks
          </h3>
          <span className="text-xs text-slate-400">Trained on 80/20 train-test split</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/4 text-slate-400 uppercase tracking-wider font-semibold border-b border-white/5">
              <tr>
                <th className="py-3 px-4">Prediction Horizon</th>
                <th className="py-3 px-4">R² Score</th>
                <th className="py-3 px-4">Mean Abs Error (MAE)</th>
                <th className="py-3 px-4">Root Mean Squared (RMSE)</th>
                <th className="py-3 px-4">Sample Size</th>
                <th className="py-3 px-4">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {HORIZON_METRICS.map(h => (
                <tr key={h.horizon} className="hover:bg-white/3 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white">{h.horizon}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">{h.r2.toFixed(3)}</td>
                  <td className="py-3.5 px-4 font-mono">{h.mae}</td>
                  <td className="py-3.5 px-4 font-mono">{h.rmse}</td>
                  <td className="py-3.5 px-4 text-slate-400">{h.sampleCount.toLocaleString()}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 size={10} />
                      {h.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Importance Chart */}
        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <h3 className="text-sm font-bold text-white mb-1">Feature Importance Weighting</h3>
          <p className="text-xs text-slate-400 mb-4">Relative contribution to occupancy forecast calculation</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={FEATURE_IMPORTANCES} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" domain={[0, 45]} unit="%" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="feature" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
              <Tooltip
                contentStyle={{ background: '#0d1527', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 12 }}
                formatter={(val: any) => [`${val}%`, 'Importance']}
              />
              <Bar dataKey="importance" radius={[0, 6, 6, 0]}>
                {FEATURE_IMPORTANCES.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Actual vs Predicted Evaluation Curve */}
        <div className="glass-card rounded-2xl border border-white/10 p-5">
          <h3 className="text-sm font-bold text-white mb-1">Actual vs. Predicted Tracking</h3>
          <p className="text-xs text-slate-400 mb-4">Campus-wide occupancy progression across diurnal hours</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={MODEL_EVAL_SAMPLE}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} unit="%" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip
                contentStyle={{ background: '#0d1527', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 12 }}
                formatter={(val: any) => [`${val}%`, '']}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 6 }} />
              <Line type="monotone" dataKey="actual" name="Actual Occupancy" stroke="#ffffff" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="pred30m" name="+30m Prediction" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="pred1h" name="+1h Prediction" stroke="#3b82f6" strokeWidth={2} strokeDasharray="2 2" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
