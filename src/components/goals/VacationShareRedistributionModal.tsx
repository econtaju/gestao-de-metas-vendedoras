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
  Plus,
  RotateCcw,
  Check,
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

type RedistributionStrategy = 'custom' | 'single' | 'equal' | 'proportional';

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

  // Estratégia de redistribuição selecionada (default 'custom' para divisão individual direta)
  const [strategy, setStrategy] = useState<RedistributionStrategy>('custom');

  // Vendedora única escolhida na opção 'single'
  const [singleRecipientId, setSingleRecipientId] = useState<string>(() => {
    return recipientSellers[0]?.sellerId || '';
  });

  // Modo de input na divisão individual: em Reais (R$) ou em Porcentagem (%)
  const [customUnit, setCustomUnit] = useState<'currency' | 'percent'>('currency');

  // Alocações manuais individuais em R$ (sellerId -> valor adicional em R$)
  const [customAmountsAdd, setCustomAmountsAdd] = useState<Record<string, number>>({});

  // Cota liberada da vendedora de férias (em % e em R$)
  const shareToRedistribute = activeAbsentSeller?.uncoveredShare || 0;
  const targetToRedistribute = activeAbsentSeller?.uncoveredTarget || 0;

  // Totais da alocação individual personalizada
  const totalCustomAllocatedTarget = useMemo(() => {
    return Object.values(customAmountsAdd).reduce((acc, v) => acc + (Number(v) || 0), 0);
  }, [customAmountsAdd]);

  const totalCustomAllocatedShare = useMemo(() => {
    if (monthlyTarget <= 0) return 0;
    return Math.round((totalCustomAllocatedTarget / monthlyTarget) * 1000) / 10;
  }, [totalCustomAllocatedTarget, monthlyTarget]);

  const remainingTargetToAllocate = Math.round(targetToRedistribute - totalCustomAllocatedTarget);
  const remainingShareToAllocate = Math.round((shareToRedistribute - totalCustomAllocatedShare) * 10) / 10;

  const isCustomAllocationComplete =
    Math.abs(remainingTargetToAllocate) <= 2 || Math.abs(remainingShareToAllocate) <= 0.05;

  // Handlers para edição individual de cada vendedora
  const handleSetSellerAmount = (sellerId: string, amount: number) => {
    const safeAmount = Math.max(0, Math.round(amount));
    setCustomAmountsAdd((prev) => ({
      ...prev,
      [sellerId]: safeAmount,
    }));
  };

  const handleSetSellerShare = (sellerId: string, percentVal: number) => {
    const safePercent = Math.max(0, percentVal);
    const calculatedTarget = Math.round(monthlyTarget * (safePercent / 100));
    setCustomAmountsAdd((prev) => ({
      ...prev,
      [sellerId]: calculatedTarget,
    }));
  };

  const handleAllocateRemainingToSeller = (sellerId: string) => {
    const current = customAmountsAdd[sellerId] || 0;
    const canAdd = Math.max(0, remainingTargetToAllocate);
    setCustomAmountsAdd((prev) => ({
      ...prev,
      [sellerId]: current + canAdd,
    }));
  };

  const handleResetSellerAmount = (sellerId: string) => {
    setCustomAmountsAdd((prev) => {
      const next = { ...prev };
      delete next[sellerId];
      return next;
    });
  };

  const handleDistributeRemainingEqually = () => {
    if (remainingTargetToAllocate <= 0 || recipientSellers.length === 0) return;
    const unfilledSellers = recipientSellers.filter((s) => !(customAmountsAdd[s.sellerId] > 0));
    const targetGroup = unfilledSellers.length > 0 ? unfilledSellers : recipientSellers;
    const perSeller = Math.floor(remainingTargetToAllocate / targetGroup.length);

    setCustomAmountsAdd((prev) => {
      const updated = { ...prev };
      let allocatedSoFar = 0;
      targetGroup.forEach((s, idx) => {
        const isLast = idx === targetGroup.length - 1;
        const toAdd = isLast ? remainingTargetToAllocate - allocatedSoFar : perSeller;
        allocatedSoFar += toAdd;
        updated[s.sellerId] = (updated[s.sellerId] || 0) + toAdd;
      });
      return updated;
    });
  };

  const handleClearAllCustom = () => {
    setCustomAmountsAdd({});
  };

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

    if (strategy === 'custom') {
      // Divisão individual por vendedora
      recipientSellers.forEach((s) => {
        const addedTarget = customAmountsAdd[s.sellerId] || 0;
        const addedShare = monthlyTarget > 0 ? (addedTarget / monthlyTarget) * 100 : 0;
        result[s.sellerId] = Math.round((s.baseShare + addedShare) * 10) / 10;
      });

      // Se a alocação estiver completa, garante fechamento estrito em 100%
      if (isCustomAllocationComplete) {
        const currentSum = Object.values(result).reduce((acc, v) => acc + v, 0);
        const diff = Math.round((100 - currentSum) * 10) / 10;
        if (diff !== 0 && recipientSellers.length > 0) {
          const firstEdited = recipientSellers.find((s) => (customAmountsAdd[s.sellerId] || 0) > 0) || recipientSellers[0];
          result[firstEdited.sellerId] = Math.round((result[firstEdited.sellerId] + diff) * 10) / 10;
        }
      }
    } else if (strategy === 'single') {
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
      recipientSellers.forEach((s) => {
        result[s.sellerId] = Math.round((s.baseShare + extraPerSeller) * 10) / 10;
      });
      // Ajuste de resíduo
      const currentSum = Object.values(result).reduce((acc, v) => acc + v, 0);
      const diff = Math.round((100 - currentSum) * 10) / 10;
      if (diff !== 0 && recipientSellers.length > 0) {
        result[recipientSellers[0].sellerId] = Math.round((result[recipientSellers[0].sellerId] + diff) * 10) / 10;
      }
    } else if (strategy === 'proportional') {
      // Divisão proporcional à participação atual das presentes
      const totalPresentBase = recipientSellers.reduce((sum, s) => sum + s.baseShare, 0);
      recipientSellers.forEach((s) => {
        const ratio = totalPresentBase > 0 ? s.baseShare / totalPresentBase : 1 / recipientSellers.length;
        const extra = Math.round(shareToRedistribute * ratio * 10) / 10;
        result[s.sellerId] = Math.round((s.baseShare + extra) * 10) / 10;
      });
      // Ajuste de resíduo
      const currentSum = Object.values(result).reduce((acc, v) => acc + v, 0);
      const diff = Math.round((100 - currentSum) * 10) / 10;
      if (diff !== 0 && recipientSellers.length > 0) {
        result[recipientSellers[0].sellerId] = Math.round((result[recipientSellers[0].sellerId] + diff) * 10) / 10;
      }
    }

    return result;
  }, [
    activeAbsentSeller,
    recipientSellers,
    shareToRedistribute,
    strategy,
    singleRecipientId,
    customAmountsAdd,
    isCustomAllocationComplete,
    monthlyTarget,
    sellersWithAvail,
  ]);

  const totalPreviewPercentage = useMemo(() => {
    return Math.round(Object.values(previewShares).reduce((acc, v) => acc + v, 0) * 10) / 10;
  }, [previewShares]);

  const isPreviewValid =
    strategy === 'custom'
      ? isCustomAllocationComplete && Math.abs(100 - totalPreviewPercentage) < 0.2
      : Math.abs(100 - totalPreviewPercentage) < 0.1;

  // Executa a confirmação e aplica as novas porcentagens
  const handleConfirm = () => {
    if (!isPreviewValid) return;

    let desc = '';
    if (strategy === 'custom') {
      const parts = recipientSellers
        .filter((s) => (customAmountsAdd[s.sellerId] || 0) > 0)
        .map((s) => `${s.sellerName} (+${formatCurrency(customAmountsAdd[s.sellerId] || 0)})`)
        .join(', ');
      desc = `Cobertura individual de férias: cota de ${activeAbsentSeller?.sellerName} (${formatCurrency(targetToRedistribute)}) distribuída entre: ${parts || 'equipe'}.`;
    } else if (strategy === 'single') {
      const targetSeller = recipientSellers.find((s) => s.sellerId === singleRecipientId);
      desc = `Cobertura de férias: cota de ${activeAbsentSeller?.sellerName} (${shareToRedistribute}%) transferida integralmente para ${targetSeller?.sellerName}.`;
    } else if (strategy === 'equal') {
      desc = `Cobertura de férias: cota de ${activeAbsentSeller?.sellerName} (${shareToRedistribute}%) dividida igualmente entre as ${recipientSellers.length} vendedoras presentes.`;
    } else {
      desc = `Cobertura de férias: cota de ${activeAbsentSeller?.sellerName} (${shareToRedistribute}%) redistribuída proporcionalmente entre a equipe presente.`;
    }

    onApplyNewShares(previewShares, desc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full my-6 overflow-hidden border border-slate-200">
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
                Divida o valor que vai faltar entre as demais vendedoras até atingir a meta integral da loja ({monthName}/{year})
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

        <div className="p-5 sm:p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* Alerta inicial se nenhuma vendedora tiver férias */}
          {absentSellers.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <Info className="w-6 h-6 text-indigo-500 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">
                Nenhuma vendedora possui férias cadastradas para este mês ({monthName}/{year}).
              </p>
              <p className="text-[11px] text-slate-500">
                Cadastre as férias na aba <strong>"Disponibilidade & Férias"</strong> ou selecione uma vendedora abaixo para rebalancear a equipe.
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
                      onClick={() => {
                        setSelectedAbsentSellerId(s.sellerId);
                        setCustomAmountsAdd({});
                      }}
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
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-amber-700" />
                  Valor que vai faltar e precisa ser distribuído:
                </span>
                <span className="text-xs sm:text-sm font-mono font-black bg-amber-200 text-amber-950 px-3 py-1 rounded-full border border-amber-300 shadow-2xs">
                  {formatCurrency(targetToRedistribute)} (+{shareToRedistribute.toFixed(1)}%)
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/80">
                  <span className="text-[10px] text-slate-500 block">Cota Normal (Mês Cheio)</span>
                  <strong className="text-slate-800 font-mono text-xs sm:text-sm">
                    {formatCurrency(activeAbsentSeller.baseTarget)}
                  </strong>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    ({activeAbsentSeller.baseShare.toFixed(1)}%)
                  </span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/80">
                  <span className="text-[10px] text-emerald-700 block font-bold">Cota Dela (Dias Trabalhados)</span>
                  <strong className="text-emerald-700 font-mono text-xs sm:text-sm">
                    {formatCurrency(activeAbsentSeller.effectiveTarget)}
                  </strong>
                  <span className="text-[10px] text-emerald-600 block font-mono">
                    ({activeAbsentSeller.effectiveShare.toFixed(1)}%)
                  </span>
                </div>
                <div className="bg-amber-100/90 p-2.5 rounded-xl border border-amber-300 shadow-2xs">
                  <span className="text-[10px] text-amber-900 block font-black">Falta Distribuir (Cota Férias)</span>
                  <strong className="text-amber-950 font-mono text-xs sm:text-sm font-black">
                    {formatCurrency(targetToRedistribute)}
                  </strong>
                  <span className="text-[10px] text-amber-800 block font-mono font-bold">
                    (+{shareToRedistribute.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Seletor de Estratégia de Distribuição */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600" />
                Como você deseja repartir o valor de {formatCurrency(targetToRedistribute)}?
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
              {/* Opção 1: Divisão Individual / Personalizada (Destaque Principal) */}
              <button
                type="button"
                onClick={() => setStrategy('custom')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                  strategy === 'custom'
                    ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-slate-900">Divisão Individual</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Escolha individualmente quanto passar para cada vendedora até dar o valor total.
                </p>
              </button>

              {/* Opção 2: Vendedora Única */}
              <button
                type="button"
                onClick={() => setStrategy('single')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                  strategy === 'single'
                    ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-900">Vendedora Única</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Passa 100% do valor que falta para uma vendedora específica.
                </p>
              </button>

              {/* Opção 3: Divisão Igual */}
              <button
                type="button"
                onClick={() => setStrategy('equal')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                  strategy === 'equal'
                    ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-slate-900">Divisão Igual</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Divide igualmente em partes idênticas entre as {recipientSellers.length} presentes.
                </p>
              </button>

              {/* Opção 4: Proporcional */}
              <button
                type="button"
                onClick={() => setStrategy('proportional')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                  strategy === 'proportional'
                    ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-slate-900">Proporcional</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Reparte proporcionalmente com base na meta atual de cada uma.
                </p>
              </button>
            </div>

            {/* PAINEL 1: DIVISÃO INDIVIDUAL PERSONALIZADA */}
            {strategy === 'custom' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
                {/* Cabeçalho do Painel com Barra de Progresso e Ações */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        Atribuição Individual por Vendedora:
                      </span>
                      {isCustomAllocationComplete ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-300">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Valor 100% atingido
                        </span>
                      ) : remainingTargetToAllocate > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-full border border-amber-300">
                          Falta: {formatCurrency(remainingTargetToAllocate)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-900 text-[10px] font-bold rounded-full border border-rose-300">
                          Excesso: {formatCurrency(Math.abs(remainingTargetToAllocate))}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Distribuído: <strong>{formatCurrency(totalCustomAllocatedTarget)}</strong> de{' '}
                      <strong>{formatCurrency(targetToRedistribute)}</strong>
                    </div>
                  </div>

                  {/* Controles de Unidade e Atalhos */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center bg-white border border-slate-300 rounded-xl p-0.5 text-[11px] font-bold shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setCustomUnit('currency')}
                        className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                          customUnit === 'currency'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        R$ Reais
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomUnit('percent')}
                        className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                          customUnit === 'percent'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        % Porcentagem
                      </button>
                    </div>

                    {remainingTargetToAllocate > 0 && (
                      <button
                        type="button"
                        onClick={handleDistributeRemainingEqually}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                        title="Divide o valor restante igualmente entre as vendedoras"
                      >
                        Dividir Restante
                      </button>
                    )}

                    {totalCustomAllocatedTarget > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllCustom}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
                        title="Limpar todos os valores adicionados"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista de Vendedoras com Inputs Individuais */}
                <div className="space-y-2.5">
                  {recipientSellers.map((seller) => {
                    const currentAllocatedTarget = customAmountsAdd[seller.sellerId] || 0;
                    const currentAllocatedShare =
                      monthlyTarget > 0 ? Math.round((currentAllocatedTarget / monthlyTarget) * 1000) / 10 : 0;
                    const newTotalTarget = seller.baseTarget + currentAllocatedTarget;
                    const newTotalShare = Math.round((seller.baseShare + currentAllocatedShare) * 10) / 10;

                    return (
                      <div
                        key={seller.sellerId}
                        className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        {/* Identificação da Vendedora */}
                        <div className="min-w-[170px]">
                          <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            <span>{seller.sellerName}</span>
                            {seller.seniorityLevel && (
                              <span className="text-[10px] font-normal text-slate-500 uppercase">
                                ({seller.seniorityLevel})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Meta Atual: <span className="font-mono font-medium text-slate-700">{formatCurrency(seller.baseTarget)}</span> ({seller.baseShare.toFixed(1)}%)
                          </div>
                        </div>

                        {/* Campo de Entrada Numérica (R$ ou %) */}
                        <div className="flex items-center gap-2 flex-1 sm:justify-center">
                          <div className="relative w-36 sm:w-40">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">
                              {customUnit === 'currency' ? 'R$' : '%'}
                            </span>
                            <input
                              type="number"
                              min="0"
                              step={customUnit === 'currency' ? '100' : '0.1'}
                              value={
                                customUnit === 'currency'
                                  ? currentAllocatedTarget > 0
                                    ? currentAllocatedTarget
                                    : ''
                                  : currentAllocatedShare > 0
                                  ? currentAllocatedShare
                                  : ''
                              }
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                if (customUnit === 'currency') {
                                  handleSetSellerAmount(seller.sellerId, val);
                                } else {
                                  handleSetSellerShare(seller.sellerId, val);
                                }
                              }}
                              placeholder="0"
                              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                          </div>

                          {/* Botões Rápidos */}
                          {remainingTargetToAllocate > 0 && (
                            <button
                              type="button"
                              onClick={() => handleAllocateRemainingToSeller(seller.sellerId)}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 shrink-0"
                              title="Adiciona o valor que ainda falta distribuir diretamente nesta vendedora"
                            >
                              <Plus className="w-3 h-3 text-amber-700" />
                              <span>Restante</span>
                            </button>
                          )}

                          {currentAllocatedTarget > 0 && (
                            <button
                              type="button"
                              onClick={() => handleResetSellerAmount(seller.sellerId)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                              title="Zerar valor desta vendedora"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Nova Meta Calculada */}
                        <div className="text-right min-w-[130px] font-mono text-xs">
                          <div className="font-bold text-slate-900">
                            {formatCurrency(newTotalTarget)}
                          </div>
                          <div className="text-[10px] flex items-center justify-end gap-1">
                            <span className="font-bold text-indigo-700">({newTotalShare.toFixed(1)}%)</span>
                            {currentAllocatedTarget > 0 && (
                              <span className="text-emerald-700 font-bold">
                                +{formatCurrency(currentAllocatedTarget)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Banner de Feedback da Distribuição Individual */}
                <div className="pt-2">
                  {isCustomAllocationComplete ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-900 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Perfeito! O valor de <strong>{formatCurrency(targetToRedistribute)}</strong> foi 100% dividido entre as vendedoras. A meta da loja está completa.
                      </span>
                    </div>
                  ) : remainingTargetToAllocate > 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-950 font-medium">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          Ainda falta distribuir <strong>{formatCurrency(remainingTargetToAllocate)}</strong> ({remainingShareToAllocate.toFixed(1)}%) para atingir o valor total.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleDistributeRemainingEqually}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition shrink-0 cursor-pointer"
                      >
                        Completar Automaticamente
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-950 font-medium">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        Atenção: Você distribuiu <strong>{formatCurrency(Math.abs(remainingTargetToAllocate))}</strong> a mais do que o valor que faltava. Diminua os valores acima para fechar a conta.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PAINEL 2: SELETOR DE VENDEDORA ÚNICA */}
            {strategy === 'single' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 animate-in fade-in duration-150">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>Selecione a vendedora que absorverá integralmente os +{formatCurrency(targetToRedistribute)} (+{shareToRedistribute.toFixed(1)}%):</span>
                </label>
                <select
                  value={singleRecipientId}
                  onChange={(e) => setSingleRecipientId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  {recipientSellers.map((s) => (
                    <option key={s.sellerId} value={s.sellerId}>
                      {s.sellerName} (Atual: {formatCurrency(s.baseTarget)} [{s.baseShare.toFixed(1)}%] ➔ Nova: {formatCurrency(s.baseTarget + targetToRedistribute)} [{(s.baseShare + shareToRedistribute).toFixed(1)}%])
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
                Simulação Geral da Equipe ({branchName}):
              </span>
              <span
                className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                  isPreviewValid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                Soma da Equipe: {totalPreviewPercentage.toFixed(1)}% {isPreviewValid ? '✓ 100%' : '(Ajustando)'}
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
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {strategy === 'custom' && !isCustomAllocationComplete && (
              <span className="text-amber-700 font-medium">
                ⚠️ Distribua o valor total ({formatCurrency(targetToRedistribute)}) para liberar a confirmação.
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
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
              <span>Aplicar Redistribuição ({formatCurrency(targetToRedistribute)})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
