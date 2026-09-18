import { useState, useEffect, useCallback } from 'react';
import { getOfflineQueue, flushOfflineQueue, QueuedAttendanceBatch } from '../utils/offlineQueue';
import { apiClient } from '../services/apiClient';

export interface OfflineSyncStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: string | null;
  lastSyncResult: { synced: number; failed: number } | null;
  syncNow: () => Promise<{ synced: number; failed: number }>;
}

export function useOfflineSync(): OfflineSyncStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState<number>(() => getOfflineQueue().length);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<{ synced: number; failed: number } | null>(null);

  // Sync execution logic
  const syncNow = useCallback(async (): Promise<{ synced: number; failed: number }> => {
    if (isSyncing) return { synced: 0, failed: 0 };
    const queue = getOfflineQueue();
    if (queue.length === 0) {
      setPendingCount(0);
      return { synced: 0, failed: 0 };
    }

    setIsSyncing(true);
    try {
      const result = await flushOfflineQueue(async (batch: QueuedAttendanceBatch) => {
        return apiClient.post('/attendance/mark', {
          date: batch.date,
          hour: batch.hour,
          period: batch.period,
          courseId: batch.courseId,
          classId: batch.classId,
          entries: batch.records,
        });
      });

      setPendingCount(getOfflineQueue().length);
      setLastSyncTime(new Date().toLocaleTimeString());
      setLastSyncResult(result);
      return result;
    } catch (err) {
      console.error('Offline sync failed:', err);
      return { synced: 0, failed: queue.length };
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-flush pending queue on network recovery
      if (getOfflineQueue().length > 0) {
        syncNow();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleQueueUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<QueuedAttendanceBatch[]>;
      if (customEvent.detail) {
        setPendingCount(customEvent.detail.length);
      } else {
        setPendingCount(getOfflineQueue().length);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('omniedu:offline-queue-updated', handleQueueUpdated);

    // Initial check
    setPendingCount(getOfflineQueue().length);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('omniedu:offline-queue-updated', handleQueueUpdated);
    };
  }, [syncNow]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncTime,
    lastSyncResult,
    syncNow,
  };
}
