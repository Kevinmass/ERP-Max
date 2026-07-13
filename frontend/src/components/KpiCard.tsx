import { TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'purple' | 'orange';
  className?: string;
}

export default function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'blue',
  className = ''
}: KpiCardProps) {
  const Icon = icon;
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200',
      hover: 'hover:bg-blue-100'
    },
    green: {
      bg: 'bg-green-50',
      text: 'text-green-600',
      border: 'border-green-200',
      hover: 'hover:bg-green-100'
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-200',
      hover: 'hover:bg-purple-100'
    },
    orange: {
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      border: 'border-orange-200',
      hover: 'hover:bg-orange-100'
    }
  };

  const colors = colorClasses[color];

  return (
    <div 
      className={`
        bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300
        hover:scale-105 hover:shadow-lg hover:border-gray-300
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {Icon && (
            <div className={`p-2 rounded-lg ${colors.bg} ${colors.border}`}>
              <Icon className={`w-6 h-6 ${colors.text}`} strokeWidth={1.5} />
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">{title}</h3>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        
        {/* Trend Indicator */}
        {trend && (
          <div className={`flex items-center space-x-1 text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive
              ? <TrendingUp className="w-4 h-4" strokeWidth={1.5} />
              : <TrendingDown className="w-4 h-4" strokeWidth={1.5} />}
            <span>{Math.abs(trend.value)}%</span>
            <span className="text-gray-500">{trend.label}</span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-end justify-between">
        <div className="text-3xl font-bold text-gray-900">
          {value}
        </div>
        <div className={`text-xs font-medium ${colors.text} px-2 py-1 rounded-full ${colors.bg}`}>
          {color === 'blue' && 'General'}
          {color === 'green' && 'Bueno'}
          {color === 'purple' && 'Importante'}
          {color === 'orange' && 'Alerta'}
        </div>
      </div>
    </div>
  );
}