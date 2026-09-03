import React, { useState } from 'react';
import {
  X,
  Calendar,
  CheckCircle2,
  Copy,
  Users,
  Sparkles,
  ArrowRight,
  Info,
  DollarSign,
} from 'lucide-react';
import { Seller, MonthlyMasterGoal } from '../../types';
import { formatCurrency } from '../../services/financialEngine';

interface ReplicateMonthlySharesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceMonthNumber: number;
  sourceMonthName: string;
  sourceYear: number;
  sourceMonthlyTarget: number;
  sellers: {
    sellerId: string;
    sellerName: string;
    officialSharePercentage: number;
  }[];
  existingMasterGoals: Record<string, MonthlyMasterGoal>;
  companyId: string;
  branchId: string;
  branchName: string;
  onConfirmReplication: (
    targetMonths: number[],
    replicateTargetToo: boolean,
    monthlyTargetToReplicate?: number
  ) => void;
}

const ALL_MONTHS = [
  { number: 1, name: 'Janeiro' },
  { number: 2, name: 'Fevereiro' },
  { number: 3, name: 'Março' },
  { number: 4, name: 'Abril' },
  { number: 5, name: 'Maio' },
  { number: 6, name: 'Junho' },
  { number: 7, name: 'Julho' },
  { number: 8, name: 'Agosto' },
  { number: 9, name: 'Setembro' },
  { number: 10, name: 'Outubro' },
  { number: 11, name: 'Novembro' },
  { number: 12, name: 'Dezembro' },
];

export const ReplicateMonthlySharesModal: React.FC<ReplicateMonthlySharesModalProps> = ({
  isOpen,
  onClose,
  sourceMonthNumber,
  sourceMonthName,
  sourceYear,
  sourceMonthlyTarget,
  sellers = [],
  companyId,
  branchId,
  branchName,
  onConfirmReplication,
}) => {
  // Inicialmente seleciona os meses seguintes ao mês de origem
  const [selectedMonths, setSelectedMonths] = useState<number[]>(() => {
    return ALL_MONTHS.filter((m) => m.number > sourceMonthNumber).map((m) => m.number);
  });

  const [replicateTargetToo, setReplicateTargetToo] = useState<boolean>(false);

  if (!isOpen) return null;

  const toggleMonth = (mNum: number) => {
    if (selectedMonths.includes(mNum)) {
      setSelectedMonths(selectedMonths.filter((n) => n !== mNum));
    } else {
      setSelectedMonths([...selectedMonths, mNum].sort((a, b) => a - b));
    }
  };

  const handleSelectAll = () => {
    setSelectedMonths(ALL_MONTHS.filter((m) => m.number !== sourceMonthNumber).map((m) => m.number));
  };

  const handleSelectRemaining = () => {
    setSelectedMonths(ALL_MONTHS.filter((m) => m.number > sourceMonthNumber).map((m) => m.number));
  };

  const handleClearAll = () => {
    setSelectedMonths([]);
  };

  const handleConfirm = () => {
    if (selectedMonths.length === 0) return;
    onConfirmReplication(selectedMonths, replicateTargetToo, sourceMonthlyTarget);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full my-6 overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                Replicar Padrão de Metas para Outros Meses
              </h3>
              <p className="text-xs text-slate-300">
                Copiar a distribuição percentual da equipe de {sourceMonthName}/{sourceYear}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Card Resumo do Padrão de Origem */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600" />
                Equipe Comercial ({sellers.length} vendedoras) • {branchName}:
              </span>
              <span className="text-[11px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                100% Validado
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {sellers.map((s) => (
                <div
                  key={s.sellerId}
                  className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between shadow-2xs"
                >
                  <span className="truncate font-semibold text-slate-800 text-[11px] pr-1">
                    {s.sellerName}
                  </span>
                  <span className="font-mono font-bold text-indigo-700 text-xs shrink-0">
                    {s.officialSharePercentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Seleção dos Meses de Destino */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Selecione os meses de destino ({sourceYear}):
              </label>

              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectRemaining}
                  className="px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-semibold transition"
                >
                  Meses Seguintes
                </button>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-semibold transition"
                >
                  Todos ({sourceYear})
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2 py-1 text-slate-500 hover:text-slate-800 transition"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Grid dos 12 meses */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {ALL_MONTHS.map((m) => {
                const isSource = m.number === sourceMonthNumber;
                const isSelected = selectedMonths.includes(m.number);

                return (
                  <button
                    key={m.number}
                    type="button"
                    disabled={isSource}
                    onClick={() => toggleMonth(m.number)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      isSource
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        : isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-200'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>{m.name}</span>
                    {isSource ? (
                      <span className="text-[9px] font-normal text-slate-400 font-sans">
                        (Mês atual)
                      </span>
                    ) : (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                          isSelected ? 'bg-indigo-700 text-indigo-100' : 'text-slate-400'
                        }`}
                      >
                        {isSelected ? '✓ Selecionado' : 'Clique p/ marcar'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Opção: Replicar também o valor da meta em R$ */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={replicateTargetToo}
                onChange={(e) => setReplicateTargetToo(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-amber-900 block">
                  Também replicar o valor da Meta Mensal ({formatCurrency(sourceMonthlyTarget)})
                </span>
                <span className="text-amber-800/80 text-[11px] leading-tight block mt-0.5">
                  Se desmarcado, cada mês manterá seu valor monetário já cadastrado e apenas as porcentagens de cada vendedora serão atualizadas proporcionalmente.
                </span>
              </div>
            </label>
          </div>

          {/* Dica de Segurança e Flexibilidade */}
          <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <span>
              💡 <strong>Flexibilidade Total:</strong> Após replicar, você continua podendo entrar em qualquer mês individualmente no Gerador de Metas e ajustar as metas ou porcentagens conforme a necessidade (ex: férias, contratações ou sazonalidade).
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedMonths.length === 0}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer ${
              selectedMonths.length > 0
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              Confirmar Replicação ({selectedMonths.length}{' '}
              {selectedMonths.length === 1 ? 'mês' : 'meses'})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
