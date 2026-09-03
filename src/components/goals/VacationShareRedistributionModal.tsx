import React, { useState, useMemo } from 'react';
import {
  X,
  Palmtree,
  ArrowRight,
  CheckCircle2,
  Users,
  Percent,
  Calculator,
  RefreshCw,
  Sparkles,
  Sliders,
  AlertTriangle,
  Info,
  DollarSign,
} from 'lucide-react';
import { Seller, SellerAvailability, WorkingDaysSettings, CommercialWeekPeriod } from '../../types';
import { formatCurrency, formatPercent } from '../../services/financialEngine';
import { getSellerIntervalAvailability } from '../../services/availabilityEngine';

interface VacationShareRedistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthlyTarget: number;
  monthNumber: number;
  monthName: string;
  year: number;
  branchName: string;
  sellers: {
    sellerId: string;
    sellerName: string;
    officialSharePercentage: number;
    seniorityLevel?: string;
  }[];
  availabilities: SellerAvailability[];
  workingDaysSettings: WorkingDaysSettings;
  weeks: CommercialWeekPeriod[];
  initialSellerId?: string;
  onApplyNewShares: (newShares: Record<string, number>, logDescription: string) => void;
}

type RedistributionStrategy = 'equal' | 'proportional' | 'single' | 'custom';

