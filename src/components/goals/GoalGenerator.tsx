import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  Calculator,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sliders,
  ShieldCheck,
  Building2,
  RefreshCw,
  BarChart2,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  Info,
  Check,
  PieChart,
  Clock,
  Briefcase,
  Users,
  Grid,
  Zap,
  BookmarkPlus,
  Award,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { WeeklyWeightSelector } from './WeeklyWeightSelector';
import { TeamParticipationEditor } from './TeamParticipationEditor';
import { GoalMatrixGrid } from './GoalMatrixGrid';
import { GoalSimulatorModal } from './GoalSimulatorModal';
import { WeeklySellerLevelsMatrix } from './WeeklySellerLevelsMatrix';
import { GoalConflictModal } from './GoalConflictModal';
import {
  MonthlyMasterGoal,
  CommercialWeekPeriod,
  WeeklyWeightTemplate,
  GoalSimulationScenario,
} from '../../types';
import {
  buildCommercialWeeks,
  validateWeeklyWeights,
  suggestWeeklyWeightsFromHistory,
} from '../../services/masterGoalEngine';
import { formatCurrency, getActiveLevels } from '../../services/financialEngine';

const ALL_MONTHS = [
  { number: 1, name: 'Janeiro', short: 'Jan' },
  { number: 2, name: 'Fevereiro', short: 'Fev' },
  { number: 3, name: 'Março', short: 'Mar' },
  { number: 4, name: 'Abril', short: 'Abr' },
  { number: 5, name: 'Maio', short: 'Mai' },
  { number: 6, name: 'Junho', short: 'Jun' },
  { number: 7, name: 'Julho', short: 'Jul' },
  { number: 8, name: 'Agosto', short: 'Ago' },
  { number: 9, name: 'Setembro', short: 'Set' },
  { number: 10, name: 'Outubro', short: 'Out' },
  { number: 11, name: 'Novembro', short: 'Nov' },
  { number: 12, name: 'Dezembro', short: 'Dez' },
];

