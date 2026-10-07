import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Users, Activity, AlertTriangle, CheckCircle,
  Cpu, BarChart3, Zap, TrendingUp, ChevronRight, Lightbulb,
  MapPin, RefreshCw
} from 'lucide-react';
import { useLiveData } from '../contexts/LiveDataContext';
import { analyticsAPI, simulationAPI } from '../services/api';
import { StatCard, LiveBadge, LoadingSkeleton } from '../components/ui/CoreComponents';
import { MiniCampusMap } from '../components/map/CampusMap';
import { ResourceDetailPanel } from '../components/resource/ResourceDetailPanel';
import { Resource } from '../types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { formatTimeAgo } from '../utils/helpers';

const fadeIn = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export const AdminDashboard: React.FC = () => {
  const { resources, isConnected, lastUpdate, isSurgeActive } = useLiveData();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [simState, setSimState] = useState<any>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      analyticsAPI.getOverview(),
      analyticsAPI.getTrends(),
      analyticsAPI.getInsights(),
      simulationAPI.getStatus(),
    ]).then(([ov, tr, ins, sim]) => {
      setMetrics(ov.metrics);
      setTrends(tr);
      setInsights(ins.insights || []);
      setSimState(sim.state);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  const handleToggleSim = async () => {
    const res = await simulationAPI.toggle();
    setSimState(res.state);
  };

  const handleSetSpeed = async (speed: 'slow' | 'normal' | 'fast') => {
    const res = await simulationAPI.setSpeed(speed);
    setSimState(res.state);
  };

  const handleSurge = async () => {
    setTriggerLoading(true);
    await simulationAPI.triggerSurge();
    setTriggerLoading(false);
  };

  const handleReset = async () => {
    setResetLoading(true);
    await simulationAPI.reset();
    setResetLoading(false);
  };

  const campusOcc = metrics?.totalOccupancyPercent ?? (resources.length
    ? Math.round(resources.reduce((a, r) => a + r.occupancyPercent, 0) / resources.length)
    : 68);

  const chartData = trends?.hourlyTrends?.slice(0, 10) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeIn} initial="hidden" animate="show" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield size={22} className="text-purple-400" />
            Smart Campus Control Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Admin Command Center · {resources.length} resources monitored
            {lastUpdate && ` · Last update ${formatTimeAgo(lastUpdate)}`}
          </p>
        </div>
        <LiveBadge />
      </motion.div>

      {/* Demo Mode Panel */}
      <motion.div variants={fadeIn} initial="hidden" animate="show" transition={{ delay: 0.05 }}
        className={`glass-card rounded-2xl border p-5 ${isSurgeActive ? 'border-red-500/40 bg-red-500/5' : 'border-white/8'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu size={14} className="text-cyan-400" />
              IoT Simulation Engine
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${simState?.isRunning ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'}`}>
                {simState?.isRunning ? '● RUNNING' : '○ PAUSED'}
              </span>
              {isSurgeActive && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-500/20 text-red-400 animate-pulse">
                  ⚡ SURGE ACTIVE
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Speed: <span className="text-slate-300 capitalize">{simState?.speed ?? 'normal'}</span>
              {' · '}Tick #{simState?.tickCount ?? 0}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Speed controls */}
            <div className="flex gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
              {(['slow', 'normal', 'fast'] as const).map(s => (
                <button key={s} onClick={() => handleSetSpeed(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${simState?.speed === s ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                  {s}
                </button>
              ))}
            </div>
            <button onClick={handleToggleSim}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${simState?.isRunning ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'}`}>
              {simState?.isRunning ? '⏸ Pause' : '▶ Resume'}
            </button>
            <button onClick={handleSurge} disabled={triggerLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all disabled:opacity-50">
              ⚡ {triggerLoading ? 'Triggering…' : 'Demo Surge'}
            </button>
            <button onClick={handleReset} disabled={resetLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all disabled:opacity-50">
              <RefreshCw size={11} /> {resetLoading ? 'Resetting…' : 'Reset'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* KPI Stats */}
      <motion.div variants={fadeIn} initial="hidden" animate="show" transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {isLoading ? (
          [...Array(6)].map((_, i) => <div key={i} className="glass-card rounded-2xl p-5 h-28"><LoadingSkeleton lines={2} /></div>)
        ) : (
          <>
            <StatCard title="Total Resources" value={metrics?.totalResources ?? 15} icon={<BarChart3 size={18} />} accent="blue" />
            <StatCard title="Campus Occupancy" value={`${Math.round(campusOcc)}%`} subtitle="Live average" icon={<Users size={18} />} accent="cyan" trend={4} />
            <StatCard title="Crowded" value={metrics?.crowdedResources ?? 0} icon={<AlertTriangle size={18} />} accent="red" />
            <StatCard title="Available" value={metrics?.availableResources ?? 0} icon={<CheckCircle size={18} />} accent="green" />
            <StatCard title="Active Bookings" value={metrics?.activeBookings ?? 126} icon={<Activity size={18} />} accent="purple" />
            <StatCard title="Sensor Health" value={`${metrics?.sensorHealthPercent ?? 97}%`} icon={<Cpu size={18} />} accent="amber" />
          </>
        )}
      </motion.div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Live Map */}
        <motion.div variants={fadeIn} initial="hidden" animate="show" transition={{ delay: 0.15 }}
          className="xl:col-span-2 glass-card rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h2 className="font-bold text-white text-sm flex items-center gap-2">
              <MapPin size={14} className="text-blue-400" /> LIVE CAMPUS DIGITAL TWIN
            </h2>
            <div className="flex items-center gap-3">
              <LiveBadge />
              <button onClick={() => navigate('/admin/monitoring')} className="text-xs text-blue-400 hover:text-blue-300">
                Full view <ChevronRight size={12} className="inline" />
              </button>
            </div>
          </div>
          {resources.length > 0 ? (
            <MiniCampusMap resources={resources} onSelect={setSelectedResource} />
          ) : (
            <div className="h-[280px] flex items-center justify-center"><LoadingSkeleton lines={1} className="w-32" /></div>
          )}
        </motion.div>

        {/* Right column */}
        <motion.div variants={fadeIn} initial="hidden" animate="show" transition={{ delay: 0.2 }} className="space-y-4">
          {selectedResource ? (
            <ResourceDetailPanel resource={selectedResource} onClose={() => setSelectedResource(null)} className="max-h-[380px]" />
          ) : (
            <div className="glass-card rounded-2xl border border-white/5 p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Activity size={14} className="text-cyan-400" /> Resource Status Board
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {resources.map(r => (
                  <button key={r.id} onClick={() => setSelectedResource(r)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors text-left">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${r.currentCrowdStatus === 'CROWDED' ? 'bg-red-400' : r.currentCrowdStatus === 'MODERATE' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <span className="flex-1 text-xs text-slate-300 truncate">{r.name}</span>
                    <span className="text-xs font-bold text-slate-400">{Math.round(r.occupancyPercent)}%</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick nav */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'IoT Sensors', icon: <Cpu size={14} />, path: '/admin/sensors' },
              { label: 'Analytics', icon: <BarChart3 size={14} />, path: '/admin/analytics' },
              { label: 'Utilization', icon: <Zap size={14} />, path: '/admin/utilization' },
              { label: 'AI Insights', icon: <Lightbulb size={14} />, path: '/admin/insights' },
            ].map(item => (
              <button key={item.path} onClick={() => navigate(item.path)}
                className="glass-card rounded-xl border border-white/5 p-3 flex items-center gap-2 hover:border-blue-500/30 hover:bg-blue-600/5 transition-all text-slate-300 text-xs font-medium">
                <span className="text-blue-400">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Hourly Trend Chart */}
      <motion.div variants={fadeIn} initial="hidden" animate="show" transition={{ delay: 0.25 }}
        className="glass-card rounded-2xl border border-white/5 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp size={14} className="text-blue-400" /> Hourly Campus Occupancy Trend
          </h3>
          <button onClick={() => navigate('/admin/analytics')} className="text-xs text-blue-400 hover:text-blue-300">
            Full analytics <ChevronRight size={12} className="inline" />
          </button>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip
                contentStyle={{ background: '#0d1527', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 12 }}
                formatter={(v: any) => [`${v}%`, 'Occupancy']}
              />
              <Area type="monotone" dataKey="occupancy" stroke="#3b82f6" strokeWidth={2} fill="url(#gradBlue)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <LoadingSkeleton lines={1} className="h-[200px]" />
        )}
      </motion.div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <motion.div variants={fadeIn} initial="hidden" animate="show" transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Lightbulb size={14} className="text-amber-400" /> AI Campus Insights
            </h3>
            <button onClick={() => navigate('/admin/insights')} className="text-xs text-blue-400 hover:text-blue-300">
              View all <ChevronRight size={12} className="inline" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {insights.slice(0, 4).map((ins: any) => (
              <div key={ins.id} className={`glass-card rounded-xl border p-4 ${ins.severity === 'WARNING' ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/8'}`}>
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">
                    {ins.category === 'PEAK_WARNING' ? '⚠️' : ins.category === 'RECOMMENDATION' ? '💡' : ins.category === 'UTILIZATION' ? '📊' : '🔍'}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{ins.title}</p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{ins.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};