export const VacationShareRedistributionModal: React.FC<VacationShareRedistributionModalProps> = ({
  isOpen,
  onClose,
  monthlyTarget,
  monthNumber,
  monthName,
  year,
  branchName,
  sellers = [],
  availabilities = [],
  workingDaysSettings,
  weeks = [],
  initialSellerId,
  onApplyNewShares,
}) => {
  if (!isOpen) return null;

  // 1. Diagnóstico de cada vendedora no mês
  const mStr = String(monthNumber).padStart(2, '0');
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const monthStart = `${year}-${mStr}-01`;
  const monthEnd = `${year}-${mStr}-${String(lastDay).padStart(2, '0')}`;

  const sellersWithAvail = useMemo(() => {
    return sellers.map((s) => {
      const avail = getSellerIntervalAvailability(
        s.sellerId,
        monthStart,
        monthEnd,
        availabilities,
        workingDaysSettings
      );

      const baseShare = s.officialSharePercentage ?? (100 / Math.max(1, sellers.length));
      const baseTarget = Math.round(monthlyTarget * (baseShare / 100));

      // Se a vendedora tem férias no mês (factor < 1)
      const hasVacation = avail.factor < 0.999;
      // Participação proporcional ao tempo trabalhado
      const effectiveShare = Math.round(baseShare * avail.factor * 10) / 10;
      const effectiveTarget = Math.round(baseTarget * avail.factor);
      const uncoveredShare = Math.max(0, Math.round((baseShare - effectiveShare) * 10) / 10);
      const uncoveredTarget = Math.max(0, baseTarget - effectiveTarget);

      return {
        ...s,
        avail,
        baseShare,
        baseTarget,
        hasVacation,
        effectiveShare,
        effectiveTarget,
        uncoveredShare,
        uncoveredTarget,
      };
    });
  }, [sellers, monthStart, monthEnd, availabilities, workingDaysSettings, monthlyTarget]);

  // Lista de vendedoras que estão de férias neste mês
  const absentSellers = useMemo(
    () => sellersWithAvail.filter((s) => s.hasVacation),
    [sellersWithAvail]
  );

  // Vendedora selecionada como origem da cota a ser redistribuída
  const [selectedAbsentSellerId, setSelectedAbsentSellerId] = useState<string>(() => {
    if (initialSellerId && absentSellers.some((s) => s.sellerId === initialSellerId)) {
      return initialSellerId;
    }
    return absentSellers[0]?.sellerId || sellersWithAvail[0]?.sellerId || '';
  });

  const activeAbsentSeller = useMemo(() => {
    return sellersWithAvail.find((s) => s.sellerId === selectedAbsentSellerId) || absentSellers[0] || sellersWithAvail[0];
  }, [sellersWithAvail, selectedAbsentSellerId, absentSellers]);

  // Vendedoras que estão presentes / disponíveis para absorver cota
  const recipientSellers = useMemo(() => {
    return sellersWithAvail.filter((s) => s.sellerId !== activeAbsentSeller?.sellerId);
  }, [sellersWithAvail, activeAbsentSeller]);

  // Estratégia de redistribuição selecionada
  const [strategy, setStrategy] = useState<RedistributionStrategy>('equal');

  // Vendedora única escolhida na opção 'single'
  const [singleRecipientId, setSingleRecipientId] = useState<string>(() => {
    return recipientSellers[0]?.sellerId || '';
  });

  // Rateio personalizado em 'custom' (sellerId -> shareAdd)
  const [customSharesAdd, setCustomSharesAdd] = useState<Record<string, number>>({});

  // Cota liberada da vendedora de férias (em %)
  const shareToRedistribute = activeAbsentSeller?.uncoveredShare || 0;
  const targetToRedistribute = activeAbsentSeller?.uncoveredTarget || 0;

  // 2. Cálculo da nova distribuição simulada
  const previewShares = useMemo(() => {
    if (!activeAbsentSeller) return {};

    const result: Record<string, number> = {};

    // A vendedora ausente fica com sua cota proporcional trabalhada
    result[activeAbsentSeller.sellerId] = activeAbsentSeller.effectiveShare;

    if (recipientSellers.length === 0 || shareToRedistribute <= 0) {
      sellersWithAvail.forEach((s) => {
        if (s.sellerId !== activeAbsentSeller.sellerId) {
          result[s.sellerId] = s.baseShare;
        }
      });
      return result;
    }

    if (strategy === 'single') {
      // 100% da sobra vai para a vendedora única selecionada
      recipientSellers.forEach((s) => {
        if (s.sellerId === singleRecipientId) {
          result[s.sellerId] = Math.round((s.baseShare + shareToRedistribute) * 10) / 10;
        } else {
          result[s.sellerId] = s.baseShare;
        }
      });
    } else if (strategy === 'equal') {
      // Divisão igualitária entre todas as presentes
      const extraPerSeller = Math.round((shareToRedistribute / recipientSellers.length) * 10) / 10;
      recipientSellers.forEach((s, idx) => {
        // Compensação de arredondamento no último item para cravar exatamente 100%
        result[s.sellerId] = Math.round((s.baseShare + extraPerSeller) * 10) / 10;
      });
    } else if (strategy === 'proportional') {
      // Divisão proporcional à participação atual das presentes
      const totalPresentBase = recipientSellers.reduce((sum, s) => sum + s.baseShare, 0);
      recipientSellers.forEach((s) => {
        const ratio = totalPresentBase > 0 ? s.baseShare / totalPresentBase : 1 / recipientSellers.length;
        const extra = Math.round(shareToRedistribute * ratio * 10) / 10;
        result[s.sellerId] = Math.round((s.baseShare + extra) * 10) / 10;
      });
    } else if (strategy === 'custom') {
      recipientSellers.forEach((s) => {
        const add = customSharesAdd[s.sellerId] || 0;
        result[s.sellerId] = Math.round((s.baseShare + add) * 10) / 10;
      });
    }

    // Ajuste fino para fechar exatamente em 100%
    const currentSum = Object.values(result).reduce((acc, v) => acc + v, 0);
    const diff = Math.round((100 - currentSum) * 10) / 10;
    if (diff !== 0 && recipientSellers.length > 0) {
      const targetSellerId = strategy === 'single' ? singleRecipientId : recipientSellers[0].sellerId;
      if (result[targetSellerId] !== undefined) {
        result[targetSellerId] = Math.round((result[targetSellerId] + diff) * 10) / 10;
      }
    }

    return result;
  }, [
    activeAbsentSeller,
    recipientSellers,
    shareToRedistribute,
    strategy,
    singleRecipientId,
    customSharesAdd,
    sellersWithAvail,
  ]);

  const totalPreviewPercentage = useMemo(() => {
    return Math.round(Object.values(previewShares).reduce((acc, v) => acc + v, 0) * 10) / 10;
  }, [previewShares]);

  const isPreviewValid = Math.abs(100 - totalPreviewPercentage) < 0.1;

  // Executa a confirmação e aplica as novas porcentagens
  const handleConfirm = () => {
    if (!isPreviewValid) return;

    let desc = '';
    if (strategy === 'single') {
      const targetSeller = recipientSellers.find((s) => s.sellerId === singleRecipientId);
      desc = `Cobertura de férias: cota de ${activeAbsentSeller?.sellerName} (${shareToRedistribute}%) transferida integralmente para ${targetSeller?.sellerName}.`;
    } else if (strategy === 'equal') {
      desc = `Cobertura de férias: cota de ${activeAbsentSeller?.sellerName} (${shareToRedistribute}%) dividida igualmente entre as ${recipientSellers.length} vendedoras presentes.`;
    } else if (strategy === 'proportional') {
      desc = `Cobertura de férias: cota de ${activeAbsentSeller?.sellerName} (${shareToRedistribute}%) redistribuída proporcionalmente entre a equipe presente.`;
    } else {
      desc = `Cobertura de férias: cota de ${activeAbsentSeller?.sellerName} (${shareToRedistribute}%) redistribuída manualmente conforme rateio do gestor.`;
    }

    onApplyNewShares(previewShares, desc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full my-6 overflow-hidden border border-slate-200">
        {/* Header do Modal */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/30">
              <Palmtree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                Redistribuição & Cobertura de Férias
              </h3>
              <p className="text-xs text-slate-300">
                Transfira a cota restante da vendedora ausente para manter 100% da meta da loja ({monthName}/{year})
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
          {/* Alerta inicial se nenhuma vendedora tiver férias */}
          {absentSellers.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <Info className="w-6 h-6 text-indigo-500 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">
                Nenhuma vendedora possui férias cadastradas para este mês ({monthName}/{year}).
              </p>
              <p className="text-[11px] text-slate-500">
                Você pode registrar férias e atestados na aba <strong>"Disponibilidade & Férias"</strong> ou selecionar manualmente uma vendedora abaixo para rebalancear a equipe.
              </p>
            </div>
          ) : (
            /* Seletor de Vendedora com Férias */
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Palmtree className="w-4 h-4 text-amber-600" />
                  Vendedora em Período de Férias / Afastamento:
                </span>
                <span className="text-[11px] font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-semibold">
                  {absentSellers.length} {absentSellers.length === 1 ? 'afastamento' : 'afastamentos'} no mês
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {absentSellers.map((s) => {
                  const isSelected = s.sellerId === activeAbsentSeller?.sellerId;
                  return (
                    <button
                      key={s.sellerId}
                      type="button"
                      onClick={() => setSelectedAbsentSellerId(s.sellerId)}
                      className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-200'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900">{s.sellerName}</div>
                        <div className="text-[10px] text-slate-500">
                          {s.avail.daysAvailable}/{s.avail.daysExpected} dias úteis trabalhados
                        </div>
                      </div>
                      <div className="text-right font-mono text-xs">
                        <div className="font-bold text-amber-900">
                          -{formatCurrency(s.uncoveredTarget)}
                        </div>
                        <div className="text-[10px] text-amber-700 font-bold">
                          ({s.uncoveredShare}% a cobrir)
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Card Resumo do Diagnóstico da Cota a Repartir */}
          {activeAbsentSeller && (
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-amber-600" />
                  Cota restante a ser distribuída para as demais:
                </span>
                <span className="text-xs font-mono font-bold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full">
                  +{shareToRedistribute.toFixed(1)}% ({formatCurrency(targetToRedistribute)})
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white/80 p-2 rounded-xl border border-amber-200/80">
                  <span className="text-[10px] text-slate-500 block">Cota Normal</span>
                  <strong className="text-slate-800 font-mono">
                    {activeAbsentSeller.baseShare.toFixed(1)}% ({formatCurrency(activeAbsentSeller.baseTarget)})
                  </strong>
                </div>
                <div className="bg-white/80 p-2 rounded-xl border border-amber-200/80">
                  <span className="text-[10px] text-emerald-600 block font-semibold">Cota Dela (Trabalhada)</span>
                  <strong className="text-emerald-700 font-mono">
                    {activeAbsentSeller.effectiveShare.toFixed(1)}% ({formatCurrency(activeAbsentSeller.effectiveTarget)})
                  </strong>
                </div>
                <div className="bg-amber-100/70 p-2 rounded-xl border border-amber-300">
                  <span className="text-[10px] text-amber-800 block font-bold">Sobra a Cobrir</span>
                  <strong className="text-amber-950 font-mono">
                    +{shareToRedistribute.toFixed(1)}% ({formatCurrency(targetToRedistribute)})
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Escolha do Destinatário da Cota */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              Para quem você quer enviar essa diferença de cota?
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              {/* Opção 1: Divisão Igualitária */}
              <button
                type="button"
                onClick={() => setStrategy('equal')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-2 cursor-pointer ${
                  strategy === 'equal'
                    ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-slate-900">Divisão Igual</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Reparte a sobra igualmente entre todas as {recipientSellers.length} vendedoras presentes.
                </p>
              </button>

              {/* Opção 2: Divisão Proporcional */}
              <button
                type="button"
                onClick={() => setStrategy('proportional')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-2 cursor-pointer ${
                  strategy === 'proportional'
                    ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-slate-900">Proporcional</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Quem já tem cota maior absorve mais da diferença proporcionalmente.
                </p>
              </button>

              {/* Opção 3: Vendedora Específica */}
              <button
                type="button"
                onClick={() => setStrategy('single')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-2 cursor-pointer ${
                  strategy === 'single'
                    ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-900">Vendedora Única</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Escolha exatamente uma vendedora para cobrir 100% da cota restante.
                </p>
              </button>
            </div>

            {/* Seletor de Vendedora Única */}
            {strategy === 'single' && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 animate-in fade-in duration-150">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>Selecione a vendedora que absorverá os +{shareToRedistribute.toFixed(1)}% ({formatCurrency(targetToRedistribute)}):</span>
                </label>
                <select
                  value={singleRecipientId}
                  onChange={(e) => setSingleRecipientId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  {recipientSellers.map((s) => (
                    <option key={s.sellerId} value={s.sellerId}>
                      {s.sellerName} (Atual: {s.baseShare.toFixed(1)}% ➔ Nova: {(s.baseShare + shareToRedistribute).toFixed(1)}%)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Tabela Comparativa: Antes vs Depois */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Simulação da Nova Distribuição da Equipe ({branchName}):
              </span>
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  isPreviewValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                Soma: {totalPreviewPercentage.toFixed(1)}% {isPreviewValid ? '✓ 100%' : '⚠️ Não fecha 100%'}
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="p-3">Vendedora</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">% Atual</th>
                    <th className="p-3 text-center bg-indigo-950">Nova %</th>
                    <th className="p-3 text-right">Meta Atual</th>
                    <th className="p-3 text-right bg-slate-950">Nova Meta</th>
                    <th className="p-3 text-right">Variação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {sellersWithAvail.map((s) => {
                    const isAbsent = s.sellerId === activeAbsentSeller?.sellerId;
                    const newShare = previewShares[s.sellerId] ?? s.baseShare;
                    const newTarget = Math.round(monthlyTarget * (newShare / 100));
                    const diffTarget = newTarget - s.baseTarget;

                    return (
                      <tr
                        key={s.sellerId}
                        className={`hover:bg-slate-50/80 transition ${
                          isAbsent ? 'bg-amber-50/40' : newShare > s.baseShare ? 'bg-emerald-50/30' : ''
                        }`}
                      >
                        <td className="p-3 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                              {s.sellerName.charAt(0)}
                            </span>
                            <span>{s.sellerName}</span>
                          </div>
                        </td>

                        <td className="p-3 text-center">
                          {isAbsent ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                              <Palmtree className="w-3 h-3 text-amber-700" />
                              <span>Férias ({s.avail.daysAvailable}d)</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Presente</span>
                          )}
                        </td>

                        <td className="p-3 text-center font-mono text-slate-600">
                          {s.baseShare.toFixed(1)}%
                        </td>

                        <td className="p-3 text-center font-mono font-bold bg-indigo-50/50 text-indigo-700">
                          {newShare.toFixed(1)}%
                        </td>

                        <td className="p-3 text-right font-mono text-slate-600">
                          {formatCurrency(s.baseTarget)}
                        </td>

                        <td className="p-3 text-right font-mono font-bold bg-slate-100/70 text-slate-900">
                          {formatCurrency(newTarget)}
                        </td>

                        <td className="p-3 text-right font-mono font-bold">
                          {diffTarget === 0 ? (
                            <span className="text-slate-400">-</span>
                          ) : diffTarget > 0 ? (
                            <span className="text-emerald-700">+{formatCurrency(diffTarget)}</span>
                          ) : (
                            <span className="text-amber-800">{formatCurrency(diffTarget)}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer do Modal */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isPreviewValid || shareToRedistribute <= 0}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer ${
              isPreviewValid && shareToRedistribute > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Aplicar Redistribuição de Férias (100%)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
