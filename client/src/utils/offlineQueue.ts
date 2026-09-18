/**
 * OmniEdu Offline Synchronization Queue
 * Zero-Cost Client-Side Engine for resilient classroom operation in spotty networks
 */

export interface QueuedAttendanceBatch {
  id: string;
  timestamp: string;
  tenantId: string;
  date: string;
  courseId?: string;
  classId?: string;
  hour?: number;
  period?: number;
  records: Array<{
    studentId: string;
    status: 'PRESENT' | 'ABSENT' | 'ON_DUTY' | 'LATE';
    remarks?: string;
  }>;
  summary: {
    total: number;
    present: number;
    absent: number;
    od: number;
    late: number;
  };
}

const STORAGE_KEY = 'omniedu_offline_attendance_queue_v1';

export function getOfflineQueue(): QueuedAttendanceBatch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read offline attendance queue from localStorage:', err);
    return [];
  }
}

export function enqueueOfflineAttendance(
  batch: Omit<QueuedAttendanceBatch, 'id' | 'timestamp'>
): QueuedAttendanceBatch {
  const queue = getOfflineQueue();
  const newEntry: QueuedAttendanceBatch = {
    ...batch,
    id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
  };

  queue.push(newEntry);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('omniedu:offline-queue-updated', { detail: queue }));
  } catch (err) {
    console.error('Failed to persist to offline attendance queue:', err);
  }

  return newEntry;
}

export function dequeueOfflineAttendance(id: string): void {
  const queue = getOfflineQueue();
  const filtered = queue.filter((item) => item.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('omniedu:offline-queue-updated', { detail: filtered }));
  } catch (err) {
    console.error('Failed to update offline attendance queue:', err);
  }
}

export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('omniedu:offline-queue-updated', { detail: [] }));
  } catch (err) {
    console.error('Failed to clear offline attendance queue:', err);
  }
}

export async function flushOfflineQueue(
  sendFn: (batch: QueuedAttendanceBatch) => Promise<any>
): Promise<{ synced: number; failed: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;
  const remaining: QueuedAttendanceBatch[] = [];

  for (const batch of queue) {
    try {
      await sendFn(batch);
      synced++;
    } catch (err) {
      console.error(`Failed to sync queued batch ${batch.id}:`, err);
      failed++;
      remaining.push(batch);
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
    window.dispatchEvent(new CustomEvent('omniedu:offline-queue-updated', { detail: remaining }));
  } catch (err) {
    console.error('Failed to update remaining queue after flush:', err);
  }

  return { synced, failed };
}
