import React from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { RefreshCw, WifiOff } from 'lucide-react';

interface LiveIndicatorProps {
  isConnected?: boolean;
  className?: string;
}

export const LiveIndicator: React.FC<LiveIndicatorProps> = ({ className = '' }) => {
  const { connectionState } = useWebSocket();

  if (connectionState === 'CONNECTED') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm ${className}`}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>● LIVE</span>
      </div>
    );
  }

  if (connectionState === 'RECONNECTING') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/40 animate-pulse ${className}`}>
        <RefreshCw className="h-2.5 w-2.5 animate-spin text-amber-400" />
        <span>RECONNECTING...</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/40 ${className}`}>
      <WifiOff className="h-2.5 w-2.5 text-rose-400" />
      <span>OFFLINE</span>
    </div>
  );
};
