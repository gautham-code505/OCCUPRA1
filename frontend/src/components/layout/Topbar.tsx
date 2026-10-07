import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, RefreshCw, X, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLiveData } from '../../contexts/LiveDataContext';
import { notificationAPI } from '../../services/api';
import { formatTimeAgo, formatTime } from '../../utils/helpers';
import { LiveBadge } from '../ui/CoreComponents';

export const Topbar: React.FC = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, isConnected, lastUpdate, refreshResources } = useLiveData();
  const [search, setSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [time, setTime] = useState(formatTime());
  const navigate = useNavigate();
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(formatTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/map?search=${encodeURIComponent(search.trim())}`);
  };

  const markAllRead = async () => {
    await notificationAPI.markAllRead();
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-40 glass-card border-b border-white/5 px-6 py-3 flex items-center gap-4">
      {/* Live clock */}
      <div className="hidden lg:flex items-center gap-2 mr-2">
        <Clock size={13} className="text-slate-500" />
        <span className="font-mono text-sm text-slate-400">{time}</span>
      </div>

      {/* Live status */}
      <LiveBadge className="hidden md:inline-flex" />

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search campus resources…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-2">
        {/* Last update indicator */}
        {lastUpdate && (
          <span className="hidden lg:block text-[10px] text-slate-600 font-mono">
            Updated {formatTimeAgo(lastUpdate)}
          </span>
        )}

        {/* Refresh */}
        <button
          onClick={refreshResources}
          className="p-2 text-slate-400 hover:text-white hover:bg-white/8 rounded-xl transition-all"
          title="Refresh live data"
        >
          <RefreshCw size={16} />
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(v => !v)}
            className="relative p-2 text-slate-400 hover:text-white hover:bg-white/8 rounded-xl transition-all"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-12 w-96 glass-card rounded-2xl border border-white/10 shadow-glass overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <span className="font-semibold text-white text-sm">Notifications</span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-blue-400 hover:text-blue-300">
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setShowNotifications(false)}>
                    <X size={14} className="text-slate-500 hover:text-white" />
                  </button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-center text-slate-500 text-sm py-6">No notifications</p>
                ) : (
                  notifications.slice(0, 8).map(n => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-white/5 hover:bg-white/4 transition-colors ${!n.isRead ? 'bg-blue-500/5' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg leading-none mt-0.5">
                          {n.type === 'CROWD' ? '⚠️' : n.type === 'AVAILABILITY' ? '🔔' : n.type === 'BOOKING' ? '✅' : n.type === 'RECOMMENDATION' ? '💡' : '📈'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${!n.isRead ? 'text-white' : 'text-slate-300'}`}>{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-slate-600 mt-1">{formatTimeAgo(n.createdAt)}</p>
                        </div>
                        {!n.isRead && <span className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 mt-1" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2 border-t border-white/5">
                <button
                  onClick={() => { setShowNotifications(false); navigate('/notifications'); }}
                  className="text-xs text-blue-400 hover:text-blue-300 w-full text-center"
                >
                  View all notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        {user && (
          <button onClick={() => navigate('/profile')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user.name.charAt(0)}
            </div>
          </button>
        )}
      </div>
    </header>
  );
};
