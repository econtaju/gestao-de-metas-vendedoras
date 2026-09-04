import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  offlineSyncManager,
  OFFLINE_QUEUE_KEY,
  LAST_SYNC_KEY,
  OfflineQueueItem,
} from '../src/services/offlineSyncService';
import { Company, Seller, SaleRecord, MonthlyMasterGoal } from '../src/types';

// Mock do localStorage para ambiente Node.js
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value.toString();
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = new LocalStorageMock();
}

describe('Resiliência Offline, Outbox Queue & Sincronização em Segundo Plano', () => {
  beforeEach(() => {
    localStorage.clear();
    offlineSyncManager.clearQueue();
  });

  test('1. Fila Offline: inicia vazia e persiste novos itens no localStorage', () => {
    const queue = offlineSyncManager.getQueue();
    assert.strictEqual(queue.length, 0, 'A fila deve iniciar vazia');

    const testCompany: Partial<Company> = {
      id: 'comp-offline-01',
      name: 'Empresa Teste Offline',
      tradeName: 'Teste Offline',
    };

    const item = offlineSyncManager.enqueueItem('sync_company', 'comp-offline-01', testCompany);
    assert.strictEqual(item.entityId, 'comp-offline-01');
    assert.strictEqual(item.type, 'sync_company');

    const storedQueue = offlineSyncManager.getQueue();
    assert.strictEqual(storedQueue.length, 1, 'Deve conter 1 item na fila');
    assert.strictEqual(storedQueue[0].entityId, 'comp-offline-01');
    assert.strictEqual(storedQueue[0].payload.name, 'Empresa Teste Offline');

    // Valida persistência direta no localStorage
    const rawStorage = localStorage.getItem(OFFLINE_QUEUE_KEY);
    assert.ok(rawStorage, 'Deve estar gravado na chave do localStorage');
    const parsed = JSON.parse(rawStorage!);
    assert.strictEqual(parsed[0].entityId, 'comp-offline-01');
  });

  test('2. Idempotência da Fila: atualizações sucessivas da mesma entidade fundem no mesmo registro na fila', () => {
    const sellerV1: Partial<Seller> = {
      id: 'seller-off-1',
      name: 'Vendedora 1',
      officialSharePercentage: 25,
    };

    offlineSyncManager.enqueueItem('sync_seller', 'seller-off-1', sellerV1);
    assert.strictEqual(offlineSyncManager.getQueue().length, 1);

    // Segunda edição da mesma vendedora offline
    const sellerV2: Partial<Seller> = {
      id: 'seller-off-1',
      name: 'Vendedora 1 Editada',
      officialSharePercentage: 35,
    };

    offlineSyncManager.enqueueItem('sync_seller', 'seller-off-1', sellerV2);
    const queue = offlineSyncManager.getQueue();
    assert.strictEqual(queue.length, 1, 'Não deve duplicar a vendedora na fila');
    assert.strictEqual(queue[0].payload.name, 'Vendedora 1 Editada');
    assert.strictEqual(queue[0].payload.officialSharePercentage, 35);
  });

  test('3. Transição Criar -> Excluir Offline: deleção substitui sincronização anterior na fila', () => {
    const sale: Partial<SaleRecord> = {
      id: 'sale-offline-99',
      companyId: 'comp-1',
      grossValue: 5000,
    };

    offlineSyncManager.enqueueItem('sync_sale', 'sale-offline-99', sale);
    assert.strictEqual(offlineSyncManager.getQueue().length, 1);
    assert.strictEqual(offlineSyncManager.getQueue()[0].type, 'sync_sale');

    // Exclusão da mesma venda offline
    offlineSyncManager.enqueueItem('delete_sale', 'sale-offline-99', { id: 'sale-offline-99' });
    const queue = offlineSyncManager.getQueue();
    assert.strictEqual(queue.length, 1, 'Mantém apenas a operação mais recente');
    assert.strictEqual(queue[0].type, 'delete_sale');
  });

  test('4. Enfileiramento de Metas Master: salva MonthlyMasterGoal na fila com payload íntegro', () => {
    const goal: Partial<MonthlyMasterGoal> = {
      id: 'goal-c1-b1-2026-9',
      companyId: 'c1',
      branchId: 'b1',
      year: 2026,
      monthNumber: 9,
      monthlyTarget: 180000,
      status: 'published',
    };

    offlineSyncManager.enqueueItem('sync_master_goal', 'goal-c1-b1-2026-9', goal);
    const queue = offlineSyncManager.getQueue();
    assert.strictEqual(queue.length, 1);
    assert.strictEqual(queue[0].type, 'sync_master_goal');
    assert.strictEqual(queue[0].payload.monthlyTarget, 180000);
    assert.strictEqual(queue[0].payload.status, 'published');
  });

  test('5. Remoção e Limpeza da Fila: removeItem e clearQueue funcionam corretamente', () => {
    const item1 = offlineSyncManager.enqueueItem('sync_branch', 'branch-1', { name: 'Filial 1' });
    const item2 = offlineSyncManager.enqueueItem('sync_branch', 'branch-2', { name: 'Filial 2' });
    assert.strictEqual(offlineSyncManager.getQueue().length, 2);

    offlineSyncManager.removeItem(item1.id);
    const afterOneRemove = offlineSyncManager.getQueue();
    assert.strictEqual(afterOneRemove.length, 1);
    assert.strictEqual(afterOneRemove[0].id, item2.id);

    offlineSyncManager.clearQueue();
    assert.strictEqual(offlineSyncManager.getQueue().length, 0);
  });

  test('6. Controle de Timestamp da Última Sincronização', () => {
    assert.strictEqual(offlineSyncManager.getLastSyncTimestamp(), null, 'Timestamp inicial nulo');

    const now = Date.now();
    offlineSyncManager.setLastSyncTimestamp(now);
    assert.strictEqual(offlineSyncManager.getLastSyncTimestamp(), now);
  });

  test('7. Subscrição a Notificações de Fila: ouvinte é disparado a cada alteração', () => {
    let capturedQueueLength = -1;
    const unsubscribe = offlineSyncManager.subscribeToQueue((q) => {
      capturedQueueLength = q.length;
    });

    // Chamada inicial do listener
    assert.strictEqual(capturedQueueLength, 0);

    offlineSyncManager.enqueueItem('sync_company', 'comp-event-1', { name: 'Empresa Evento' });
    assert.strictEqual(capturedQueueLength, 1);

    offlineSyncManager.clearQueue();
    assert.strictEqual(capturedQueueLength, 0);

    unsubscribe();
    offlineSyncManager.enqueueItem('sync_company', 'comp-event-2', { name: 'Não deve disparar' });
    assert.strictEqual(capturedQueueLength, 0, 'Após unsubscribe não deve mais receber updates');
  });

  test('8. Processamento da Fila: lida com falhas graciosamente e incrementa retries sem perder dados', async () => {
    // Adiciona item que simula falha (chamando supabaseService offline no ambiente de teste)
    offlineSyncManager.enqueueItem('sync_company', 'comp-offline-fail', { id: 'comp-offline-fail', name: 'Falha' });
    
    // No ambiente Node de teste sem rede real para o Supabase, o fetch falha e o item deve ser mantido com retries = 1
    const result = await offlineSyncManager.processQueue();
    
    assert.strictEqual(result.total, 1);
    // Como estamos sem conexão configurada de teste com o Supabase real, o item fica na fila para retry
    const remaining = offlineSyncManager.getQueue();
    assert.strictEqual(remaining.length, 1);
    assert.strictEqual(remaining[0].retries, 1, 'Deve ter incrementado o número de tentativas');
  });
});
