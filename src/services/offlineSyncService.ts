import {
  syncCompanyToSupabase,
  deleteCompanyFromSupabase,
  syncBranchToSupabase,
  deleteBranchFromSupabase,
  syncSellerToSupabase,
  deleteSellerFromSupabase,
  syncMasterGoalToSupabase,
  syncSaleToSupabase,
  deleteSaleFromSupabase,
  syncUserToSupabase,
} from './supabaseService';
import {
  Company,
  Branch,
  Seller,
  SaleRecord,
  MonthlyMasterGoal,
  AppUser,
} from '../types';

export const OFFLINE_QUEUE_KEY = 'gmc_offline_sync_queue_v1';
export const LAST_SYNC_KEY = 'gmc_last_sync_timestamp';

export type OfflineSyncActionType =
  | 'sync_company'
  | 'delete_company'
  | 'sync_branch'
  | 'delete_branch'
  | 'sync_seller'
  | 'delete_seller'
  | 'sync_master_goal'
  | 'sync_sale'
  | 'delete_sale'
  | 'sync_user';

export interface OfflineQueueItem {
  id: string;
  type: OfflineSyncActionType;
  entityId: string;
  payload: any;
  timestamp: number;
  retries: number;
  error?: string;
}

export interface SyncResult {
  total: number;
  succeeded: number;
  failed: number;
}

type NetworkStatusListener = (online: boolean) => void;
type QueueListener = (queue: OfflineQueueItem[]) => void;
type SyncStatusListener = (isSyncing: boolean) => void;

