import React from 'react';
import { Wifi, WifiOff, Database, ServerCrash, RefreshCw } from 'lucide-react';
import { useConnectionStatus } from '../../offline/useConnectionStatus.js';
import { useSyncStatus } from '../../offline/useSyncStatus.js';
import { CONNECTION_STATUS } from '../../offline/connectionManager.js';

export function ConnectionBadge() {
  const { status, isOnline, checkNow } = useConnectionStatus();
  const { isSyncing, pendingCount, syncNow } = useSyncStatus();

  let config = {
    label: 'Online',
    icon: Wifi,
    className: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60',
    dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
    title: 'System operational: Backend and database connected (Click to re-check)'
  };

  if (status === CONNECTION_STATUS.DEGRADED) {
    config = {
      label: 'DB Down',
      icon: Database,
      className: 'bg-amber-950/70 border-amber-500/40 text-amber-300 hover:bg-amber-900/60',
      dotClass: 'bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]',
      title: 'Warning: Backend reachable, but MySQL database is disconnected (Click to retry)'
    };
  } else if (status === CONNECTION_STATUS.SERVER_DOWN) {
    config = {
      label: 'Server Offline',
      icon: ServerCrash,
      className: 'bg-orange-950/70 border-orange-500/40 text-orange-300 hover:bg-orange-900/60',
      dotClass: 'bg-orange-400 animate-pulse shadow-[0_0_8px_rgba(251,146,60,0.8)]',
      title: 'Backend server is unreachable (Click to retry)'
    };
  } else if (status === CONNECTION_STATUS.OFFLINE) {
    config = {
      label: 'Offline',
      icon: WifiOff,
      className: 'bg-rose-950/70 border-rose-500/40 text-rose-300 hover:bg-rose-900/60',
      dotClass: 'bg-rose-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]',
      title: 'No network connection detected (Click to re-check)'
    };
  }

  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      {/* 1. Connection Status Badge */}
      <button
        type="button"
        onClick={checkNow}
        title={config.title}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold tracking-tight transition-all select-none ${config.className}`}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${config.dotClass}`} />
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">{config.label}</span>
      </button>

      {/* 2. Offline Sync Pending Indicator */}
      {pendingCount > 0 && (
        <button
          type="button"
          onClick={() => isOnline && syncNow()}
          disabled={isSyncing || !isOnline}
          title={
            isOnline
              ? `${pendingCount} offline bill(s) ready to sync. Click to synchronize now.`
              : `${pendingCount} offline bill(s) saved locally. Will sync automatically when back online.`
          }
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold transition-all shadow-xs ${
            isOnline
              ? 'bg-[#FAF5E8] border-[#D4AF37] text-[#917118] hover:bg-[#F3E8C9]'
              : 'bg-slate-800 border-slate-600 text-slate-300 opacity-90 cursor-default'
          }`}
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-[#D4AF37]' : ''}`} />
          <span>
            {isSyncing ? 'Syncing...' : `${pendingCount} Offline`}
          </span>
        </button>
      )}
    </div>
  );
}
