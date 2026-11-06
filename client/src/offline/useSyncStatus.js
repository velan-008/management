import { useState, useEffect } from 'react';
import { syncManager } from './syncManager.js';

export function useSyncStatus() {
  const [syncState, setSyncState] = useState({
    isSyncing: syncManager.isSyncing,
    pendingCount: syncManager.pendingCount,
    lastSyncAt: syncManager.lastSyncAt
  });

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((state) => {
      setSyncState({ ...state });
    });
    return unsubscribe;
  }, []);

  return {
    ...syncState,
    syncNow: () => syncManager.syncAllPending(),
    refreshCount: () => syncManager.refreshPendingCount()
  };
}

