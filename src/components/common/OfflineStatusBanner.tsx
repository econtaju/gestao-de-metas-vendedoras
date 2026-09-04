import React, { useState } from 'react';
import { WifiOff, RefreshCw, CloudCheck, AlertCircle, CheckCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const OfflineStatusBanner: React.FC = () => {
  const {
    isOnline,
    isSyncing,
    pendingSyncCount,
    lastSyncTimestamp,
    triggerManualSync,
  } = useApp();

  const [isMinimized, setIsMinimized] = useState(false);

  // Se estiver online e não houver alterações pendentes e não estiver sincronizando, não ocupa espaço
  if (isOnline && pendingSyncCount === 0 && !isSyncing) {
    return null;
  }

  const formatLastSync = (ts: number | null) => {
    if (!ts) return 'Nunca';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full transition-all duration-300 z-20 shrink-0 select-none"
    >
      {!isOnline ? (
        // Modo Offline
        <div className="bg-amber-500/95 backdrop-blur-xs text-white px-4 py-2 text-xs md:text-sm font-medium shadow-md border-b border-amber-600/30">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1 bg-amber-600/60 rounded-md shrink-0">
                <WifiOff className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div className="truncate">
                <span className="font-bold tracking-tight">Modo Offline Ativo:</span>{' '}
                <span className="opacity-95">
                  {isMinimized
                    ? `${pendingSyncCount} alterações salvas localmente.`
                    : 'Suas alterações estão salvas com segurança neste dispositivo e serão enviadas para a nuvem automaticamente ao reconectar.'}
                </span>
                {pendingSyncCount > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-700/80 text-white">
                    {pendingSyncCount} {pendingSyncCount === 1 ? 'pendência' : 'pendências'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => triggerManualSync()}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                title="Tentar reconectar e sincronizar agora"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Reconectar'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-white/20 rounded-md text-white/80 hover:text-white transition"
                title={isMinimized ? 'Expandir aviso' : 'Minimizar aviso'}
              >
                {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Modo Online com Sincronização em Andamento ou Pendente
        <div className="bg-sky-600 text-white px-4 py-1.5 text-xs font-medium shadow-sm border-b border-sky-700">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-200" />
              <span>
                {isSyncing
                  ? `Sincronizando ${pendingSyncCount} alteração(ões) com o banco de dados na nuvem...`
                  : `Conexão restabelecida. ${pendingSyncCount} alteração(ões) prontas para envio.`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => triggerManualSync()}
              disabled={isSyncing}
              className="px-2.5 py-0.5 bg-sky-700 hover:bg-sky-800 text-white rounded text-[11px] font-semibold transition cursor-pointer"
            >
              {isSyncing ? 'Enviando...' : 'Sincronizar Agora'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
