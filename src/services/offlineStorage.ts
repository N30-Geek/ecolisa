import { LicenceOffline, StatutSynchro } from '../types';

const CLÉ_LICENCE = 'ecolisa_licence_offline';
const CLÉ_SYNCHRO = 'ecolisa_statut_synchro';
const CLÉ_FILE_ATTENTE = 'ecolisa_file_attente';

const generateDefaultLicense = (): LicenceOffline => {
  const today = new Date();
  const debut = new Date(today.getFullYear(), 0, 1);
  const expire = new Date(today.getFullYear(), 11, 31);
  const grace = new Date(today.getFullYear() + 1, 0, 14);
  const daysRemaining = Math.max(0, Math.floor((expire.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  return {
    hwid: 'HWID-ED25519-RDC-99201-NODE-MAC',
    typePlan: 'ANNUEL',
    debutLe: debut.toISOString().split('T')[0],
    expireLe: expire.toISOString().split('T')[0],
    graceJusquAu: grace.toISOString().split('T')[0],
    signatureEd25519: '302a300506032b6570032100e42d7f80459c909623812a149c991f827f8a1239847120aef1294',
    estValide: true,
    estEnPeriodeDeGrace: false,
    joursRestants: daysRemaining,
  };
};

const generateDefaultSyncStatus = (): StatutSynchro => ({
  estEnLigne: true,
  derniereSynchroA: new Date().toISOString().replace('T', ' ').slice(0, 19),
  nombreEnAttente: 0,
  tailleDbLocaleMo: 0.2,
  etatSynchroCloud: 'INACTIF',
});

export class OfflineStorageService {
  public static getLicense(): LicenceOffline {
    const stocke = localStorage.getItem(CLÉ_LICENCE);
    const fallback = generateDefaultLicense();
    if (!stocke) {
      this.saveLicense(fallback);
      return fallback;
    }
    try {
      return JSON.parse(stocke);
    } catch {
      return fallback;
    }
  }

  public static saveLicense(license: LicenceOffline): void {
    localStorage.setItem(CLÉ_LICENCE, JSON.stringify(license));
  }

  public static getSyncStatus(): StatutSynchro {
    const stocke = localStorage.getItem(CLÉ_SYNCHRO);
    const fallback = generateDefaultSyncStatus();
    if (!stocke) {
      this.saveSyncStatus(fallback);
      return fallback;
    }
    try {
      return JSON.parse(stocke);
    } catch {
      return fallback;
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
