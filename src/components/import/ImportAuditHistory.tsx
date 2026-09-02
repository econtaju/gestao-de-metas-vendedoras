import React, { useState } from 'react';
import {
  History,
  FileText,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ImportAuditRecord, SmartImportPayload } from '../../types';
import { formatCurrency } from '../../services/financialEngine';

interface ImportAuditHistoryProps {
  onLoadPayload: (payload: SmartImportPayload) => void;
}

export const ImportAuditHistory: React.FC<ImportAuditHistoryProps> = ({ onLoadPayload }) => {
  const { importAudits, companies, branches } = useApp();
  const [selectedAudit, setSelectedAudit] = useState<ImportAuditRecord | null>(null);

  if (importAudits.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <History className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
          Nenhuma importação registrada ainda
        </h3>
        <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
          Ao importar relatórios de vendas em PDF ou planilhas, os registros de auditoria e métricas de integridade ficarão salvos aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Auditoria de Importações Realizadas</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Rastreabilidade completa com dados brutos, scores de integridade matemática e data de gravação.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Arquivo / Documento</th>
                <th className="py-3 px-4">Empresa / Unidade</th>
                <th className="py-3 px-4">Período</th>
                <th className="py-3 px-4 text-center">Vendedoras</th>
                <th className="py-3 px-4 text-right">Faturamento</th>
                <th className="py-3 px-4 text-center">Score</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {importAudits.map((audit) => {
                const company = companies.find((c) => c.id === audit.companyId);
                const branch = branches.find((b) => b.id === audit.branchId);

                return (
                  <tr key={audit.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {new Date(audit.importedAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate max-w-xs">{audit.fileName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {company?.tradeName || company?.name || audit.companyId}
                      </div>
                      <div className="text-slate-400">{branch?.name || audit.branchId}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                      {audit.periodLabel || `${audit.startDate} a ${audit.endDate}`}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-xs">
                      {audit.sellersCount}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(audit.totalRevenue)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                          audit.confidenceScore >= 95
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : audit.confidenceScore >= 80
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                        }`}
                      >
                        {audit.confidenceScore}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedAudit(audit)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Ver Texto Bruto / Log"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {audit.payload && (
                          <button
                            type="button"
                            onClick={() => onLoadPayload(audit.payload!)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
                            title="Reabrir Prévia"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reabrir</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw Text Modal */}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Registro de Auditoria: {selectedAudit.fileName}
                </h4>
                <p className="text-xs text-slate-400">
                  Importado em {new Date(selectedAudit.importedAt).toLocaleString('pt-BR')} • Score {selectedAudit.confidenceScore}%
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAudit(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto font-mono text-xs bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 whitespace-pre-wrap flex-1 rounded-b-2xl">
              {selectedAudit.rawDocumentText || 'Texto original não armazenado para este registro.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