export const GoalGenerator: React.FC = () => {
  const {
    activeCompany,
    companyBranches,
    companySellers,
    companySales,
    companyMonthlyHistory,
    activeBranchId,
    setActiveBranchId,
    masterGoals,
    saveMasterGoal,
    publishMasterGoal,
    weightTemplates,
    saveWeightTemplate,
    goalSimulations,
    saveGoalSimulation,
    deleteGoalSimulation,
    applyGoalSimulationAsOfficial,
    updateSellerShare,
    getTeamParticipation,
    autoRedistributeTeamParticipation,
    updateCompany,
  } = useApp();

  // Mês e Ano de trabalho
  const [selectedMonthNumber, setSelectedMonthNumber] = useState<number>(9); // Setembro
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Unidade selecionada para configuração de metas
  const selectedBranchId = activeBranchId !== 'all' ? activeBranchId : (companyBranches[0]?.id || `branch-${activeCompany.id}-matriz`);
  const activeBranch = companyBranches.find((b) => b.id === selectedBranchId) || companyBranches[0];

  // Recupera a Meta Mestre do período atual
  const storageKey = `${activeCompany.id}-${selectedBranchId}-${selectedYear}-${selectedMonthNumber}`;
  const existingMaster = masterGoals[storageKey];

  // Estado Local de Edição da Meta Mensal
  const [monthlyTarget, setMonthlyTarget] = useState<number>(() => {
    return existingMaster?.monthlyTarget || activeCompany.levels[0]?.revenueTarget || 0;
  });

  const [numberOfWeeks, setNumberOfWeeks] = useState<4 | 5>(() => {
    return existingMaster?.numberOfWeeks || 4;
  });

  const [weeks, setWeeks] = useState<CommercialWeekPeriod[]>(() => {
    if (existingMaster?.weeks && existingMaster.weeks.length > 0) {
      return existingMaster.weeks;
    }
    const defaultWeights = numberOfWeeks === 4 ? [15, 20, 25, 40] : [15, 20, 20, 25, 20];
    return buildCommercialWeeks(selectedYear, selectedMonthNumber, numberOfWeeks, defaultWeights, monthlyTarget);
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(
    existingMaster?.templateUsed
  );

  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Sincroniza dados sempre que o Mês, Ano, Unidade ou masterGoals mudar
  useEffect(() => {
    const key = `${activeCompany.id}-${selectedBranchId}-${selectedYear}-${selectedMonthNumber}`;
    const currentMaster = masterGoals[key];
    if (currentMaster) {
      setMonthlyTarget(currentMaster.monthlyTarget);
      setNumberOfWeeks(currentMaster.numberOfWeeks);
      setWeeks(currentMaster.weeks);
      setSelectedTemplateId(currentMaster.templateUsed);
    } else {
      // Valor base sugerido para o mês
      const baseTarget = activeCompany.levels[0]?.revenueTarget || 0;
      setMonthlyTarget(baseTarget);
      const defaultWeights = [15, 20, 25, 40];
      setNumberOfWeeks(4);
      const newWeeks = buildCommercialWeeks(
        selectedYear,
        selectedMonthNumber,
        4,
        defaultWeights,
        baseTarget
      );
      setWeeks(newWeeks);
      setSelectedTemplateId(undefined);
    }
  }, [selectedMonthNumber, selectedYear, selectedBranchId, activeCompany.id, masterGoals]);

  // Auto-salvar rascunho com debounce de 800ms sempre que houver mudanças locais
  useEffect(() => {
    const delayDebounceId = setTimeout(() => {
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const monthName = monthNames[selectedMonthNumber - 1];

      const masterGoalToSave: MonthlyMasterGoal = {
        id: existingMaster?.id || `goal-${activeCompany.id}-${selectedBranchId}-${selectedYear}-${selectedMonthNumber}`,
        companyId: activeCompany.id,
        branchId: selectedBranchId,
        branchName: activeBranch?.name || 'Unidade Principal',
        year: selectedYear,
        monthNumber: selectedMonthNumber,
        monthName,
        monthlyTarget,
        numberOfWeeks,
        weeks,
        totalWeight: weeks.reduce((acc, w) => acc + w.weightPercentage, 0),
        isValid: weeklyWeightsValidation.isValid && teamSummary.isValid,
        templateUsed: selectedTemplateId,
        commissionRuleType: 'monthly',
        status: existingMaster?.status || 'draft',
        updatedAt: new Date().toISOString(),
      };

      const key = `${activeCompany.id}-${selectedBranchId}-${selectedYear}-${selectedMonthNumber}`;
      const currentGlobal = masterGoals[key];

      // Só executa o salvamento se houver uma diferença real para evitar loops infinitos
      if (
        !currentGlobal ||
        currentGlobal.monthlyTarget !== monthlyTarget ||
        JSON.stringify(currentGlobal.weeks) !== JSON.stringify(weeks) ||
        currentGlobal.numberOfWeeks !== numberOfWeeks ||
        currentGlobal.templateUsed !== selectedTemplateId
      ) {
        saveMasterGoal(masterGoalToSave);
      }
    }, 800);

    return () => clearTimeout(delayDebounceId);
  }, [monthlyTarget, weeks, numberOfWeeks, selectedTemplateId, selectedMonthNumber, selectedYear, selectedBranchId, activeCompany.id]);

  // Atualiza semanas quando o número de semanas muda
  const handleWeeksCountChange = (newCount: 4 | 5) => {
    setNumberOfWeeks(newCount);
    const defaultWeights = newCount === 4 ? [15, 20, 25, 40] : [15, 20, 20, 25, 20];
    const newWeeks = buildCommercialWeeks(
      selectedYear,
      selectedMonthNumber,
      newCount,
      defaultWeights,
      monthlyTarget
    );
    setWeeks(newWeeks);
  };

  // Ajusta automaticamente os pesos das semanas para fechar em 100% de forma igualitária
  const handleAutoAdjustWeights = () => {
    const defaultWeights = numberOfWeeks === 4 ? [25, 25, 25, 25] : [20, 20, 20, 20, 20];
    const newWeeks = buildCommercialWeeks(
      selectedYear,
      selectedMonthNumber,
      numberOfWeeks,
      defaultWeights,
      monthlyTarget
    );
    setWeeks(newWeeks);
  };

  const handleMonthlyTargetChange = (val: number) => {
    setMonthlyTarget(val);
    setWeeks((prev) =>
      prev.map((w) => ({
        ...w,
        revenueTarget: Math.round(val * (w.weightPercentage / 100)),
        targetAmount: Math.round(val * (w.weightPercentage / 100)),
      }))
    );
  };

  // Atualiza peso de uma semana específica
  const handleWeekWeightChange = (weekNumber: number, newWeight: number) => {
    setWeeks((prev) =>
      prev.map((w) => {
        if (w.weekNumber === weekNumber) {
          const targetAmount = Math.round(monthlyTarget * (newWeight / 100));
          return {
            ...w,
            weightPercentage: newWeight,
            revenueTarget: targetAmount,
            targetAmount,
          };
        }
        return w;
      })
    );
  };

  // Atualiza datas de uma semana
  const handleWeekPeriodChange = (weekNumber: number, startDate: string, endDate: string) => {
    setWeeks((prev) =>
      prev.map((w) => {
        if (w.weekNumber === weekNumber) {
          const sParts = startDate ? startDate.split('-') : [];
          const eParts = endDate ? endDate.split('-') : [];
          const startDay = sParts[2] ? parseInt(sParts[2], 10) : w.startDay;
          const endDay = eParts[2] ? parseInt(eParts[2], 10) : w.endDay;
          const label = (sParts.length >= 3 && eParts.length >= 3)
            ? `${parseInt(sParts[2], 10)}/${sParts[1]} a ${parseInt(eParts[2], 10)}/${eParts[1]}`
            : w.label || `Semana ${weekNumber}`;

          return {
            ...w,
            startDate,
            endDate,
            startDay,
            endDay,
            dateRangeLabel: `${String(startDay).padStart(2, '0')} a ${String(endDay).padStart(2, '0')}`,
            label,
          };
        }
        return w;
      })
    );
  };

  // Aplica template pré-configurado
  const handleApplyTemplate = (template: WeeklyWeightTemplate) => {
    setSelectedTemplateId(template.id);
    const newWeeks = buildCommercialWeeks(
      selectedYear,
      selectedMonthNumber,
      template.weeksCount,
      template.weights,
      monthlyTarget
    );
    setNumberOfWeeks(template.weeksCount);
    setWeeks(newWeeks);
  };

  // Sugere pesos pelo histórico
  const handleSuggestFromHistory = () => {
    const suggestion = suggestWeeklyWeightsFromHistory(companySales, selectedBranchId, numberOfWeeks);
    const newWeeks = buildCommercialWeeks(
      selectedYear,
      selectedMonthNumber,
      numberOfWeeks,
      suggestion.weights,
      monthlyTarget
    );
    setWeeks(newWeeks);
    setSelectedTemplateId(undefined);
  };

  // Vendedores da filial ativa (com fallback inteligente para todas as vendedoras da empresa se a filial específica não tiver vendedoras cadastradas)
  const branchSellers = useMemo(() => {
    if (selectedBranchId === 'all') {
      return companySellers.filter((s) => s.active);
    }
    const filtered = companySellers.filter((s) => s.branchId === selectedBranchId && s.active);
    if (filtered.length > 0) return filtered;
    // Fallback: Se a filial selecionada estiver sem vendedoras mas existirem vendedoras na empresa, lista as vendedoras da empresa
    return companySellers.filter((s) => s.active);
  }, [companySellers, selectedBranchId]);

  // Resumo de participação da equipe
  const teamSummary = useMemo(() => {
    return getTeamParticipation(selectedBranchId, monthlyTarget);
  }, [getTeamParticipation, selectedBranchId, branchSellers, monthlyTarget]);

  // Participação individual handlers
  const handleSellerShareChange = (sellerId: string, newShare: number) => {
    updateSellerShare(sellerId, newShare, 'manual');
  };

  const handleRedistributeProportionally = (sellerId: string, newShare: number) => {
    autoRedistributeTeamParticipation(selectedBranchId, sellerId, newShare);
  };

  const handleSetEqualDistribution = () => {
    if (branchSellers.length === 0) return;
    const equalShare = Math.round((100 / branchSellers.length) * 10) / 10;
    branchSellers.forEach((s) => {
      updateSellerShare(s.id, equalShare, 'adjusted');
    });
  };

  const handleApplyHistoricalShares = () => {
    branchSellers.forEach((s) => {
      const hist = s.historicalSharePercentage ?? (100 / branchSellers.length);
      updateSellerShare(s.id, hist, 'historical');
    });
  };
  // Validação geral
  const weeklyWeightsValidation = validateWeeklyWeights(weeks);
  const isGoalFormValid = weeklyWeightsValidation.isValid && teamSummary.isValid;

  const activeLevels = useMemo(
    () => getActiveLevels(activeCompany.levels, activeCompany.numberOfLevels),
    [activeCompany]
  );

  const [isConflictModalOpen, setIsConflictModalOpen] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<'save' | 'publish' | null>(null);

  const settingsBaseTarget = activeCompany.levels[0]?.revenueTarget || 0;

  // Executa o salvamento ou publicação real
  const executeSaveOrPublish = (actionType: 'save' | 'publish', targetToUse?: number) => {
    const finalMonthlyTarget = targetToUse ?? monthlyTarget;
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthName = monthNames[selectedMonthNumber - 1];

    const masterGoalToSave: MonthlyMasterGoal = {
      id: existingMaster?.id || `goal-${activeCompany.id}-${selectedBranchId}-${selectedYear}-${selectedMonthNumber}`,
      companyId: activeCompany.id,
      branchId: selectedBranchId,
      branchName: activeBranch?.name || 'Unidade Principal',
      year: selectedYear,
      monthNumber: selectedMonthNumber,
      monthName,
      monthlyTarget: finalMonthlyTarget,
      numberOfWeeks,
      weeks: weeks.map((w) => ({
        ...w,
        revenueTarget: Math.round(finalMonthlyTarget * (w.weightPercentage / 100)),
        targetAmount: Math.round(finalMonthlyTarget * (w.weightPercentage / 100)),
      })),
      totalWeight: weeks.reduce((acc, w) => acc + w.weightPercentage, 0),
      isValid: isGoalFormValid,
      templateUsed: selectedTemplateId,
      commissionRuleType: 'monthly',
      status: actionType === 'publish' ? 'published' : (existingMaster?.status || 'draft'),
      updatedAt: new Date().toISOString(),
      publishedAt: actionType === 'publish' ? new Date().toISOString() : existingMaster?.publishedAt,
    };

    saveMasterGoal(masterGoalToSave);
    if (actionType === 'publish') {
      publishMasterGoal(masterGoalToSave.id);
      setSaveSuccessMessage('Meta Mensal e Desdobramentos Publicados Oficialmente!');
    } else {
      setSaveSuccessMessage('Rascunho de Meta Mensal salvo com sucesso.');
    }
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  // Verifica se há conflito com a meta das configurações
  const handleSaveDraft = () => {
    if (settingsBaseTarget > 0 && Math.abs(monthlyTarget - settingsBaseTarget) > 100) {
      setPendingAction('save');
      setIsConflictModalOpen(true);
    } else {
      executeSaveOrPublish('save');
    }
  };

  const handlePublishGoal = () => {
    if (settingsBaseTarget > 0 && Math.abs(monthlyTarget - settingsBaseTarget) > 100) {
      setPendingAction('publish');
      setIsConflictModalOpen(true);
    } else {
      executeSaveOrPublish('publish');
    }
  };

  // Resoluções do Modal de Conflito
  const handleKeepGeneratorTarget = () => {
    // Atualiza o Nível 1 das configurações da empresa
    const updatedLevels = activeCompany.levels.map((lvl, i) =>
      i === 0 ? { ...lvl, revenueTarget: monthlyTarget } : lvl
    );
    updateCompany(activeCompany.id, { levels: updatedLevels });
    executeSaveOrPublish(pendingAction || 'save', monthlyTarget);
    setIsConflictModalOpen(false);
  };

  const handleUseSettingsTarget = () => {
    setMonthlyTarget(settingsBaseTarget);
    setWeeks((prev) =>
      prev.map((w) => ({
        ...w,
        revenueTarget: Math.round(settingsBaseTarget * (w.weightPercentage / 100)),
        targetAmount: Math.round(settingsBaseTarget * (w.weightPercentage / 100)),
      }))
    );
    executeSaveOrPublish(pendingAction || 'save', settingsBaseTarget);
    setIsConflictModalOpen(false);
  };

  const handleKeepGeneratorOnly = () => {
    executeSaveOrPublish(pendingAction || 'save', monthlyTarget);
    setIsConflictModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Banner / Navegação da Nova Arquitetura de Metas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-xl shadow-md shadow-indigo-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Planejamento e Desdobramento de Metas
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                  Nova Arquitetura
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Hierarquia: <span className="font-semibold text-slate-700">Meta Mensal → Peso das Semanas → Participação da Equipe → Metas Individuais</span>
              </p>
            </div>
          </div>

          {/* Seletores de Unidade e Mês */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor de Unidade */}
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <Building2 className="w-4 h-4 text-slate-500 ml-1" />
              <select
                value={selectedBranchId}
                onChange={(e) => setActiveBranchId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-2"
              >
                {companyBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Seletor de Mês */}
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-500 ml-1" />
              <select
                value={selectedMonthNumber}
                onChange={(e) => setSelectedMonthNumber(parseInt(e.target.value, 10))}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-2"
              >
                {ALL_MONTHS.map((m) => (
                  <option key={m.number} value={m.number}>
                    {m.name}/{selectedYear}
                  </option>
                ))}
              </select>
            </div>

            {/* Botão de Simulação */}
            <button
              type="button"
              onClick={() => setIsSimulatorOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              Simular Cenário
            </button>
          </div>
        </div>

        {/* Notificação de Sucesso */}
        {saveSuccessMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}

        {/* Grade Visual de Seleção Rápida dos 12 Meses */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Planejamento Mês a Mês ({selectedYear}) — Clique no mês para configurar:
            </span>
            <span className="text-[11px] text-slate-500">
              Unidade: <strong className="text-slate-800">{activeBranch?.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
            {ALL_MONTHS.map((m) => {
              const monthKey = `${activeCompany.id}-${selectedBranchId}-${selectedYear}-${m.number}`;
              const monthMaster = masterGoals[monthKey];
              const isSelected = selectedMonthNumber === m.number;
              const hasConfig = !!monthMaster;
              const isPub = monthMaster?.status === 'published';
              const targetVal = monthMaster?.monthlyTarget || (isSelected ? monthlyTarget : 0);

              return (
                <button
                  key={m.number}
                  type="button"
                  onClick={() => setSelectedMonthNumber(m.number)}
                  className={`p-2 rounded-xl text-center transition-all border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 scale-102 font-bold'
                      : hasConfig
                      ? isPub
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-indigo-50/60 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                    {m.short}
                  </div>
                  <div className={`text-[10px] mt-0.5 truncate font-mono ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                    {targetVal > 0 ? formatCurrency(targetVal).replace(',00', '') : 'R$ 0'}
                  </div>
                  <div className="mt-1">
                    {isSelected ? (
                      <span className="inline-block px-1.5 py-0.2 text-[9px] bg-white text-indigo-700 rounded-full font-bold">
                        Ativo
                      </span>
                    ) : isPub ? (
                      <span className="inline-block px-1 text-[9px] bg-emerald-100 text-emerald-800 rounded font-medium">
                        Publicado
                      </span>
                    ) : hasConfig ? (
                      <span className="inline-block px-1 text-[9px] bg-indigo-100 text-indigo-800 rounded font-medium">
                        Rascunho
                      </span>
                    ) : (
                      <span className="inline-block px-1 text-[9px] text-slate-400">
                        Pendente
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 1. META MENSAL DA EMPRESA / UNIDADE */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
              1
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Meta Mensal da Unidade (Fonte Principal da Verdade)
              </h2>
              <p className="text-xs text-slate-500">
                Defina o valor consolidado da loja para o mês. As semanas e vendedores serão calculados a partir deste número.
              </p>
            </div>
          </div>

          {/* Input de Meta Mensal */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500">Meta do Mês:</span>
            <div className="relative flex items-center gap-2">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
              <input
                type="number"
                step="5000"
                value={monthlyTarget}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  handleMonthlyTargetChange(val);
                }}
                className="w-44 pl-9 pr-3 py-2 text-sm font-mono font-bold text-slate-900 bg-white border-2 border-indigo-200 rounded-xl focus:border-indigo-600 focus:outline-none shadow-sm"
              />
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm whitespace-nowrap"
              >
                Salvar Rascunho
              </button>
            </div>
          </div>
        </div>

        {/* Atalhos Rápidos de Meta Mensal */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 text-xs font-medium">Ajustes Rápidos:</span>
          <button
            type="button"
            onClick={() => {
              const val = Math.round(monthlyTarget * 1.05);
              handleMonthlyTargetChange(val);
            }}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold transition-colors"
          >
            +5% Crescimento
          </button>
          <button
            type="button"
            onClick={() => {
              const val = Math.round(monthlyTarget * 1.1);
              handleMonthlyTargetChange(val);
            }}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold transition-colors"
          >
            +10% Crescimento
          </button>
          <button
            type="button"
            onClick={() => {
              const val = Math.round(monthlyTarget * 1.15);
              handleMonthlyTargetChange(val);
            }}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold transition-colors"
          >
            +15% Crescimento
          </button>
          <button
            type="button"
            onClick={() => handleMonthlyTargetChange(0)}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold transition-colors"
          >
            Zerar Meta
          </button>
        </div>

        {/* Níveis de Metas Proporcionais do Mês Selecionado */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">
                Níveis de Metas & Comissionamento para {ALL_MONTHS.find((m) => m.number === selectedMonthNumber)?.name}/{selectedYear}:
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Alíquotas configuradas na empresa ({activeCompany.numberOfLevels} Níveis ativos)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {activeCompany.levels.slice(0, activeCompany.numberOfLevels).map((lvl, idx) => {
              // Proporção de crescimento em relação ao nível 1
              const baseLevel1 = activeCompany.levels[0]?.revenueTarget || 1;
              const ratio = lvl.revenueTarget / baseLevel1;
              const levelTarget = Math.round(monthlyTarget * (idx === 0 ? 1 : ratio));
              const estimatedCommission = Math.round(levelTarget * (lvl.commissionPercentage / 100));

              return (
                <div
                  key={lvl.level}
                  className={`p-3.5 rounded-xl border transition-all ${
                    idx === 0
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : idx === 1
                      ? 'bg-blue-50/70 border-blue-200'
                      : idx === 2
                      ? 'bg-purple-50/70 border-purple-200'
                      : 'bg-amber-50/70 border-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-700" />
                      {lvl.name}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                      {lvl.commissionPercentage}% Comiss.
                    </span>
                  </div>

                  <div className="text-sm font-bold font-mono text-slate-900">
                    {formatCurrency(levelTarget)}
                  </div>

                  <div className="text-[11px] text-slate-600 mt-1 flex justify-between">
                    <span>Prêmio Equipe:</span>
                    <strong className="text-slate-900">{formatCurrency(estimatedCommission)}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2 & 3. DISTRIBUIÇÃO DA META POR SEMANAS & PESOS */}
      <WeeklyWeightSelector
        numberOfWeeks={numberOfWeeks}
        onWeeksCountChange={handleWeeksCountChange}
        weeks={weeks}
        onWeekWeightChange={handleWeekWeightChange}
        onWeekPeriodChange={handleWeekPeriodChange}
        templates={weightTemplates}
        selectedTemplateId={selectedTemplateId}
        onApplyTemplate={handleApplyTemplate}
        onSuggestFromHistory={handleSuggestFromHistory}
        monthlyTarget={monthlyTarget}
        onAutoAdjustWeights={handleAutoAdjustWeights}
        onSaveCustomTemplate={saveWeightTemplate}
      />

      {/* 4. PARTICIPAÇÃO DOS VENDEDORES NA META */}
      <TeamParticipationEditor
        summary={teamSummary}
        onSellerShareChange={handleSellerShareChange}
        onRedistributeProportionally={handleRedistributeProportionally}
        onSetEqualDistribution={handleSetEqualDistribution}
        onApplyHistoricalShares={handleApplyHistoricalShares}
        monthlyTarget={monthlyTarget}
      />

      {/* 5. MATRIZ DE METAS (VENDEDORES × SEMANAS) */}
      <GoalMatrixGrid
        monthlyTarget={monthlyTarget}
        weeks={weeks}
        teamSummary={teamSummary}
        branchName={activeBranch?.name || 'Unidade Principal'}
        monthName={ALL_MONTHS.find((m) => m.number === selectedMonthNumber)?.name || 'Mês'}
        year={selectedYear}
      />

      {/* 6. NÍVEIS DA SEMANA POR VENDEDORA (NÍVEIS SEMANAIS DA EQUIPE) */}
      <WeeklySellerLevelsMatrix
        monthlyTarget={monthlyTarget}
        weeks={weeks}
        sellers={branchSellers}
        activeLevels={activeLevels}
        branchName={activeBranch?.name || 'Unidade Principal'}
      />

      {/* Barra de Ações Finais */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-3.5 h-3.5 rounded-full ${
              isGoalFormValid ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              {isGoalFormValid
                ? 'Plano de Metas Válido e Consistente (100% Semanas + 100% Equipe)'
                : 'Existem pendências de distribuição de pesos ou participação'}
            </span>
            <span className="text-[11px] text-slate-500">
              Ao publicar, todas as metas semanais e individuais serão atualizadas em tempo real em toda a plataforma.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Salvar Rascunho
          </button>

          <button
            type="button"
            onClick={handlePublishGoal}
            disabled={!isGoalFormValid}
            className={`px-5 py-2 text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 ${
              isGoalFormValid
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Publicar Meta Oficial da Unidade
          </button>
        </div>
      </div>

      {/* Modal de Conflito entre Gerador e Configurações */}
      <GoalConflictModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        generatorTarget={monthlyTarget}
        settingsTarget={settingsBaseTarget}
        branchName={activeBranch?.name || 'Unidade Principal'}
        onKeepGeneratorTarget={handleKeepGeneratorTarget}
        onUseSettingsTarget={handleUseSettingsTarget}
        onKeepGeneratorOnly={handleKeepGeneratorOnly}
      />

      {/* Modal do Simulador de Metas */}
      {existingMaster && (
        <GoalSimulatorModal
          isOpen={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
          masterGoal={existingMaster}
          sellers={branchSellers}
          branch={activeBranch}
          financialSettings={activeCompany.financialSettings}
          onApplyAsOfficial={(sim) => {
            applyGoalSimulationAsOfficial(sim);
            setSaveSuccessMessage('Cenário simulado aplicado como Nova Meta Oficial!');
            setTimeout(() => setSaveSuccessMessage(null), 4000);
          }}
          onSaveScenario={(sim) => {
            saveGoalSimulation(sim);
            setSaveSuccessMessage('Cenário salvo no banco de simulações.');
            setTimeout(() => setSaveSuccessMessage(null), 4000);
          }}
        />
      )}
    </div>
  );
};
