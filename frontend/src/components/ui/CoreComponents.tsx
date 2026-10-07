import React from 'react';
import { cn, getCrowdBgColor } from '../../utils/helpers';

interface CrowdBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const CrowdBadge: React.FC<CrowdBadgeProps> = ({ status, className, size = 'md' }) => {
  const dotColor = status === 'QUIET' ? 'bg-emerald-400' : status === 'CROWDED' ? 'bg-red-400' : 'bg-amber-400';
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wide',
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
      getCrowdBgColor(status),
      className
    )}>
      <span className={cn('rounded-full animate-pulse-slow', size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2', dotColor)} />
      {status}
    </span>
  );
};

interface OccupancyGaugeProps {
  percent: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const OccupancyGauge: React.FC<OccupancyGaugeProps> = ({ percent, size = 'md', className }) => {
  const color = percent > 70 ? '#ef4444' : percent > 40 ? '#f59e0b' : '#10b981';
  const radius = size === 'sm' ? 22 : size === 'md' ? 32 : 44;
  const strokeW = size === 'sm' ? 3 : size === 'md' ? 4 : 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const svgSize = (radius + strokeW) * 2;
  const fontSize = size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-sm' : 'text-base';

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <svg width={svgSize} height={svgSize} className="-rotate-90">
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeW}
        />
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className={cn('absolute font-bold text-white', fontSize)}>{Math.round(percent)}%</span>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
  accent?: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'cyan';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, trend, accent = 'blue', className }) => {
  const accentMap: Record<string, string> = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
    green: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
    red: 'from-red-500/10 to-red-600/5 border-red-500/20',
    amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
    cyan: 'from-cyan-500/10 to-cyan-600/5 border-cyan-500/20',
  };
  const iconBg: Record<string, string> = {
    blue: 'bg-blue-500/15 text-blue-400',
    green: 'bg-emerald-500/15 text-emerald-400',
    red: 'bg-red-500/15 text-red-400',
    amber: 'bg-amber-500/15 text-amber-400',
    purple: 'bg-purple-500/15 text-purple-400',
    cyan: 'bg-cyan-500/15 text-cyan-400',
  };

  return (
    <div className={cn(
      'glass-card rounded-2xl p-5 bg-gradient-to-br border transition-all duration-300 hover:scale-[1.02]',
      accentMap[accent],
      className
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2.5 rounded-xl', iconBg[accent])}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className={cn('text-xs font-semibold flex items-center gap-0.5', trend >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-1 font-medium">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ className, lines = 3 }) => (
  <div className={cn('animate-pulse space-y-3', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className={cn('h-4 bg-white/5 rounded-lg', i === 0 ? 'w-3/4' : i === lines - 1 ? 'w-1/2' : 'w-full')} />
    ))}
  </div>
);

interface LiveBadgeProps {
  className?: string;
}

export const LiveBadge: React.FC<LiveBadgeProps> = ({ className }) => (
  <span className={cn('inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-widest', className)}>
    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-live" />
    LIVE
  </span>
);

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {icon && <div className="text-slate-500 mb-4 opacity-60">{icon}</div>}
    <h3 className="text-slate-300 font-semibold text-lg mb-2">{title}</h3>
    <p className="text-slate-500 text-sm max-w-xs">{message}</p>
    {action && <div className="mt-6">{action}</div>}
  </div>
);
