import { OfflineLicense, SyncStatus } from '../types';
import { initialOfflineLicense, initialSyncStatus } from '../data/mockData';

const LICENSE_KEY = 'ecolisa_offline_license';
const SYNC_KEY = 'ecolisa_sync_status';
const PENDING_QUEUE_KEY = 'ecolisa_offline_queue';

export class OfflineStorageService {
  public static getLicense(): OfflineLicense {
    const stored = localStorage.getItem(LICENSE_KEY);
    if (!stored) {
      this.saveLicense(initialOfflineLicense);
      return initialOfflineLicense;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return initialOfflineLicense;
    }
  }

  public static saveLicense(license: OfflineLicense): void {
    localStorage.setItem(LICENSE_KEY, JSON.stringify(license));
  }

  public static getSyncStatus(): SyncStatus {
    const stored = localStorage.getItem(SYNC_KEY);
    if (!stored) {
      this.saveSyncStatus(initialSyncStatus);
      return initialSyncStatus;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return initialSyncStatus;
    }
  }

  public static saveSyncStatus(status: SyncStatus): void {
    localStorage.setItem(SYNC_KEY, JSON.stringify(status));
  }

  public static enqueueOfflineChange(table: string, action: 'INSERT' | 'UPDATE' | 'DELETE', payload: any): void {
    const queue = this.getPendingQueue();
    queue.push({
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      table,
      action,
      payload,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(queue));

    const status = this.getSyncStatus();
    status.pendingQueueCount = queue.length;
    this.saveSyncStatus(status);
  }

  public static getPendingQueue(): any[] {
    const stored = localStorage.getItem(PENDING_QUEUE_KEY);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  public static clearQueue(): void {
    localStorage.removeItem(PENDING_QUEUE_KEY);
    const status = this.getSyncStatus();
    status.pendingQueueCount = 0;
    status.lastSyncedAt = new Date().toLocaleString();
    status.cloudSyncState = 'IDLE';
    this.saveSyncStatus(status);
  }
}
