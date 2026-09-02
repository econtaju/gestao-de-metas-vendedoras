import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Users,
  UserCheck,
  UserX,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Clock,
  Building2,
  TrendingUp,
  Settings,
  Info,
  History as HistoryIcon,
  Trash2,
  Edit2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Percent,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getSellerIntervalAvailability } from '../../services/availabilityEngine';
import {
  AbsenceType,
  AvailabilityRedistributionMethod,
  SellerAvailability,
  CompanyHoliday,
  DayOfWeekSchedule,
} from '../../types';
import { formatCurrency, formatPercent } from '../../services/financialEngine';

export const TeamAvailabilityView: React.FC = () => {
  const {
    activeCompany,
    companyBranches,
    companySellers,
    activeCompanyId,
    activeBranchId,
    availabilities,
    workingDaysSettings,
    addAvailability,
    deleteAvailability,
    updateWorkingDaysSettings,
    calculateAvailabilityRedistributionHelper,
    activeMasterGoal,
  } = useApp();

  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');

  // Atualiza branch quando mudar de empresa ou filiais disponíveis
  useEffect(() => {
    if (selectedBranchId !== 'all' && !companyBranches.some((b) => b.id === selectedBranchId)) {
      setSelectedBranchId('all');
    }
  }, [companyBranches, selectedBranchId]);

  const [selectedMonth, setSelectedMonth] = useState<number>(9);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [activeTab, setActiveTab] = useState<'calendar' | 'impact' | 'working_days' | 'history'>('calendar');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalBranchId, setModalBranchId] = useState<string>('all');
  const [sellerId, setSellerId] = useState<string>('');
  const [absenceType, setAbsenceType] = useState<AbsenceType>('vacation');
  const [startDate, setStartDate] = useState<string>('2026-09-05');
  const [endDate, setEndDate] = useState<string>('2026-09-15');
  const [availabilityPercentage, setAvailabilityPercentage] = useState<number>(0);
  const [redistributionMethod, setRedistributionMethod] = useState<AvailabilityRedistributionMethod>('proportional');
  const [adjustGoalLevelsProportionally, setAdjustGoalLevelsProportionally] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [manualAllocations, setManualAllocations] = useState<Record<string, number>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Holiday Form State
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('2026-09-07');

  // Vendedoras da unidade selecionada na tela principal
  const branchSellers = useMemo(() => {
    const activeCompSellers = companySellers.filter((s) => s.active);
    if (selectedBranchId === 'all') {
      return activeCompSellers;
    }
    const filtered = activeCompSellers.filter((s) => s.branchId === selectedBranchId);
    if (filtered.length > 0) return filtered;
    return activeCompSellers;
  }, [companySellers, selectedBranchId]);

  // Vendedoras disponíveis para o modal de cadastro de férias
  // Fallback robusto: se a filial selecionada não tiver vendedoras mas existirem vendedoras na empresa, lista todas as vendedoras
  const modalAvailableSellers = useMemo(() => {
    const activeCompSellers = companySellers.filter((s) => s.active);
    if (!modalBranchId || modalBranchId === 'all') {
      return activeCompSellers;
    }
    const filtered = activeCompSellers.filter((s) => s.branchId === modalBranchId);
    if (filtered.length > 0) return filtered;
    return activeCompSellers;
  }, [companySellers, modalBranchId]);

  // Sincroniza sellerId do modal quando abrir ou quando mudar a filial
  const handleOpenModal = () => {
    const defaultBranch = selectedBranchId !== 'all' ? selectedBranchId : 'all';
    setModalBranchId(defaultBranch);
    const available = defaultBranch !== 'all'
      ? companySellers.filter((s) => s.branchId === defaultBranch && s.active)
      : companySellers.filter((s) => s.active);
    
    const fallbackSeller = available[0]?.id || companySellers[0]?.id || '';
    setSellerId(fallbackSeller);
    setAbsenceType('vacation');
    setStartDate(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-05`);
    setEndDate(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-15`);
    setAvailabilityPercentage(0);
    setNotes('');
    setIsModalOpen(true);
  };

  // Garante que se houver vendedoras na empresa e o sellerId estiver vazio ao abrir, selecione a primeira
  useEffect(() => {
    if (isModalOpen && (!sellerId || !companySellers.some((s) => s.id === sellerId))) {
      if (modalAvailableSellers.length > 0) {
        setSellerId(modalAvailableSellers[0].id);
      } else if (companySellers.length > 0) {
        setSellerId(companySellers[0].id);
      }
    }
  }, [isModalOpen, modalAvailableSellers, companySellers, sellerId]);

  // Atualiza sellerId ao trocar a filial dentro do modal
  const handleModalBranchChange = (newBId: string) => {
    setModalBranchId(newBId);
    const sellersForBranch = newBId && newBId !== 'all'
      ? companySellers.filter((s) => s.branchId === newBId && s.active)
      : companySellers.filter((s) => s.active);
    if (!sellersForBranch.some((s) => s.id === sellerId)) {
      setSellerId(sellersForBranch[0]?.id || companySellers[0]?.id || '');
    }
  };

  // Lista de ausências filtradas pela unidade e período selecionado
  const filteredAvailabilities = useMemo(() => {
    return availabilities.filter((a) => {
      if (a.companyId !== activeCompanyId) return false;
      if (selectedBranchId !== 'all' && a.branchId !== selectedBranchId) return false;
      return true;
    });
  }, [availabilities, activeCompanyId, selectedBranchId]);

  // Efetiva branch para cálculo
  const effectiveCalcBranchId = selectedBranchId !== 'all' ? selectedBranchId : (companyBranches[0]?.id || `branch-${activeCompanyId}-matriz`);

  // Cálculo ao vivo de redistribuição da meta para a unidade e mês filtrados
  const redistributionResult = useMemo(() => {
    return calculateAvailabilityRedistributionHelper(
      activeCompanyId,
      effectiveCalcBranchId,
      selectedYear,
      selectedMonth,
      redistributionMethod,
      manualAllocations
    );
  }, [
    calculateAvailabilityRedistributionHelper,
    activeCompanyId,
    effectiveCalcBranchId,
    selectedYear,
    selectedMonth,
    redistributionMethod,
    manualAllocations,
    availabilities,
    companySellers,
  ]);

  // Handle Form Submit
  const handleSaveAvailability = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerId) {
      alert('Por favor, selecione uma vendedora para cadastrar a ausência/férias.');
      return;
    }

    const sellerObj = companySellers.find((s) => s.id === sellerId);
    const targetBranch = (modalBranchId && modalBranchId !== 'all')
      ? modalBranchId
      : (sellerObj?.branchId || companyBranches[0]?.id || `branch-${activeCompanyId}-matriz`);

    addAvailability({
      companyId: activeCompanyId,
      branchId: targetBranch,
      sellerId,
      absenceType,
      startDate,
      endDate,
      availabilityPercentage,
      redistributionEnabled: true,
      redistributionMethod,
      manualAllocations,
      adjustGoalLevelsProportionally,
      notes,
    });

    setIsModalOpen(false);
    setNotes('');
    showToast(`✅ Férias/Ausência de "${sellerObj?.name || 'Vendedora'}" cadastradas com sucesso!`);
  };

  const handleToggleWeekDay = (day: number) => {
    const updatedSchedule = workingDaysSettings.weeklySchedule.map((s) =>
      s.day === day ? { ...s, isOpen: !s.isOpen } : s
    );
    updateWorkingDaysSettings({
      ...workingDaysSettings,
      weeklySchedule: updatedSchedule,
    });
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName.trim() || !newHolidayDate) return;

    const newHol: CompanyHoliday = {
      id: `hol-${Date.now()}`,
      date: newHolidayDate,
      name: newHolidayName,
      isClosed: true,
    };

    updateWorkingDaysSettings({
      ...workingDaysSettings,
      holidays: [...workingDaysSettings.holidays, newHol],
    });

    setNewHolidayName('');
    showToast('Feriado adicionado ao calendário da empresa.');
  };

  const handleDeleteHoliday = (id: string) => {
    updateWorkingDaysSettings({
      ...workingDaysSettings,
      holidays: workingDaysSettings.holidays.filter((h) => h.id !== id),
    });
    showToast('Feriado removido.');
  };

  const getAbsenceBadge = (type: AbsenceType) => {
    switch (type) {
      case 'vacation':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-200">Férias</span>;
      case 'leave':
      case 'medical_leave':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-purple-100 text-purple-800 rounded-full border border-purple-200">Afastamento / Licença</span>;
      case 'training':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-100 text-blue-800 rounded-full border border-blue-200">Treinamento</span>;
      case 'day_off':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-700 rounded-full border border-slate-200">Folga</span>;
      case 'hiring':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">Entrada no Mês</span>;
      case 'termination':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-rose-100 text-rose-800 rounded-full border border-rose-200">Desligamento</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-indigo-100 text-indigo-800 rounded-full border border-indigo-200">Personalizado</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            <span>Módulo de Gestão de Ausências & Escala</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            Disponibilidade da Equipe, Férias & Redistribuição
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Cadastre períodos de férias e licenças das vendedoras de {activeCompany.tradeName}. O sistema calcula o impacto semanal e redistribui as metas sem deixar furos no faturamento.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Férias / Ausência
          </button>
        </div>
      </div>

      {/* FILTROS E SELEÇÃO DE PERÍODO/UNIDADE */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-600">Unidade:</span>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Todas as Unidades (Consolidado)</option>
              {companyBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-600">Período:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              {[
                'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
              ].map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS INTERNAS */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'calendar' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Calendário & Equipe
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('impact')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'impact' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Simulação de Impacto
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('working_days')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'working_days' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dias Úteis & Feriados
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'history' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Histórico & Premissas
          </button>
        </div>
      </div>

      {/* BANNER DE RESUMO DA UNIDADE */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Meta Original da Loja</span>
          <span className="text-lg font-bold text-slate-900 font-mono block mt-1">
            {formatCurrency(redistributionResult.originalUnitTarget)}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">Faturamento planejado</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Meta Ajustada da Loja</span>
          <span className="text-lg font-bold text-indigo-700 font-mono block mt-1">
            {formatCurrency(redistributionResult.adjustedUnitTarget)}
          </span>
          <span className="text-[10px] text-indigo-600 font-medium">
            {redistributionResult.unitTargetDifference === 0
              ? '100% preservada sem perda'
              : `Ajuste de ${formatCurrency(Math.abs(redistributionResult.unitTargetDifference))}`}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Método de Redistribuição</span>
          <span className="text-xs font-bold text-slate-800 block mt-1 capitalize">
            {redistributionMethod === 'proportional' && '1. Proporcional às Participações'}
            {redistributionMethod === 'equal' && '2. Igualitário entre Disponíveis'}
            {redistributionMethod === 'manual' && '3. Rateio Manual'}
            {redistributionMethod === 'reduce_unit' && '4. Reduzir Meta da Unidade'}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">Premissa ativa de rateio</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Sobrecarga de Equipe</span>
          <div className="flex items-center gap-2 mt-1">
            {redistributionResult.sellerImpacts.some((s) => s.isOverloaded) ? (
              <span className="text-sm font-bold text-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Alerta de Carga Adicional
              </span>
            ) : (
              <span className="text-sm font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Equilibrada
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Monitoramento de estresse</span>
        </div>
      </div>

      {/* CONTEÚDO DA ABA 1: CALENDÁRIO & EQUIPE */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          {/* TABELA CONSOLIDADA DA EQUIPE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Visão de Disponibilidade da Equipe ({companySellers.length} Vendedoras) — Mês {selectedMonth}/{selectedYear}
                </h3>
                <p className="text-xs text-slate-500">
                  Resumo de participação oficial vs ponderada, dias previstos/disponíveis e meta ajustada.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Vendedora</th>
                    <th className="py-3 px-4 text-center">Part. Oficial</th>
                    <th className="py-3 px-4 text-center">Dias Trab. / Previsto</th>
                    <th className="py-3 px-4 text-center">Fator Disp. (%)</th>
                    <th className="py-3 px-4 text-right">Meta Original</th>
                    <th className="py-3 px-4 text-right">Meta Ajustada</th>
                    <th className="py-3 px-4 text-right">Diferença (R$)</th>
                    <th className="py-3 px-4 text-center">Status / Ocorrências</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {redistributionResult.sellerImpacts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Nenhuma vendedora ativa encontrada nesta filial. Cadastre vendedoras na aba "Equipe Comercial".
                      </td>
                    </tr>
                  ) : (
                    redistributionResult.sellerImpacts.map((impact) => {
                      const sellerAvails = filteredAvailabilities.filter(
                        (a) => a.sellerId === impact.sellerId
                      );

                      return (
                        <tr key={impact.sellerId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{impact.sellerName}</span>
                            <span className="text-[10px] text-slate-500 block">
                              {formatCurrency(impact.revenuePerAvailableDay)}/dia disponível
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                            {impact.officialShare.toFixed(1)}%
                          </td>

                          <td className="py-3 px-4 text-center font-mono text-slate-800">
                            {impact.daysAvailable} / {impact.daysExpected} dias
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 text-xs font-mono font-bold rounded-md ${
                                impact.availabilityFactor >= 0.99
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : impact.availabilityFactor > 0
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-rose-100 text-rose-900'
                              }`}
                            >
                              {(impact.availabilityFactor * 100).toFixed(1)}%
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            {formatCurrency(impact.originalMonthlyTarget)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-indigo-900">
                            {formatCurrency(impact.adjustedMonthlyTarget)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono">
                            <span
                              className={`font-bold ${
                                impact.differenceAmount > 0
                                  ? 'text-amber-700'
                                  : impact.differenceAmount < 0
                                  ? 'text-rose-600'
                                  : 'text-slate-500'
                              }`}
                            >
                              {impact.differenceAmount > 0 ? '+' : ''}
                              {formatCurrency(impact.differenceAmount)}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            {sellerAvails.length > 0 ? (
                              <div className="flex flex-col items-center gap-1">
                                {sellerAvails.map((a) => (
                                  <div key={a.id}>{getAbsenceBadge(a.absenceType)}</div>
                                ))}
                              </div>
                            ) : impact.isOverloaded ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 rounded-full border border-amber-300 flex items-center gap-1 justify-center">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                +{impact.overloadPercentage.toFixed(1)}% Carga
                              </span>
                            ) : (
                              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Disponível 100%
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* LISTA DE OCORRÊNCIAS E FÉRIAS CADASTRADAS */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Ocorrências & Ausências Agendadas
              </h3>
              <span className="text-xs text-slate-500 font-semibold">
                Total: {filteredAvailabilities.length} registros
              </span>
            </div>

            {filteredAvailabilities.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <UserCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">
                  Nenhuma ausência ou férias cadastrada para esta unidade no período.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Todas as vendedoras estão consideradas 100% disponíveis.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredAvailabilities.map((item) => {
                  const seller = companySellers.find((s) => s.id === item.sellerId);
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm text-slate-900">{seller?.name || 'Vendedora'}</span>
                          {getAbsenceBadge(item.absenceType)}
                        </div>

                        <div className="text-xs text-slate-600 font-mono space-y-1 mb-3">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {item.startDate.split('-').reverse().join('/')} até{' '}
                              {item.endDate.split('-').reverse().join('/')}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Disponibilidade no período: <strong>{item.availabilityPercentage}%</strong>
                          </div>
                        </div>

                        {item.notes && (
                          <p className="text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-200 line-clamp-2 mb-3">
                            "{item.notes}"
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                          {item.redistributionMethod}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            deleteAvailability(item.id);
                            showToast('Ausência removida com sucesso.');
                          }}
                          className="text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 2: SIMULAÇÃO DE IMPACTO */}
      {activeTab === 'impact' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Simulador de Premissas de Redistribuição
                </h3>
                <p className="text-xs text-slate-500">
                  Teste o comportamento da meta alternando as regras de absorção da ausência.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setRedistributionMethod('proportional')}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  redistributionMethod === 'proportional'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-200'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-bold text-slate-900 block mb-1">
                  1. Proporcional às Cotas
                </span>
                <p className="text-[11px] text-slate-500">
                  A cota ausente é distribuída proporcionalmente ao peso de cada consultora ativa.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRedistributionMethod('equal')}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  redistributionMethod === 'equal'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-200'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-bold text-slate-900 block mb-1">
                  2. Igualitário entre Presentes
                </span>
                <p className="text-[11px] text-slate-500">
                  Divide o valor igualmente em partes exatas entre as presentes.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRedistributionMethod('reduce_unit')}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  redistributionMethod === 'reduce_unit'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-200'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-bold text-slate-900 block mb-1">
                  3. Reduzir Meta da Loja
                </span>
                <p className="text-[11px] text-slate-500">
                  Não sobrecarrega ninguém e reduz a meta global da empresa.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRedistributionMethod('manual')}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  redistributionMethod === 'manual'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-200'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-bold text-slate-900 block mb-1">
                  4. Rateio Manual
                </span>
                <p className="text-[11px] text-slate-500">
                  O gestor define o percentual exato que cada colaboradora irá absorver.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 3: DIAS ÚTEIS & FERIADOS */}
      {activeTab === 'working_days' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-600" />
              Dias de Funcionamento da Loja (Semanal)
            </h3>
            <p className="text-xs text-slate-500">
              Marque os dias da semana em que a empresa realiza atendimento comercial.
            </p>

            <div className="space-y-2">
              {workingDaysSettings.weeklySchedule.map((sched) => (
                <label
                  key={sched.day}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    sched.isOpen ? 'bg-emerald-50/50 border-emerald-200 text-slate-900' : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <span className="text-xs font-bold">{sched.name}</span>
                  <input
                    type="checkbox"
                    checked={sched.isOpen}
                    onChange={() => handleToggleWeekDay(sched.day)}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Feriados & Dias Fechados da Loja
            </h3>
            <p className="text-xs text-slate-500">
              Dias cadastrados aqui são subtraídos dos dias previstos de trabalho da equipe.
            </p>

            <form onSubmit={handleAddHoliday} className="flex gap-2 text-xs">
              <input
                type="text"
                placeholder="Nome do feriado (ex: Independência)"
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 outline-none"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
              >
                Adicionar
              </button>
            </form>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {workingDaysSettings.holidays.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800 block">{h.name}</span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {h.date.split('-').reverse().join('/')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteHoliday(h.id)}
                    className="text-rose-600 hover:text-rose-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 4: HISTÓRICO & PREMISSAS */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <HistoryIcon className="w-4 h-4 text-indigo-600" />
            Premissas Matemáticas do Módulo de Disponibilidade
          </h3>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <p>
              1. <strong>Dias Úteis Efetivos:</strong> Calculados dinamicamente desconsiderando domingos e feriados cadastrados.
            </p>
            <p>
              2. <strong>Fator de Disponibilidade:</strong> <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-300">Dias Disponíveis / Dias Previstos</code>.
            </p>
            <p>
              3. <strong>Desdobramento Semanal:</strong> A ausência de uma vendedora afeta especificamente os pesos das semanas comerciais em que ela está de férias, mantendo o restante do mês intacto.
            </p>
          </div>
        </div>
      )}

      {/* MODAL CADASTRAR FÉRIAS / AUSÊNCIA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Cadastrar Férias / Ausência da Vendedora
                </h2>
                <p className="text-xs text-slate-500">
                  Selecione a vendedora cadastrada de {activeCompany.tradeName} e informe o período.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAvailability} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Seletor de Loja / Filial */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loja / Filial</label>
                  <select
                    value={modalBranchId}
                    onChange={(e) => handleModalBranchChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="all">Todas as Unidades da Empresa</option>
                    {companyBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Seletor de Vendedora */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vendedora *</label>
                  {modalAvailableSellers.length === 0 ? (
                    <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold">
                      Nenhuma vendedora cadastrada nesta empresa/filial.
                    </div>
                  ) : (
                    <select
                      value={sellerId}
                      onChange={(e) => setSellerId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {modalAvailableSellers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.officialSharePercentage}% Part.)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo da Ocorrência</label>
                  <select
                    value={absenceType}
                    onChange={(e) => setAbsenceType(e.target.value as AbsenceType)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="vacation">Férias (0% Disponibilidade)</option>
                    <option value="leave">Afastamento / Médica</option>
                    <option value="training">Treinamento</option>
                    <option value="day_off">Folga Programada</option>
                    <option value="part_time">Redução de Jornada (Meio Período)</option>
                    <option value="hiring">Entrada no Meio do Mês</option>
                    <option value="termination">Desligamento no Meio do Mês</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data Inicial</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data Final</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Disponibilidade no Período (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={availabilityPercentage}
                    onChange={(e) => setAvailabilityPercentage(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none"
                  />
                  <span className="text-[10px] text-slate-400">0% para férias totais, 50% para meio período</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Observações</label>
                  <input
                    type="text"
                    placeholder="Ex: Férias regulares do primeiro período"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* TELA DE IMPACTO E SIMULAÇÃO ANTES DE SALVAR */}
              {sellerId && (
                <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Impacto Calculado em Tempo Real
                  </span>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                      <span className="text-slate-400 text-[10px] block">Disponibilidade</span>
                      <strong className="text-white">
                        {((getSellerIntervalAvailability(sellerId, startDate, endDate, [], workingDaysSettings).factor) * 100).toFixed(1)}%
                      </strong>
                    </div>
                    <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                      <span className="text-slate-400 text-[10px] block">Dias de Trabalho</span>
                      <strong className="text-white">
                        {getSellerIntervalAvailability(sellerId, startDate, endDate, [], workingDaysSettings).daysAvailable} de {getSellerIntervalAvailability(sellerId, startDate, endDate, [], workingDaysSettings).daysExpected} dias
                      </strong>
                    </div>
                    <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                      <span className="text-slate-400 text-[10px] block">Meta da Loja Antes</span>
                      <strong className="text-white">{formatCurrency(redistributionResult.originalUnitTarget)}</strong>
                    </div>
                    <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                      <span className="text-slate-400 text-[10px] block">Meta da Loja Depois</span>
                      <strong className="text-emerald-400">{formatCurrency(redistributionResult.adjustedUnitTarget)}</strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalAvailableSellers.length === 0}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 rounded-xl shadow-md transition cursor-pointer"
                >
                  Confirmar & Salvar Férias
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
