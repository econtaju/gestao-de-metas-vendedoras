import React, { useState, useMemo, useEffect } from 'react';
import {
  PlusCircle,
  DollarSign,
  Calendar,
  Building2,
  User,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Layers,
  FileCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  calculateSalePerformance,
  formatCurrency,
  formatPercent,
  getActiveLevels,
} from '../../services/financialEngine';
import { PeriodType } from '../../types';

function computePeriodDates(type: PeriodType, num: number, year: number = 2026): [string, string] {
  if (type === 'weekly') {
    const weekStartDates = [
      '2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26',
      '2026-02-02', '2026-02-09', '2026-02-16', '2026-02-23',
      '2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23',
    ];
    const weekEndDates = [
      '2026-01-11', '2026-01-18', '2026-01-25', '2026-02-01',
      '2026-02-08', '2026-02-15', '2026-02-22', '2026-03-01',
      '2026-03-08', '2026-03-15', '2026-03-22', '2026-03-29',
    ];
    const idx = Math.max(0, Math.min(11, num - 1));
    return [weekStartDates[idx] || `${year}-03-23`, weekEndDates[idx] || `${year}-03-29`];
  } else {
    const mStr = String(num).padStart(2, '0');
    const lastDay = new Date(year, num, 0).getDate();
    return [`${year}-${mStr}-01`, `${year}-${mStr}-${String(lastDay).padStart(2, '0')}`];
  }
}

