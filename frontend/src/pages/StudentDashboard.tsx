import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, MapPin, Zap, Brain, BookOpen, ChevronRight,
  Activity, TrendingUp, AlertCircle, BarChart2, Shield, Cpu
} from 'lucide-react';
import { useLiveData } from '../contexts/LiveDataContext';
import { analyticsAPI } from '../services/api';
import { StatCard, LiveBadge, LoadingSkeleton } from '../components/ui/CoreComponents';
import { MiniCampusMap } from '../components/map/CampusMap';
import { ResourceDetailPanel } from '../components/resource/ResourceDetailPanel';
import { Resource } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getGreeting, getResourceTypeIcon, getCrowdBgColor, formatTimeAgo } from '../utils/helpers';

const fadeIn = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { resources, notifications, isConnected, lastUpdate, unreadCount } = useLiveData();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<any>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    analyticsAPI.getOverview().then(d => {
      setOverview(d.metrics);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  const campusPct = overview?.totalOccupancyPercent ?? resources.length > 0
    ? Math.round(resources.reduce((a, r) => a + r.occupancyPercent, 0) / resources.length)
    : 68;

  const quietCount = resources.filter(r => r.currentCrowdStatus === 'QUIET').length;
  const moderateCount = resources.filter(r => r.currentCrowdStatus === 'MODERATE').length;
  const crowdedCount = resources.filter(r => r.currentCrowdStatus === 'CROWDED').length;

  const quickActions = [
    { icon: '📚', label: 'Find Study Space', need: 'STUDY', path: '/recommendation' },
    { icon: '💻', label: 'Find Computer', need: 'COMPUTER', path: '/recommendation' },
    { icon: '👥', label: 'Group Space', need: 'GROUP', path: '/recommendation' },
    { icon: '🍴', label: 'Find Food', need: 'FOOD', path: '/recommendation' },
  ];

  const recentAlerts = notifications.filter(n => !n.isRead).slice(0, 3);

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <motion.div variants={fadeIn} initial="hidden" animate="show" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {getGreeting()}, {user?.name?.split(' ')[0] ?? 'Student'} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">Here's the live campus snapshot for you.</p>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge />
          {lastUpdate && (
            <span className="text-xs text-slate-500">Updated {formatTimeAgo(lastUpdate)}</span>
          )}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={fadeIn} initial="hidden" animate="show" transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map(a => (
          <button
            key={a.need}
            onClick={() => navigate(a.path, { state: { need: a.need } })}
            className="glass-card rounded-xl p-4 text-center hover:bg-blue-600/10 hover:border-blue-500/30 border border-white/5 transition-all duration-200 group"
          >
            <div className="text-2xl mb-2">{a.icon}</div>
            <div className="text-xs font-medium text-slate-300 group-hover:text-blue-300 transition-colors">{a.label}</div>
          </button>
        ))}
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={fadeIn} initial="hidden" animate="show" transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 h-28"><LoadingSkeleton lines={2} /></div>
          ))
        ) : (
          <>
            <StatCard
              title="Campus Occupancy"
              value={`${Math.round(campusPct)}%`}
              subtitle="Live average"
              icon={<Users size={18} />}
              trend={8.4}
              accent="blue"
            />
            <StatCard
              title="Quiet Resources"
              value={quietCount}
              subtitle="Low crowd"
              icon={<Activity size={18} />}
              accent="green"
            />
            <StatCard
              title="Moderate"
              value={moderateCount}
              subtitle="Manageable crowd"
              icon={<BarChart2 size={18} />}
              accent="amber"
            />
            <StatCard
              title="Crowded"
              value={crowdedCount}
              subtitle="High occupancy"
              icon={<AlertCircle size={18} />}
              accent="red"
            />
            <StatCard
              title="Active Bookings"
              value={overview?.activeBookings ?? 126}
              subtitle="Campus-wide"
              icon={<BookOpen size={18} />}
              accent="purple"
            />
          </>
        )}
      </motion.div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Live Campus Map */}
        <motion.div variants={fadeIn} initial="hidden" animate="show" transition={{ delay: 0.15 }}
          className="xl:col-span-2 glass-card rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div>
              <h2 className="font-bold text-white text-base flex items-center gap-2">
                <MapPin size={16} className="text-blue-400" /> LIVE CAMPUS MAP
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Click a marker to view details</p>
            </div>
            <div className="flex items-center gap-3">
              <LiveBadge />
              <button onClick={() => navigate('/map')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                Full map <ChevronRight size={12} />
              </button>
            </div>
          </div>
          {resources.length > 0 ? (
            <MiniCampusMap resources={resources} onSelect={r => setSelectedResource(r)} />
          ) : (
            <div className="h-[280px] flex items-center justify-center">
              <LoadingSkeleton lines={1} className="w-48" />
            </div>
          )}
        </motion.div>

        {/* Right panel: Resource detail OR Recent alerts */}
        <motion.div variants={fadeIn} initial="hidden" animate="show" transition={{ delay: 0.2 }} className="space-y-4">
          {selectedResource ? (
            <ResourceDetailPanel
              resource={selectedResource}
              onClose={() => setSelectedResource(null)}
              className="h-full max-h-[400px]"
            />
          ) : (
            <>
              {/* Live Campus Overview bar */}
              <div className="glass-card rounded-2xl border border-white/5 p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <TrendingUp size={14} className="text-cyan-400" /> Resources at a Glance
                </h3>
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {resources.slice(0, 8).map(r => (
                    <button key={r.id} onClick={() => setSelectedResource(r)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors text-left group">
                      <span className="text-base flex-shrink-0">{getResourceTypeIcon(r.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate group-hover:text-blue-300 transition-colors">{r.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex-1 bg-white/5 rounded-full h-1.5">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${r.currentCrowdStatus === 'CROWDED' ? 'bg-red-500' : r.currentCrowdStatus === 'MODERATE' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${r.occupancyPercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 w-8 text-right">{Math.round(r.occupancyPercent)}%</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={() => navigate('/map')}
                  className="mt-3 w-full text-center text-xs text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1">
                  View all {resources.length} resources <ChevronRight size={12} />
                </button>
              </div>

              {/* Recent Alerts */}
              {recentAlerts.length > 0 && (
                <div className="glass-card rounded-2xl border border-white/5 p-4">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Zap size={14} className="text-amber-400" /> Smart Alerts
                  </h3>
                  <div className="space-y-2">
                    {recentAlerts.map(n => (
                      <div key={n.id} className="flex items-start gap-2 p-2.5 bg-white/3 rounded-xl">
                        <span>{n.type === 'CROWD' ? '⚠️' : n.type === 'AVAILABILITY' ? '🔔' : n.type === 'BOOKING' ? '✅' : '💡'}</span>
                        <div>
                          <p className="text-xs font-medium text-white">{n.title}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* Top Resources quick view */}
      <motion.div variants={fadeIn} initial="hidden" animate="show" transition={{ delay: 0.25 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">All Campus Resources</h2>
          <button onClick={() => navigate('/map')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
            Explore map <ChevronRight size={12} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {resources.slice(0, 8).map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedResource(r)}
              className="glass-card rounded-xl p-4 text-left hover:border-blue-500/30 border border-white/5 transition-all hover:scale-[1.02] duration-200 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getResourceTypeIcon(r.type)}</span>
                  <div>
                    <p className="text-xs font-semibold text-white group-hover:text-blue-300 transition-colors leading-tight">{r.name}</p>
                    <p className="text-[10px] text-slate-500">{r.building}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${r.currentCrowdStatus === 'QUIET' ? 'bg-emerald-500/15 text-emerald-400' : r.currentCrowdStatus === 'CROWDED' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                  {Math.round(r.occupancyPercent)}%
                </span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${r.currentCrowdStatus === 'CROWDED' ? 'bg-red-500' : r.currentCrowdStatus === 'MODERATE' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${r.occupancyPercent}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-slate-500">
                <span>{r.availableUnits} free</span>
                <span>{r.distanceMeters}m</span>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
