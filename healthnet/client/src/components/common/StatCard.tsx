import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  subValue?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  colorScheme?: 'teal' | 'rose' | 'amber' | 'blue' | 'purple' | 'emerald' | 'sky';
  variant?: 'teal' | 'rose' | 'amber' | 'blue' | 'purple' | 'emerald' | 'sky';
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  subValue,
  icon: Icon,
  trend,
  colorScheme,
  variant,
  onClick,
  className = ''
}) => {
  const chosenColor = variant || colorScheme || 'teal';
  const subText = subValue || subtitle;

  const colorMap = {
    teal: 'border-teal-500/20 from-teal-500/10 to-transparent text-teal-400',
    rose: 'border-rose-500/20 from-rose-500/10 to-transparent text-rose-400',
    amber: 'border-amber-500/20 from-amber-500/10 to-transparent text-amber-400',
    blue: 'border-sky-500/20 from-sky-500/10 to-transparent text-sky-400',
    sky: 'border-sky-500/20 from-sky-500/10 to-transparent text-sky-400',
    purple: 'border-purple-500/20 from-purple-500/10 to-transparent text-purple-400',
    emerald: 'border-emerald-500/20 from-emerald-500/10 to-transparent text-emerald-400'
  };

  const iconBgMap = {
    teal: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    blue: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    sky: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  };

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border bg-gradient-to-b ${colorMap[chosenColor as keyof typeof colorMap] || colorMap.teal} bg-slate-900/80 p-5 shadow-lg backdrop-blur-sm transition-all duration-200 hover:border-slate-600 ${
        onClick ? 'cursor-pointer hover:scale-[1.01]' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${iconBgMap[chosenColor as keyof typeof iconBgMap] || iconBgMap.teal}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
        {trend && (
          <span className={`text-xs font-medium ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend.value}
          </span>
        )}
      </div>

      {subText && (
        <p className="mt-1 text-xs text-slate-400">{subText}</p>
      )}
    </div>
  );
};
