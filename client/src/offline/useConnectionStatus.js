/**
 * React hook to subscribe to connection manager updates
 */

import { useState, useEffect } from 'react';
import { connectionManager, CONNECTION_STATUS } from './connectionManager.js';

export function useConnectionStatus() {
  const [status, setStatus] = useState(() => connectionManager.getStatus());

  useEffect(() => {
    const unsubscribe = connectionManager.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  return {
    status,
    isOnline: status === CONNECTION_STATUS.ONLINE,
    isOffline: status === CONNECTION_STATUS.OFFLINE,
    isDegraded: status === CONNECTION_STATUS.DEGRADED,
    isServerDown: status === CONNECTION_STATUS.SERVER_DOWN,
    checkNow: () => connectionManager.checkHealth(true)
  };
}

