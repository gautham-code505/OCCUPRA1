import { CrowdStatus, ResourceType } from '../types';

export const getCrowdColor = (status: CrowdStatus | string): string => {
  switch (status) {
    case 'QUIET': return 'text-emerald-400';
    case 'MODERATE': return 'text-amber-400';
    case 'CROWDED': return 'text-red-400';
    default: return 'text-slate-400';
  }
};

export const getCrowdBgColor = (status: CrowdStatus | string): string => {
  switch (status) {
    case 'QUIET': return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
    case 'MODERATE': return 'bg-amber-500/15 border-amber-500/30 text-amber-400';
    case 'CROWDED': return 'bg-red-500/15 border-red-500/30 text-red-400';
    default: return 'bg-slate-500/15 border-slate-500/30 text-slate-400';
  }
};

export const getCrowdGlow = (status: CrowdStatus | string): string => {
  switch (status) {
    case 'QUIET': return '#10b981';
    case 'MODERATE': return '#f59e0b';
    case 'CROWDED': return '#ef4444';
    default: return '#64748b';
  }
};

export const getOccupancyBarColor = (pct: number): string => {
  if (pct > 70) return 'bg-red-500';
  if (pct > 40) return 'bg-amber-500';
  return 'bg-emerald-500';
};

export const getResourceTypeLabel = (type: ResourceType | string): string => {
  const map: Record<string, string> = {
    LIBRARY: 'Library',
    COMPUTER_LAB: 'Computer Lab',
    STUDY_ROOM: 'Study Room',
    CANTEEN: 'Canteen',
    SEMINAR_HALL: 'Seminar Hall',
    CLASSROOM: 'Classroom',
    RESEARCH_LAB: 'Research Lab',
    ACTIVITY_CENTER: 'Activity Center',
  };
  return map[type] || type;
};

export const getResourceTypeIcon = (type: string): string => {
  const map: Record<string, string> = {
    LIBRARY: '📚',
    COMPUTER_LAB: '💻',
    STUDY_ROOM: '📖',
    CANTEEN: '🍴',
    SEMINAR_HALL: '🎤',
    CLASSROOM: '🏫',
    RESEARCH_LAB: '🧪',
    ACTIVITY_CENTER: '⚽',
  };
  return map[type] || '🏢';
};

export const formatTimeAgo = (date: Date | string): string => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

export const formatTime = (date: Date = new Date()): string => {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export const cn = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};

export const truncate = (str: string, max: number) =>
  str.length > max ? str.slice(0, max) + '…' : str;
