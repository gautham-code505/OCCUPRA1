import React, { useState } from 'react';
import { useLiveData } from '../contexts/LiveDataContext';
import { notificationAPI } from '../services/api';
import { Bell, CheckCheck } from 'lucide-react';
import { EmptyState } from '../components/ui/CoreComponents';
import { cn, formatTimeAgo } from '../utils/helpers';

const TYPE_ICONS: Record<string, string> = {
  CROWD: '⚠️',
  AVAILABILITY: '🔔',
  PREDICTION: '📈',
  RECOMMENDATION: '💡',
  BOOKING: '✅',
};

const TYPE_COLORS: Record<string, string> = {
  CROWD: 'border-l-red-500',
  AVAILABILITY: 'border-l-emerald-500',
  PREDICTION: 'border-l-blue-500',
  RECOMMENDATION: 'border-l-purple-500',
  BOOKING: 'border-l-amber-500',
};

export const NotificationsPage: React.FC = () => {
  const { notifications, markAllReadLocally } = useLiveData();
  const [filter, setFilter] = useState<string>('ALL');
  const [markedAll, setMarkedAll] = useState(false);

  const types = ['ALL', 'CROWD', 'AVAILABILITY', 'BOOKING', 'RECOMMENDATION', 'PREDICTION'];
  const filtered = notifications.filter(n => filter === 'ALL' || n.type === filter);

  const handleMarkAll = async () => {
    await notificationAPI.markAllRead();
    markAllReadLocally();
    setMarkedAll(true);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell size={20} className="text-blue-400" />
            Notifications
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {markedAll ? 0 : unreadCount} unread · {notifications.length} total
          </p>
        </div>
        {unreadCount > 0 && !markedAll && (
          <button onClick={handleMarkAll}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-slate-300 transition-all">
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              filter === t ? 'bg-blue-600/20 border-blue-500/40 text-blue-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            )}>
            {t === 'ALL' ? `All (${notifications.length})` : `${TYPE_ICONS[t]} ${t}`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Bell size={40} />}
          title="No notifications"
          message="You're all caught up! Alerts appear here when campus conditions change."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(n => (
            <div key={n.id} className={cn(
              'glass-card rounded-xl border border-white/8 border-l-4 p-4 transition-all',
              TYPE_COLORS[n.type] || 'border-l-slate-500',
              !n.isRead && !markedAll ? 'bg-blue-500/5' : ''
            )}>
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type] || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn('text-sm font-semibold', !n.isRead && !markedAll ? 'text-white' : 'text-slate-300')}>
                      {n.title}
                    </p>
                    {!n.isRead && !markedAll && (
                      <span className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-[10px] text-slate-600">{formatTimeAgo(n.createdAt)}</p>
                    {n.resource && (
                      <span className="text-[10px] text-blue-400">📍 {n.resource.name}</span>
                    )}
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
