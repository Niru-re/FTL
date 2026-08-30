import React from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Radio, Wifi, WifiOff, RefreshCw } from 'lucide-react';

export const LiveConnectionBadge: React.FC = () => {
  const { connectionState } = useWebSocket();

  if (connectionState === 'CONNECTED') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold tracking-wider select-none shadow-sm shadow-emerald-950/40">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="uppercase">LIVE</span>
      </div>
    );
  }

  if (connectionState === 'RECONNECTING') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-bold tracking-wider select-none animate-pulse">
        <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />
        <span className="uppercase">RECONNECTING...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[10px] font-bold tracking-wider select-none">
      <WifiOff className="h-3 w-3 text-rose-400" />
      <span className="uppercase">OFFLINE</span>
    </div>
  );
};
