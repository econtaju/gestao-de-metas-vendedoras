import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  ArrowRight,
  RefreshCw,
  Layers,
  Building2,
  UserCheck,
  Check,
  X,
  Sparkles,
  Zap,
  Bookmark,
  History,
  ShieldCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '../../context/AppContext';
import { SmartImportPayload } from '../../types';
import { SmartImportDropzone } from './SmartImportDropzone';
import { SmartImportPreview } from './SmartImportPreview';
import { ImportAliasesManager } from './ImportAliasesManager';
import { ImportAuditHistory } from './ImportAuditHistory';

export const SalesImporter: React.FC = () => {
  const {
    activeCompany,
    setCurrentView,
    setActivePeriodNumber,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'smart' | 'aliases' | 'history'>('smart');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPayload, setCurrentPayload] = useState<SmartImportPayload | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ count: number; period: number } | null>(null);

  // Download Sample Template CSV / XLSX
  const handleDownloadTemplate = () => {
    const wsData = [
      ['VENDEDOR', 'UNIDADE', 'DATA_VENDA', 'VALOR_FATURADO', 'DINHEIRO', 'CARTAO', 'PIX_DIGITAL'],
      ['HELEN', 'Unidade BISS', '2026-08-14', 11333.30, 273.90, 8089.40, 2970.00],
      ['LUANA', 'Unidade BISS', '2026-08-14', 8617.90, 2038.50, 4806.40, 1773.00],
      ['DHEINIELYY', 'Unidade BISS', '2026-08-14', 8352.06, 882.20, 6806.86, 663.00],
      ['REJANE', 'Unidade BISS', '2026-08-14', 5419.60, 287.00, 4287.60, 845.00],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo_Vendas');
    XLSX.writeFile(wb, 'modelo_importacao_vendas_metarentavel.xlsx');
  };

  const handleParsed = (payload: SmartImportPayload) => {
    setCurrentPayload(payload);
    setSuccessInfo(null);
  };

  const handleSuccess = (count: number, period: number) => {
    setSuccessInfo({ count, period });
    setCurrentPayload(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  Importação Inteligente de Relatórios
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Motor semântico com reconhecimento automático de PDFs, planilhas Excel, conciliação e aprendizado de aliases.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
            >
              <FileDown className="w-4 h-4 text-slate-500" />
              <span>Baixar Planilha Modelo</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('smart');
              setCurrentPayload(null);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'smart'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Motor de Importação</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('aliases')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'aliases'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Aliases & Aprendizado</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Auditoria & Histórico</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successInfo && (
        <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base">Importação Concluída e Gravada no Banco!</h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                <strong>{successInfo.count} registros de vendas</strong> foram calculados e adicionados com sucesso para a <strong>Semana {successInfo.period}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActivePeriodNumber(successInfo.period);
                setCurrentView('dashboard');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <span>Ver no Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSuccessInfo(null)}
              className="px-3 py-2 rounded-xl text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* View Mode Router */}
      {activeTab === 'smart' && (
        <>
          {currentPayload ? (
            <SmartImportPreview
              payload={currentPayload}
              onCancel={() => setCurrentPayload(null)}
              onSuccess={handleSuccess}
            />
          ) : (
            <SmartImportDropzone
              onParsed={handleParsed}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
            />
          )}
        </>
      )}

      {activeTab === 'aliases' && <ImportAliasesManager />}

      {activeTab === 'history' && (
        <ImportAuditHistory
          onLoadPayload={(payload) => {
            setCurrentPayload(payload);
            setActiveTab('smart');
          }}
        />
      )}
    </div>
  );
};
