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
  colorScheme?: 'teal' | 'rose' | 'amber' | 'blue' | 'purple' | 'emerald' | 'sky' | 'orange';
  variant?:     'teal' | 'rose' | 'amber' | 'blue' | 'purple' | 'emerald' | 'sky' | 'orange';
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
  className = '',
}) => {
  const chosenColor = variant || colorScheme || 'orange';
  const subText = subValue || subtitle;

  // Border + icon accent colours — light-mode palette
  const borderMap: Record<string, string> = {
    orange:  'border-orange-200',
    teal:    'border-teal-200',
    rose:    'border-rose-200',
    amber:   'border-amber-200',
    blue:    'border-blue-200',
    sky:     'border-sky-200',
    purple:  'border-purple-200',
    emerald: 'border-emerald-200',
  };

  const iconBgMap: Record<string, string> = {
    orange:  'bg-orange-50  text-orange-500  border-orange-200',
    teal:    'bg-teal-50    text-teal-600    border-teal-200',
    rose:    'bg-rose-50    text-rose-500    border-rose-200',
    amber:   'bg-amber-50   text-amber-600   border-amber-200',
    blue:    'bg-blue-50    text-blue-500    border-blue-200',
    sky:     'bg-sky-50     text-sky-500     border-sky-200',
    purple:  'bg-purple-50  text-purple-500  border-purple-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  };

  const border  = borderMap[chosenColor]  ?? borderMap.orange;
  const iconBg  = iconBgMap[chosenColor]  ?? iconBgMap.orange;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border ${border} bg-white p-5 shadow-card transition-all duration-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:shadow-card-md ${
        onClick ? 'cursor-pointer bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:scale-[1.01]' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-gray-900">{value}</span>
        {trend && (
          <span className={`text-xs font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
            {trend.value}
          </span>
        )}
      </div>

      {subText && (
        <p className="mt-1 text-xs text-gray-400">{subText}</p>
      )}
    </div>
  );
};
