import React from 'react';
import { cn } from '@/utils/helpers';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  isPositive?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, change, isPositive = true }) => {
  return (
    <div className="card p-6 flex flex-col justify-between h-32 hover:shadow-premium transition-shadow group">
      <div className="flex justify-between items-start">
        <p className="text-text-muted text-sm font-medium">{title}</p>
        <div className={cn(
          "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
          isPositive ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
        )}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{change} vs Previous period</span>
        </div>
      </div>
      
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold text-text-dark group-hover:text-secondary transition-colors">{value}</h3>
      </div>
    </div>
  );
};

export default StatsCard;