export const SalesEntry: React.FC = () => {
  const {
    activeCompany,
    companyBranches,
    companySellers,
    addSale,
    setCurrentView,
    activePeriodNumber,
    masterGoals,
  } = useApp();

  const [branchId, setBranchId] = useState<string>(() => companyBranches[0]?.id || '');
  const [sellerId, setSellerId] = useState<string>(() => {
    const firstInBranch = companySellers.find((s) => s.branchId === companyBranches[0]?.id);
    return firstInBranch?.id || companySellers[0]?.id || '';
  });

  const [periodType, setPeriodType] = useState<PeriodType>('weekly');
  const [periodNumber, setPeriodNumber] = useState<number>(
    typeof activePeriodNumber === 'number' ? activePeriodNumber : 12
  );
  const [startDate, setStartDate] = useState<string>(() => {
    const num = typeof activePeriodNumber === 'number' ? activePeriodNumber : 12;
    return computePeriodDates('weekly', num)[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const num = typeof activePeriodNumber === 'number' ? activePeriodNumber : 12;
    return computePeriodDates('weekly', num)[1];
  });
  const [revenueInput, setRevenueInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Atualiza datas automaticamente ao mudar tipo ou número do período
  useEffect(() => {
    const [s, e] = computePeriodDates(periodType, periodNumber);
    setStartDate(s);
    setEndDate(e);
  }, [periodType, periodNumber]);

  // Atualiza branchId e sellerId automaticamente ao trocar de empresa ou filiais
  useEffect(() => {
    if (!companyBranches.some((b) => b.id === branchId)) {
      const firstBranchId = companyBranches[0]?.id || '';
      setBranchId(firstBranchId);
      const firstSeller = companySellers.find((s) => s.branchId === firstBranchId) || companySellers[0];
      setSellerId(firstSeller?.id || '');
    } else if (!companySellers.some((s) => s.id === sellerId)) {
      const firstSeller = companySellers.find((s) => s.branchId === branchId) || companySellers[0];
      setSellerId(firstSeller?.id || '');
    }
  }, [companyBranches, companySellers, branchId, sellerId]);

  // Filter sellers for selected branch
  const branchSellers = useMemo(() => {
    const filtered = companySellers.filter((s) => s.branchId === branchId);
    if (filtered.length > 0) return filtered;
    return companySellers; // Fallback se a filial não tiver vendedora vinculada
  }, [companySellers, branchId]);

  // When branch changes, select first seller in that branch
  const handleBranchChange = (newBranchId: string) => {
    setBranchId(newBranchId);
    const firstSeller = companySellers.find((s) => s.branchId === newBranchId);
    if (firstSeller) {
      setSellerId(firstSeller.id);
    }
  };

  const selectedSeller = useMemo(() => {
    return companySellers.find((s) => s.id === sellerId);
  }, [companySellers, sellerId]);

  const dynamicTarget = useMemo(() => {
    const year = 2026;
    let monthNumber = 1;
    let weekIndex = 0;
    
    if (periodType === 'weekly') {
      const weekNum = periodNumber;
      if (weekNum >= 1 && weekNum <= 4) {
        monthNumber = 1;
        weekIndex = weekNum - 1;
      } else if (weekNum >= 5 && weekNum <= 8) {
        monthNumber = 2;
        weekIndex = weekNum - 5;
      } else if (weekNum >= 9 && weekNum <= 12) {
        monthNumber = 3;
        weekIndex = weekNum - 9;
      } else {
        monthNumber = Math.ceil(weekNum / 4);
        weekIndex = (weekNum - 1) % 4;
      }
    } else {
      monthNumber = periodNumber;
    }
    
    const key = `${activeCompany.id}-${branchId}-${year}-${monthNumber}`;
    const mGoal = masterGoals[key];
    const share = selectedSeller?.officialSharePercentage ?? 25;
    
    if (mGoal) {
      if (periodType === 'weekly' && mGoal.weeks && mGoal.weeks[weekIndex]) {
        return Math.round(mGoal.weeks[weekIndex].revenueTarget * (share / 100));
      } else {
        return Math.round(mGoal.monthlyTarget * (share / 100));
      }
    }
    
    return selectedSeller?.weeklyTarget || activeCompany.levels[0]?.revenueTarget || 30000;
  }, [activeCompany.id, branchId, periodType, periodNumber, selectedSeller, masterGoals, activeCompany.levels]);

  const revenueValue = parseFloat(revenueInput) || 0;

  // Real-time calculation preview
  const previewCalculation = useMemo(() => {
    return calculateSalePerformance(
      revenueValue,
      activeCompany.levels,
      activeCompany.numberOfLevels,
      activeCompany.financialSettings,
      dynamicTarget
    );
  }, [revenueValue, activeCompany, dynamicTarget]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revenueValue || revenueValue <= 0) {
      alert('Por favor, informe um valor de faturamento válido.');
      return;
    }
    if (!sellerId) {
      alert('Selecione um vendedor.');
      return;
    }

    const label =
      periodType === 'weekly'
        ? `Semana ${periodNumber.toString().padStart(2, '0')} (${startDate.slice(8, 10)}/${startDate.slice(5, 7)} - ${endDate.slice(8, 10)}/${endDate.slice(5, 7)})`
        : `Mês ${periodNumber.toString().padStart(2, '0')}/2026`;

    const effectiveBranchId = branchId || selectedSeller?.branchId || companyBranches[0]?.id || `branch-${activeCompany.id}-matriz`;

    addSale({
      companyId: activeCompany.id,
      branchId: effectiveBranchId,
      sellerId,
      periodType,
      year: 2026,
      periodNumber,
      periodLabel: label,
      startDate,
      endDate,
      revenue: revenueValue,
      target: dynamicTarget,
      notes,
    });

    setSuccessMessage(
      `Venda de ${formatCurrency(revenueValue)} para ${selectedSeller?.name} registrada com sucesso!`
    );
    setNotes('');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  return (
    <div id="sales-entry-view" className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-emerald-950 p-6 rounded-2xl text-white shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30">
            <PlusCircle className="w-5 h-5 text-emerald-300" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
            Lançamento Comercial
          </span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">
          Registro de Faturamento & Apuração em Tempo Real
        </h2>
        <p className="text-xs text-slate-300 mt-1 max-w-3xl">
          Lance os resultados semanais ou mensais dos vendedores. O sistema calcula automaticamente
          o nível de meta alcançado, comissão a pagar, CMV, impostos e margem de contribuição.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setCurrentView('sales_history')}
            className="text-xs text-emerald-700 hover:text-emerald-800 underline font-bold"
          >
            Ver Histórico Completo &rarr;
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Unidade */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  Unidade (Matriz / Filial)
                </label>
                <select
                  id="entry-branch-select"
                  value={branchId}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2.5 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {companyBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vendedor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  Vendedor
                </label>
                <select
                  id="entry-seller-select"
                  value={sellerId}
                  onChange={(e) => setSellerId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2.5 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {branchSellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Periodicidade
                </label>
                <select
                  value={periodType}
                  onChange={(e) => setPeriodType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2 font-medium"
                >
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Número do Período
                </label>
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={periodNumber}
                  onChange={(e) => setPeriodNumber(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-2 py-1.5 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Faturamento Realizado no Período (R$)
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Meta Base: {formatCurrency(dynamicTarget)}
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-sm">R$</span>
                <input
                  id="entry-revenue-input"
                  type="number"
                  step="100"
                  value={revenueInput}
                  onChange={(e) => setRevenueInput(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-lg font-extrabold rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Observações / Destaques da Semana
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Campanha de dia das mães, alto volume em lentes de contato..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              id="entry-btn-submit"
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Gravar Lançamento de Venda
            </button>
          </form>
        </div>

        {/* Live Calculation Preview Card */}
        <div className="lg:col-span-6 bg-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm tracking-tight text-slate-100">
                  Apuração Automática em Tempo Real
                </span>
              </div>
              <span className="text-xs bg-slate-800 text-slate-300 font-semibold px-2.5 py-0.5 rounded-full border border-slate-700">
                {selectedSeller?.name || 'Vendedor'}
              </span>
            </div>

            {/* Level Achieved Banner */}
            <div
              className={`mt-4 p-4 rounded-xl border flex items-center justify-between ${
                previewCalculation.achievedLevel >= 1
                  ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-200'
                  : 'bg-amber-950/50 border-amber-800/60 text-amber-200'
              }`}
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Nível de Meta Atingido
                </span>
                <span className="text-base font-bold text-white">
                  {previewCalculation.achievedLevelName}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  % Atingimento Meta 1
                </span>
                <span className="text-base font-bold text-emerald-400">
                  {previewCalculation.achievementPercentage.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Financial Grid */}
            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Comissão a Pagar</span>
                <span className="text-base font-bold text-amber-400">
                  {formatCurrency(previewCalculation.commissionAmount)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Taxa de {previewCalculation.commissionPercentage}% sobre o total
                </span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Margem de Contribuição</span>
                <span className="text-base font-bold text-emerald-400">
                  {formatCurrency(previewCalculation.contributionMarginAmount)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {previewCalculation.contributionMarginPercentage.toFixed(1)}% do faturamento
                </span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-slate-400 block text-[10px]">
                  CMV ({activeCompany.financialSettings.cmvPercentage}%)
                </span>
                <span className="text-sm font-semibold text-rose-300">
                  {formatCurrency(previewCalculation.cmvAmount)}
                </span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-slate-400 block text-[10px]">
                  Impostos ({activeCompany.financialSettings.taxPercentage}%)
                </span>
                <span className="text-sm font-semibold text-slate-200">
                  {formatCurrency(previewCalculation.taxAmount)}
                </span>
              </div>
            </div>

            {/* Gap to next level motivator */}
            {previewCalculation.nextLevelTarget && (
              <div className="mt-4 p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-700/60 text-xs">
                <div className="flex items-center justify-between text-indigo-200 font-semibold mb-1">
                  <span>Falta para Meta {previewCalculation.achievedLevel + 1}:</span>
                  <span className="font-bold text-white">
                    {formatCurrency(previewCalculation.gapToNextLevel)}
                  </span>
                </div>
                <p className="text-[11px] text-indigo-300 leading-relaxed">
                  Se vender mais {formatCurrency(previewCalculation.gapToNextLevel)}, a comissão salta
                  de {formatCurrency(previewCalculation.commissionAmount)} para{' '}
                  {formatCurrency(previewCalculation.potentialCommissionNextLevel || 0)} (Ganho de +
                  {formatCurrency(previewCalculation.potentialCommissionGain || 0)} para o vendedor!).
                </p>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            Regra comercial ativa: O percentual incide sobre todo o faturamento realizado no período.
          </div>
        </div>
      </div>
    </div>
  );
};