class OfflineSyncManager {
  private networkListeners: Set<NetworkStatusListener> = new Set();
  private queueListeners: Set<QueueListener> = new Set();
  private syncListeners: Set<SyncStatusListener> = new Set();
  private isSyncing = false;
  private isOnlineState = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  public isOnline(): boolean {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine && this.isOnlineState;
    }
    return this.isOnlineState;
  }

  public getIsSyncing(): boolean {
    return this.isSyncing;
  }

  public getLastSyncTimestamp(): number | null {
    if (typeof localStorage === 'undefined') return null;
    const stored = localStorage.getItem(LAST_SYNC_KEY);
    return stored ? parseInt(stored, 10) : null;
  }

  public setLastSyncTimestamp(ts: number) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LAST_SYNC_KEY, ts.toString());
    }
  }

  public getQueue(): OfflineQueueItem[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Erro ao ler fila offline do storage:', e);
      return [];
    }
  }

  public saveQueue(queue: OfflineQueueItem[]) {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      } catch (e) {
        console.error('Erro ao salvar fila offline no storage:', e);
      }
    }
    this.notifyQueueListeners(queue);
  }

  /**
   * Enfileira uma ação de escrita ou deleção para envio posterior quando houver rede.
   * Se já existir uma operação pendente para a mesma entidade, funde/atualiza para evitar duplicações.
   */
  public enqueueItem(
    type: OfflineSyncActionType,
    entityId: string,
    payload: any
  ): OfflineQueueItem {
    const currentQueue = this.getQueue();

    // Se for uma exclusão após criação local que nunca foi à nuvem, ou atualização da mesma entidade
    const existingIndex = currentQueue.findIndex(
      (item) => item.entityId === entityId && (item.type === type || (item.type.startsWith('sync_') && type.startsWith('delete_')))
    );

    const newItem: OfflineQueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      entityId,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };

    if (existingIndex >= 0) {
      // Substitui pela operação mais recente daquela entidade
      currentQueue[existingIndex] = newItem;
    } else {
      currentQueue.push(newItem);
    }

    this.saveQueue(currentQueue);
    return newItem;
  }

  public removeItem(itemId: string) {
    const currentQueue = this.getQueue();
    const filtered = currentQueue.filter((item) => item.id !== itemId);
    this.saveQueue(filtered);
  }

  public clearQueue() {
    this.saveQueue([]);
  }

  /**
   * Tenta processar toda a fila offline enviando item a item ao Supabase.
   */
  public async processQueue(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { total: 0, succeeded: 0, failed: 0 };
    }

    const queue = this.getQueue();
    if (queue.length === 0) {
      return { total: 0, succeeded: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.notifySyncListeners(true);

    let succeeded = 0;
    let failed = 0;
    const remainingQueue: OfflineQueueItem[] = [];

    for (const item of queue) {
      let success = false;
      try {
        switch (item.type) {
          case 'sync_company':
            success = await syncCompanyToSupabase(item.payload as Company);
            break;
          case 'delete_company':
            success = await deleteCompanyFromSupabase(item.entityId);
            break;
          case 'sync_branch':
            success = await syncBranchToSupabase(item.payload as Branch);
            break;
          case 'delete_branch':
            success = await deleteBranchFromSupabase(item.entityId);
            break;
          case 'sync_seller':
            success = await syncSellerToSupabase(item.payload as Seller);
            break;
          case 'delete_seller':
            success = await deleteSellerFromSupabase(item.entityId);
            break;
          case 'sync_master_goal':
            success = await syncMasterGoalToSupabase(item.payload as MonthlyMasterGoal);
            break;
          case 'sync_sale':
            success = await syncSaleToSupabase(item.payload as SaleRecord);
            break;
          case 'delete_sale':
            success = await deleteSaleFromSupabase(item.entityId);
            break;
          case 'sync_user':
            success = await syncUserToSupabase(item.payload as AppUser);
            break;
          default:
            success = true;
            break;
        }
      } catch (err: any) {
        success = false;
        item.error = err?.message || 'Falha de rede';
      }

      if (success) {
        succeeded++;
      } else {
        failed++;
        item.retries += 1;
        remainingQueue.push(item);
      }
    }

    this.saveQueue(remainingQueue);

    if (succeeded > 0) {
      this.setLastSyncTimestamp(Date.now());
    }

    this.isSyncing = false;
    this.notifySyncListeners(false);

    return {
      total: queue.length,
      succeeded,
      failed,
    };
  }

  /**
   * Checagem ativa de conectividade real via fetch rápido com timeout.
   */
  public async checkRealConnection(): Promise<boolean> {
    if (typeof window === 'undefined') return true;
    if (!navigator.onLine) {
      this.isOnlineState = false;
      this.notifyNetworkListeners(false);
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // Ping no próprio domínio ou endpoint confiável
      const response = await fetch(window.location.origin + '/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      }).catch(async () => {
        // Fallback: ping leve para testar conectividade se favicon não responder
        return await fetch('https://iaoyxeehyviyfyckzwxc.supabase.co/rest/v1/', {
          method: 'HEAD',
          headers: { apikey: 'test' },
          signal: controller.signal,
        });
      });

      clearTimeout(timeoutId);
      const isOk = response.status >= 200 && response.status < 500;
      this.isOnlineState = isOk;
      this.notifyNetworkListeners(isOk);
      return isOk;
    } catch {
      // Se abortou ou deu timeout de conexão
      this.isOnlineState = false;
      this.notifyNetworkListeners(false);
      return false;
    }
  }

  private handleOnline() {
    this.isOnlineState = true;
    this.notifyNetworkListeners(true);
    // Processa a fila automaticamente quando a conexão retornar
    setTimeout(() => {
      this.processQueue().catch(() => {});
    }, 800);
  }

  private handleOffline() {
    this.isOnlineState = false;
    this.notifyNetworkListeners(false);
  }

  public subscribeToNetwork(listener: NetworkStatusListener): () => void {
    this.networkListeners.add(listener);
    listener(this.isOnline());
    return () => this.networkListeners.delete(listener);
  }

  public subscribeToQueue(listener: QueueListener): () => void {
    this.queueListeners.add(listener);
    listener(this.getQueue());
    return () => this.queueListeners.delete(listener);
  }

  public subscribeToSync(listener: SyncStatusListener): () => void {
    this.syncListeners.add(listener);
    listener(this.isSyncing);
    return () => this.syncListeners.delete(listener);
  }

  private notifyNetworkListeners(online: boolean) {
    this.networkListeners.forEach((fn) => {
      try {
        fn(online);
      } catch (e) {
        console.error('Erro em listener de rede:', e);
      }
    });
  }

  private notifyQueueListeners(queue: OfflineQueueItem[]) {
    this.queueListeners.forEach((fn) => {
      try {
        fn(queue);
      } catch (e) {
        console.error('Erro em listener de fila:', e);
      }
    });
  }

  private notifySyncListeners(isSyncing: boolean) {
    this.syncListeners.forEach((fn) => {
      try {
        fn(isSyncing);
      } catch (e) {
        console.error('Erro em listener de sync:', e);
      }
    });
  }
}

export const offlineSyncManager = new OfflineSyncManager();
