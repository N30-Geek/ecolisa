import { LicenceOffline, StatutSynchro } from '../types';
import { initialOfflineLicense, initialSyncStatus } from '../data/mockData';

const CLÉ_LICENCE = 'ecolisa_licence_offline';
const CLÉ_SYNCHRO = 'ecolisa_statut_synchro';
const CLÉ_FILE_ATTENTE = 'ecolisa_file_attente';

export class OfflineStorageService {
  public static getLicense(): LicenceOffline {
    const stocke = localStorage.getItem(CLÉ_LICENCE);
    if (!stocke) {
      this.saveLicense(initialOfflineLicense);
      return initialOfflineLicense;
    }
    try {
      return JSON.parse(stocke);
    } catch {
      return initialOfflineLicense;
    }
  }

  public static saveLicense(license: LicenceOffline): void {
    localStorage.setItem(CLÉ_LICENCE, JSON.stringify(license));
  }

  public static getSyncStatus(): StatutSynchro {
    const stocke = localStorage.getItem(CLÉ_SYNCHRO);
    if (!stocke) {
      this.saveSyncStatus(initialSyncStatus);
      return initialSyncStatus;
    }
    try {
      return JSON.parse(stocke);
    } catch {
      return initialSyncStatus;
    }
  }

  public static saveSyncStatus(status: StatutSynchro): void {
    localStorage.setItem(CLÉ_SYNCHRO, JSON.stringify(status));
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
    localStorage.setItem(CLÉ_FILE_ATTENTE, JSON.stringify(queue));

    const status = this.getSyncStatus();
    status.nombreEnAttente = queue.length;
    this.saveSyncStatus(status);
  }

  public static getPendingQueue(): any[] {
    const stocke = localStorage.getItem(CLÉ_FILE_ATTENTE);
    if (!stocke) return [];
    try {
      return JSON.parse(stocke);
    } catch {
      return [];
    }
  }

  public static clearQueue(): void {
    localStorage.removeItem(CLÉ_FILE_ATTENTE);
    const status = this.getSyncStatus();
    status.nombreEnAttente = 0;
    status.derniereSynchroA = new Date().toLocaleString();
    status.etatSynchroCloud = 'INACTIF';
    this.saveSyncStatus(status);
  }
}
