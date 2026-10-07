import React, { useState } from 'react';
import { useLiveData } from '../contexts/LiveDataContext';
import { CampusMap } from '../components/map/CampusMap';
import { ResourceDetailPanel } from '../components/resource/ResourceDetailPanel';
import { CrowdBadge, LiveBadge, OccupancyGauge } from '../components/ui/CoreComponents';
import { Resource } from '../types';
import { Eye, Shield, Activity, RefreshCw, AlertTriangle, Layers, Radio, Sparkles } from 'lucide-react';
import { getResourceTypeIcon } from '../utils/helpers';

export const LiveCampusMonitoringPage: React.FC = () => {
  const { resources, isConnected, isSurgeActive, lastUpdate } = useLiveData();
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'grid'>('map');

  const crowdedCount = resources.filter(r => r.currentCrowdStatus === 'CROWDED').length;
  const moderateCount = resources.filter(r => r.currentCrowdStatus === 'MODERATE').length;
  const quietCount = resources.filter(r => r.currentCrowdStatus === 'QUIET').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Eye size={22} className="text-cyan-400" />
            Live Campus Digital Twin Monitoring
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time telemetry and crowd monitoring across all 15 university zones
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge />
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'map' ? 'bg-blue-600 text-white shadow-glow-blue' : 'text-slate-400 hover:text-white'}`}
            >
              Map View
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-glow-blue' : 'text-slate-400 hover:text-white'}`}
            >
              Sensor Grid
            </button>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl border border-white/10 p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Active Zones</p>
            <p className="text-2xl font-black text-white mt-0.5">{resources.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Layers size={18} />
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Quiet Spaces</p>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">{quietCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Radio size={18} />
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Moderate</p>
            <p className="text-2xl font-black text-amber-400 mt-0.5">{moderateCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Activity size={18} />
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Crowd Alerts</p>
            <p className="text-2xl font-black text-red-400 mt-0.5">{crowdedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
            <AlertTriangle size={18} />
          </div>
        </div>
      </div>

      {/* Main Monitoring Display */}
      {viewMode === 'map' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 glass-card rounded-2xl border border-white/10 overflow-hidden min-h-[560px]">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live" />
                Live Spatial Digital Twin Feed
              </span>
              <span className="text-xs text-slate-400 font-mono">Center: [12.9716, 77.5946]</span>
            </div>
            <CampusMap
              resources={resources}
              onResourceSelect={setSelectedResource}
              height="520px"
              zoom={17}
            />
          </div>

          <div className="space-y-4">
            {selectedResource ? (
              <ResourceDetailPanel
                resource={selectedResource}
                onClose={() => setSelectedResource(null)}
              />
            ) : (
              <div className="glass-card rounded-2xl border border-white/10 p-5">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Shield size={16} className="text-cyan-400" />
                  Live Sensor Feed Ticker
                </h3>
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {resources.map(r => (
                    <div
                      key={r.id}
                      onClick={() => setSelectedResource(r)}
                      className="p-3 bg-white/4 hover:bg-white/8 border border-white/5 rounded-xl cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{getResourceTypeIcon(r.type)}</span>
                        <div>
                          <p className="text-xs font-bold text-white">{r.name}</p>
                          <p className="text-[10px] text-slate-500">{r.building} · {r.floor}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-xs font-mono font-bold ${r.occupancyPercent > 70 ? 'text-red-400' : r.occupancyPercent > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {Math.round(r.occupancyPercent)}%
                          </p>
                          <p className="text-[9px] text-slate-500">{r.currentOccupancy}/{r.capacity}</p>
                        </div>
                        <CrowdBadge status={r.currentCrowdStatus} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Sensor Grid Matrix View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {resources.map(r => (
            <div
              key={r.id}
              onClick={() => setSelectedResource(r)}
              className="glass-card rounded-2xl border border-white/10 p-5 hover:border-blue-500/30 hover:scale-[1.01] transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{getResourceTypeIcon(r.type)}</span>
                  <div>
                    <h3 className="text-sm font-bold text-white truncate max-w-[140px]">{r.name}</h3>
                    <p className="text-[10px] text-slate-500 font-mono">{r.code}</p>
                  </div>
                </div>
                <OccupancyGauge percent={r.occupancyPercent} size="sm" />
              </div>

              <div className="grid grid-cols-2 gap-2 my-3 text-center">
                <div className="bg-white/4 rounded-lg p-2">
                  <span className="text-[10px] text-slate-500 block">Occupied</span>
                  <span className="text-xs font-bold text-white">{r.currentOccupancy}</span>
                </div>
                <div className="bg-white/4 rounded-lg p-2">
                  <span className="text-[10px] text-slate-500 block">Free Seats</span>
                  <span className="text-xs font-bold text-emerald-400">{r.availableUnits}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <CrowdBadge status={r.currentCrowdStatus} size="sm" />
                <span className="text-[10px] text-slate-500">{r.distanceMeters}m away</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
