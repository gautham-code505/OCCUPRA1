import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Map, Activity, BookOpen, Brain, Lightbulb,
  CalendarCheck, Bell, User, Settings, ChevronLeft, ChevronRight,
  Shield, Cpu, BarChart3, Zap, Database, LogOut, TrendingUp, Eye
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLiveData } from '../../contexts/LiveDataContext';
import { cn } from '../../utils/helpers';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  badge?: string;
}

const studentNav: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Campus Map', path: '/map', icon: <Map size={18} /> },
  { label: 'Live Heatmap', path: '/heatmap', icon: <Activity size={18} /> },
  { label: 'Crowd Prediction', path: '/prediction', icon: <TrendingUp size={18} /> },
  { label: 'Find Best Space', path: '/recommendation', icon: <Brain size={18} /> },
  { label: 'My Bookings', path: '/bookings', icon: <CalendarCheck size={18} /> },
  { label: 'Notifications', path: '/notifications', icon: <Bell size={18} /> },
  { label: 'Profile', path: '/profile', icon: <User size={18} /> },
];

const adminNav: NavItem[] = [
  { label: 'Command Center', path: '/admin', icon: <Shield size={18} /> },
  { label: 'Live Monitoring', path: '/admin/monitoring', icon: <Eye size={18} /> },
  { label: 'IoT Sensors', path: '/admin/sensors', icon: <Cpu size={18} /> },
  { label: 'Resources', path: '/admin/resources', icon: <Database size={18} /> },
  { label: 'Crowd Analytics', path: '/admin/analytics', icon: <BarChart3 size={18} /> },
  { label: 'Prediction Analytics', path: '/admin/predictions', icon: <TrendingUp size={18} /> },
  { label: 'Utilization', path: '/admin/utilization', icon: <Zap size={18} /> },
  { label: 'AI Insights', path: '/admin/insights', icon: <Lightbulb size={18} /> },
  { label: 'Bookings Mgmt', path: '/admin/bookings', icon: <CalendarCheck size={18} /> },
  { label: 'Settings', path: '/admin/settings', icon: <Settings size={18} /> },
];

export const Sidebar: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const { unreadCount, isConnected } = useLiveData();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = isAdmin ? adminNav : studentNav;

  return (
    <aside className={cn(
      'h-screen sticky top-0 flex flex-col glass-card border-r border-white/5 transition-all duration-300',
      collapsed ? 'w-16' : 'w-62'
    )}>
      {/* Logo */}
      <div className={cn('px-4 py-5 border-b border-white/5 flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
        <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-glow-cyan">
          <Activity size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm font-bold text-white tracking-tight leading-none">CAMPUSPULSE</div>
            <div className="text-[10px] text-cyan-400 tracking-widest font-semibold mt-0.5">AI ENGINE</div>
          </div>
        )}
      </div>

      {/* Connection status */}
      {!collapsed && (
        <div className="px-4 py-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className={cn('w-2 h-2 rounded-full', isConnected ? 'bg-emerald-400 animate-live' : 'bg-red-400')} />
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              {isConnected ? 'IoT Stream Active' : 'Reconnecting…'}
            </span>
          </div>
        </div>
      )}

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 py-2">
          <span className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
            isAdmin
              ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
              : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
          )}>
            {isAdmin ? <Shield size={9} /> : <User size={9} />}
            {isAdmin ? 'ADMIN MODE' : 'STUDENT MODE'}
          </span>
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {navItems.map(item => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          const isNotif = item.path === '/notifications';
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative',
                isActive
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/25'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              )}
            >
              <span className={cn('flex-shrink-0', isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300')}>
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && isNotif && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white rounded-full text-[10px] font-bold w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer: user info + logout */}
      <div className="border-t border-white/5 p-3">
        {!collapsed && user && (
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => { logout(); navigate('/'); }}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all',
            collapsed && 'justify-center'
          )}
          title="Log out"
        >
          <LogOut size={16} />
          {!collapsed && 'Log out'}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-20 bg-[#0d1527] border border-white/10 rounded-full p-1 text-slate-400 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
};
