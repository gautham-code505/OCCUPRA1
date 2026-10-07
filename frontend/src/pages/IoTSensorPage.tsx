import React, { useEffect, useState } from 'react';
import { sensorAPI } from '../services/api';
import { Sensor } from '../types';
import { Cpu, RefreshCw, Play, Pause, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { LiveBadge, LoadingSkeleton } from '../components/ui/CoreComponents';
import { formatTimeAgo, cn } from '../utils/helpers';
import { useLiveData } from '../contexts/LiveDataContext';

export const IoTSensorPage: React.FC = () => {
  const [sensors, setSensors] = useState<(Sensor & { resource: any })[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { lastUpdate } = useLiveData();

  const loadSensors = async () => {
    try {
      const data = await sensorAPI.getAll();
      setSensors(data.sensors ?? []);
      setSummary(data.summary ?? null);
    } catch (_) {}
    setIsLoading(false);
  };

  useEffect(() => { loadSensors(); }, []);
  // Refresh sensor data every 5s
  useEffect(() => { loadSensors(); }, [lastUpdate]);

  const handleAction = async (action: string, sensorId: string) => {
    setActionLoading(`${action}-${sensorId}`);
    try {
      if (action === 'entry') await sensorAPI.simulateEntry(sensorId, 5);
      else if (action === 'exit') await sensorAPI.simulateExit(sensorId, 5);
      else if (action === 'toggle') await sensorAPI.toggleStatus(sensorId);
      await loadSensors();
    } catch (_) {}
    setActionLoading(null);
  };

  const isActing = (action: string, id: string) => actionLoading === `${action}-${id}`;

  const statusColor = (status: string) =>
    status === 'ONLINE' ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
      : status === 'PAUSED' ? 'text-amber-400 bg-amber-500/15 border-amber-500/30'
      : 'text-red-400 bg-red-500/15 border-red-500/30';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu size={20} className="text-cyan-400" />
            IoT Sensor Control Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {summary?.onlineSensors ?? 0}/{summary?.totalSensors ?? 0} sensors online ·{' '}
            Avg health: {summary?.averageHealth ?? 97}%
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge />
          <button onClick={loadSensors} className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-300 hover:bg-white/10 transition-all">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Sensors', val: summary.totalSensors, color: 'text-white' },
            { label: 'Online', val: summary.onlineSensors, color: 'text-emerald-400' },
            { label: 'Paused', val: summary.pausedSensors, color: 'text-amber-400' },
            { label: 'Avg Health', val: `${summary.averageHealth}%`, color: 'text-blue-400' },
          ].map(s => (
            <div key={s.label} className="glass-card rounded-xl border border-white/8 p-4 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sensor cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl border border-white/5 p-5">
              <LoadingSkeleton lines={4} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sensors.map(sensor => (
            <div key={sensor.id} className={cn(
              'glass-card rounded-2xl border transition-all duration-300',
              sensor.status === 'ONLINE' ? 'border-white/8 hover:border-cyan-500/30' : 'border-white/5 opacity-75'
            )}>
              {/* Card header */}
              <div className="flex items-start justify-between p-5 pb-4 border-b border-white/5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', statusColor(sensor.status))}>
                      ● {sensor.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white font-mono">{sensor.sensorCode}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{sensor.resource?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Health</p>
                  <p className={`text-xl font-bold ${sensor.healthPercent > 90 ? 'text-emerald-400' : sensor.healthPercent > 70 ? 'text-amber-400' : 'text-red-400'}`}>
                    {sensor.healthPercent}%
                  </p>
                </div>
              </div>

              {/* Live readings */}
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/4 rounded-lg p-2">
                    <p className="text-[9px] text-slate-500 uppercase mb-0.5">Occupancy</p>
                    <p className={`text-sm font-bold ${(sensor.resource?.occupancyPercent ?? 0) > 70 ? 'text-red-400' : (sensor.resource?.occupancyPercent ?? 0) > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {Math.round(sensor.resource?.occupancyPercent ?? 0)}%
                    </p>
                  </div>
                  <div className="bg-white/4 rounded-lg p-2">
                    <p className="text-[9px] text-slate-500 uppercase mb-0.5">Entry/min</p>
                    <p className="text-sm font-bold text-emerald-400">+{sensor.entryRate}</p>
                  </div>
                  <div className="bg-white/4 rounded-lg p-2">
                    <p className="text-[9px] text-slate-500 uppercase mb-0.5">Exit/min</p>
                    <p className="text-sm font-bold text-red-400">-{sensor.exitRate}</p>
                  </div>
                </div>

                {/* Battery bar */}
                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Battery</span>
                    <span>{sensor.batteryLevel}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full">
                    <div
                      className={`h-full rounded-full ${sensor.batteryLevel > 50 ? 'bg-emerald-500' : sensor.batteryLevel > 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${sensor.batteryLevel}%` }}
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-600">
                  Last heartbeat: {formatTimeAgo(sensor.lastHeartbeat)}
                </p>

                {/* Action buttons */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => handleAction('entry', sensor.id)}
                    disabled={sensor.status !== 'ONLINE' || !!actionLoading}
                    className="flex flex-col items-center gap-1 p-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-emerald-400 transition-all disabled:opacity-40 text-[10px] font-medium"
                  >
                    <ArrowUpCircle size={14} />
                    {isActing('entry', sensor.id) ? '…' : 'Entry'}
                  </button>
                  <button
                    onClick={() => handleAction('exit', sensor.id)}
                    disabled={sensor.status !== 'ONLINE' || !!actionLoading}
                    className="flex flex-col items-center gap-1 p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 transition-all disabled:opacity-40 text-[10px] font-medium"
                  >
                    <ArrowDownCircle size={14} />
                    {isActing('exit', sensor.id) ? '…' : 'Exit'}
                  </button>
                  <button
                    onClick={() => handleAction('toggle', sensor.id)}
                    disabled={!!actionLoading}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 border rounded-xl transition-all text-[10px] font-medium',
                      sensor.status === 'ONLINE'
                        ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-400'
                        : 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 text-blue-400'
                    )}
                  >
                    {sensor.status === 'ONLINE' ? <Pause size={14} /> : <Play size={14} />}
                    {isActing('toggle', sensor.id) ? '…' : sensor.status === 'ONLINE' ? 'Pause' : 'Resume'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
