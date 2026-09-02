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
  ChevronUp,
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
  Edit2,
  Save,
  Settings2,
  ArrowUpRight,
  HelpCircle,
  X,
  AlertTriangle,
  History,
  Store,
  Plus,
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
  GoalLevel,
  GoalChangeLog,
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
    currentUser,
  } = useApp();

  // Mês e Ano de trabalho
  const [selectedMonthNumber, setSelectedMonthNumber] = useState<number>(9); // Setembro
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Unidade selecionada para configuração de metas (com suporte a visão consolidada 'all')
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    if (activeBranchId !== 'all') return activeBranchId;
    return 'all';
  });

  // Sincroniza se o filtro global de filial do app mudar
  useEffect(() => {
    if (activeBranchId !== 'all') {
      setSelectedBranchId(activeBranchId);
    }
  }, [activeBranchId]);

  const activeBranch = companyBranches.find((b) => b.id === selectedBranchId) || companyBranches[0];

  // Recupera a Meta Mestre do período atual
  const storageKey = `${activeCompany.id}-${selectedBranchId}-${selectedYear}-${selectedMonthNumber}`;
  const existingMaster = masterGoals[storageKey];

  // Histórico de alterações e logs de auditoria
  const [changeLogs, setChangeLogs] = useState<GoalChangeLog[]>(() => {
    return existingMaster?.changeLogs || [];
  });
  const [isLogsExpanded, setIsLogsExpanded] = useState<boolean>(false);
  const [newLogNote, setNewLogNote] = useState<string>('');

  // Estado Local de Edição da Meta Mensal
  const [monthlyTarget, setMonthlyTarget] = useState<number>(() => {
    return existingMaster?.monthlyTarget || activeCompany.levels[0]?.revenueTarget || 0;
  });

  const [monthlyTargetInput, setMonthlyTargetInput] = useState<string>(() => {
    const val = existingMaster?.monthlyTarget || activeCompany.levels[0]?.revenueTarget || 0;
    return val > 0 ? val.toString() : '';
  });

  // Padrão de crescimento percentual da escada de metas (ex: Meta 1: Base, Meta 2: +15%, Meta 3: +10%, Meta 4: +10%)
  const [levelGrowthRates, setLevelGrowthRates] = useState<number[]>(() => {
    if (existingMaster?.levelGrowthPercentages && existingMaster.levelGrowthPercentages.length >= 4) {
      return existingMaster.levelGrowthPercentages;
    }
    if (activeCompany.levelGrowthPercentages && activeCompany.levelGrowthPercentages.length >= 4) {
      return activeCompany.levelGrowthPercentages;
    }
    return [0, 15, 10, 10];
  });

  // Valores manuais sobrescritos pelo usuário em Metas 2, 3 ou 4
  const [manualLevelValues, setManualLevelValues] = useState<Record<number, number>>(() => {
    if (existingMaster?.levels && existingMaster.levels.length > 0) {
      const map: Record<number, number> = {};
      existingMaster.levels.forEach((lvl, idx) => {
        if (idx > 0) map[idx] = lvl.revenueTarget;
      });
      return map;
    }
    return {};
  });

  // Modal para confirmação de edição manual com duplo-clique
  const [editingLevelModal, setEditingLevelModal] = useState<{
    isOpen: boolean;
    levelIndex: number;
    levelName: string;
    currentValue: number;
    inputValue: string;
  }>({
    isOpen: false,
    levelIndex: 1,
    levelName: '',
    currentValue: 0,
    inputValue: '',
  });

  // Controle de exibição da configuração da escada
  const [isGrowthConfigOpen, setIsGrowthConfigOpen] = useState(false);

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

  // Níveis calculados dinamicamente com base na Meta 1 e na Escada de Crescimento
  const calculatedLevels = useMemo((): GoalLevel[] => {
    const numLevels = activeCompany.numberOfLevels || 4;
    const result: GoalLevel[] = [];

    // Nível 1: Sempre o monthlyTarget
    const lvl1Target = monthlyTarget;
    result.push({
      level: 1,
      name: activeCompany.levels[0]?.name || 'Meta 1',
      revenueTarget: lvl1Target,
      commissionPercentage: activeCompany.levels[0]?.commissionPercentage ?? 1.0,
    });

    // Nível 2
    if (numLevels >= 2) {
      const autoLvl2 = Math.round(lvl1Target * (1 + (levelGrowthRates[1] ?? 15) / 100));
      const lvl2Target = manualLevelValues[1] !== undefined ? manualLevelValues[1] : autoLvl2;
      result.push({
        level: 2,
        name: activeCompany.levels[1]?.name || 'Meta 2',
        revenueTarget: lvl2Target,
        commissionPercentage: activeCompany.levels[1]?.commissionPercentage ?? 1.5,
      });
    }

    // Nível 3
    if (numLevels >= 3) {
      const prevTarget = result[1]?.revenueTarget || lvl1Target;
      const autoLvl3 = Math.round(prevTarget * (1 + (levelGrowthRates[2] ?? 10) / 100));
      const lvl3Target = manualLevelValues[2] !== undefined ? manualLevelValues[2] : autoLvl3;
      result.push({
        level: 3,
        name: activeCompany.levels[2]?.name || 'Meta 3',
        revenueTarget: lvl3Target,
        commissionPercentage: activeCompany.levels[2]?.commissionPercentage ?? 2.0,
      });
    }

    // Nível 4
    if (numLevels >= 4) {
      const prevTarget = result[2]?.revenueTarget || result[1]?.revenueTarget || lvl1Target;
      const autoLvl4 = Math.round(prevTarget * (1 + (levelGrowthRates[3] ?? 10) / 100));
      const lvl4Target = manualLevelValues[3] !== undefined ? manualLevelValues[3] : autoLvl4;
      result.push({
        level: 4,
        name: activeCompany.levels[3]?.name || 'Meta 4',
        revenueTarget: lvl4Target,
        commissionPercentage: activeCompany.levels[3]?.commissionPercentage ?? 2.5,
      });
    }

    return result;
  }, [monthlyTarget, levelGrowthRates, manualLevelValues, activeCompany]);

  // Sincroniza dados sempre que o Mês, Ano ou Unidade mudar
  useEffect(() => {
    const key = `${activeCompany.id}-${selectedBranchId}-${selectedYear}-${selectedMonthNumber}`;
    const currentMaster = masterGoals[key];
    if (currentMaster) {
      setMonthlyTarget(currentMaster.monthlyTarget);
      setMonthlyTargetInput(currentMaster.monthlyTarget > 0 ? currentMaster.monthlyTarget.toString() : '');
      setNumberOfWeeks(currentMaster.numberOfWeeks);
      setWeeks(currentMaster.weeks);
      setSelectedTemplateId(currentMaster.templateUsed);
      setChangeLogs(currentMaster.changeLogs || []);
      if (currentMaster.levelGrowthPercentages && currentMaster.levelGrowthPercentages.length >= 4) {
        setLevelGrowthRates(currentMaster.levelGrowthPercentages);
      }
      if (currentMaster.levels && currentMaster.levels.length > 0) {
        const map: Record<number, number> = {};
        currentMaster.levels.forEach((lvl, idx) => {
          if (idx > 0) map[idx] = lvl.revenueTarget;
        });
        setManualLevelValues(map);
      } else {
        setManualLevelValues({});
      }
    } else {
      const baseTarget = activeCompany.levels[0]?.revenueTarget || 0;
      setMonthlyTarget(baseTarget);
      setMonthlyTargetInput(baseTarget > 0 ? baseTarget.toString() : '');
      setChangeLogs([]);
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
      setManualLevelValues({});
      if (activeCompany.levelGrowthPercentages && activeCompany.levelGrowthPercentages.length >= 4) {
        setLevelGrowthRates(activeCompany.levelGrowthPercentages);
      } else {
        setLevelGrowthRates([0, 15, 10, 10]);
      }
    }
  }, [selectedMonthNumber, selectedYear, selectedBranchId, activeCompany.id]);

  // Auto-salvar rascunho com debounce de 800ms
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
        levels: calculatedLevels,
        levelGrowthPercentages: levelGrowthRates,
        updatedAt: new Date().toISOString(),
      };

      const key = `${activeCompany.id}-${selectedBranchId}-${selectedYear}-${selectedMonthNumber}`;
      const currentGlobal = masterGoals[key];

      if (
        !currentGlobal ||
        currentGlobal.monthlyTarget !== monthlyTarget ||
        JSON.stringify(currentGlobal.weeks) !== JSON.stringify(weeks) ||
        currentGlobal.numberOfWeeks !== numberOfWeeks ||
        currentGlobal.templateUsed !== selectedTemplateId ||
        JSON.stringify(currentGlobal.levels) !== JSON.stringify(calculatedLevels)
      ) {
        saveMasterGoal(masterGoalToSave);
      }
    }, 800);

    return () => clearTimeout(delayDebounceId);
  }, [monthlyTarget, weeks, numberOfWeeks, selectedTemplateId, selectedMonthNumber, selectedYear, selectedBranchId, activeCompany.id, calculatedLevels, levelGrowthRates]);

  const handleMonthlyTargetChange = (val: number) => {
    const safeVal = Math.max(0, Math.round(val));
    setMonthlyTarget(safeVal);
    setMonthlyTargetInput(safeVal > 0 ? safeVal.toString() : '');
    // Regra do usuário: Se editar novamente o inicial, reajusta as demais automaticamente pelas porcentagens padrão!
    setManualLevelValues({});
    setWeeks((prev) =>
      prev.map((w) => ({
        ...w,
        revenueTarget: Math.round(safeVal * (w.weightPercentage / 100)),
        targetAmount: Math.round(safeVal * (w.weightPercentage / 100)),
      }))
    );
  };

  const handleOpenEditLevel = (levelIndex: number) => {
    const targetLvl = calculatedLevels[levelIndex];
    if (!targetLvl) return;
    setEditingLevelModal({
      isOpen: true,
      levelIndex,
      levelName: targetLvl.name,
      currentValue: targetLvl.revenueTarget,
      inputValue: targetLvl.revenueTarget.toString(),
    });
  };

  const handleConfirmEditLevel = () => {
    const cleanNum = parseFloat(editingLevelModal.inputValue.replace(/\D/g, '')) || 0;
    if (cleanNum <= 0) {
      alert('Por favor, informe um valor de meta maior que zero.');
      return;
    }
    setManualLevelValues((prev) => ({
      ...prev,
      [editingLevelModal.levelIndex]: cleanNum,
    }));
    setEditingLevelModal((prev) => ({ ...prev, isOpen: false }));
    setSaveSuccessMessage(`${editingLevelModal.levelName} ajustada manualmente para ${formatCurrency(cleanNum)}!`);
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

  // Estados de inputs de texto individuais para cada nível
  const [levelInputValues, setLevelInputValues] = useState<Record<number, string>>({});

  const getLevelInputValue = (idx: number, fallbackVal: number): string => {
    if (levelInputValues[idx] !== undefined) {
      return levelInputValues[idx];
    }
    return fallbackVal > 0 ? fallbackVal.toString() : '0';
  };

  const handleLevelInputChange = (idx: number, textVal: string) => {
    setLevelInputValues((prev) => ({ ...prev, [idx]: textVal }));
  };

  const handleLevelInputBlurOrEnter = (idx: number) => {
    const rawText = levelInputValues[idx];
    if (rawText === undefined) return;
    const cleanNum = parseFloat(rawText.replace(/\D/g, '')) || 0;

    if (idx === 0) {
      handleMonthlyTargetChange(cleanNum);
    } else {
      if (cleanNum > 0) {
        setManualLevelValues((prev) => ({ ...prev, [idx]: cleanNum }));
        const prevTarget = calculatedLevels[idx - 1]?.revenueTarget || monthlyTarget || 1;
        const computedGrowth = Math.max(0, Math.round(((cleanNum - prevTarget) / prevTarget) * 100));
        setLevelGrowthRates((prev) => {
          const next = [...prev];
          next[idx] = computedGrowth;
          return next;
        });
        setSaveSuccessMessage(`${calculatedLevels[idx]?.name || `Meta ${idx + 1}`} atualizada para ${formatCurrency(cleanNum)} (+${computedGrowth}% s/ anterior)!`);
        setTimeout(() => setSaveSuccessMessage(null), 3500);
      }
    }
  };

  const handleGrowthRateChangeDirect = (levelIdx: number, newRate: number) => {
    const safeRate = Math.max(0, newRate);
    setLevelGrowthRates((prev) => {
      const next = [...prev];
      next[levelIdx] = safeRate;
      return next;
    });
    const prevTarget = calculatedLevels[levelIdx - 1]?.revenueTarget || monthlyTarget || 0;
    const newVal = Math.round(prevTarget * (1 + safeRate / 100));
    setManualLevelValues((prev) => ({ ...prev, [levelIdx]: newVal }));
    setLevelInputValues((prev) => ({ ...prev, [levelIdx]: newVal.toString() }));
    setSaveSuccessMessage(`Meta ${levelIdx + 1} recalculada para +${safeRate}% (${formatCurrency(newVal)})`);
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

  const handleGrowthRateChange = (levelIdx: number, newRate: number) => {
    setLevelGrowthRates((prev) => {
      const next = [...prev];
      next[levelIdx] = Math.max(0, newRate);
      return next;
    });
    // Limpa edições manuais para recalcular com a nova regra de escada
    setManualLevelValues({});
  };

  const handleSaveGrowthRatesAsCompanyDefault = () => {
    updateCompany(activeCompany.id, {
      levelGrowthPercentages: levelGrowthRates,
    });
    setSaveSuccessMessage('Padrão de evolução de metas salvo com sucesso para toda a empresa!');
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

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
    if (selectedBranchId === 'all' || companyBranches.length <= 1) {
      return companySellers.filter((s) => s.active);
    }
    const filtered = companySellers.filter((s) => s.branchId === selectedBranchId && s.active);
    if (filtered.length > 0) return filtered;
    // Fallback: Se a filial selecionada estiver sem vendedoras mas existirem vendedoras na empresa, lista as vendedoras da empresa
    return companySellers.filter((s) => s.active);
  }, [companySellers, selectedBranchId, companyBranches.length]);

  // Função para adicionar logs de auditoria
  const addAuditLog = (
    action: GoalChangeLog['action'],
    description: string,
    details?: GoalChangeLog['details']
  ): GoalChangeLog[] => {
    const newLog: GoalChangeLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      userName: currentUser?.name || 'leonardo',
      userRole: currentUser?.role || 'consultant',
      action,
      description,
      details,
    };
    const updated = [newLog, ...changeLogs];
    setChangeLogs(updated);
    return updated;
  };

  const handleAddManualNote = () => {
    if (!newLogNote.trim()) return;
    const noteText = newLogNote.trim();
    const updatedLogs = addAuditLog('general_save', `Anotação: ${noteText}`);
    setNewLogNote('');

    // Salva imediatamente
    const key = `${activeCompany.id}-${selectedBranchId}-${selectedYear}-${selectedMonthNumber}`;
    const currentMaster = masterGoals[key];
    if (currentMaster) {
      const updated: MonthlyMasterGoal = {
        ...currentMaster,
        changeLogs: updatedLogs,
        updatedAt: new Date().toISOString(),
      };
      saveMasterGoal(updated);
    }
    setSaveSuccessMessage('Anotação registrada com sucesso no histórico da meta!');
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  // Resumo de participação da equipe
  const teamSummary = useMemo(() => {
    return getTeamParticipation(selectedBranchId, monthlyTarget);
  }, [getTeamParticipation, selectedBranchId, branchSellers, monthlyTarget]);

  // Participação individual handlers
  const handleSellerShareChange = (sellerId: string, newShare: number) => {
    const seller = branchSellers.find((s) => s.id === sellerId);
    updateSellerShare(sellerId, newShare, 'manual');
    if (seller) {
      addAuditLog('update_shares', `Participação de "${seller.name}" ajustada para ${newShare}%`, {
        sellerName: seller.name,
        newShare,
      });
    }
  };

  const handleRedistributeProportionally = (sellerId: string, newShare: number) => {
    autoRedistributeTeamParticipation(selectedBranchId, sellerId, newShare);
    const seller = branchSellers.find((s) => s.id === sellerId);
    if (seller) {
      addAuditLog('update_shares', `Redistribuição proporcional a partir de "${seller.name}" (${newShare}%)`);
    }
  };

  const handleSetEqualDistribution = () => {
    if (branchSellers.length === 0) return;
    const equalShare = Math.round((100 / branchSellers.length) * 10) / 10;
    branchSellers.forEach((s) => {
      updateSellerShare(s.id, equalShare, 'adjusted');
    });
    addAuditLog('update_shares', `Distribuição igualitária aplicada (${equalShare}% para cada uma das ${branchSellers.length} vendedoras)`);
  };

  const handleApplyHistoricalShares = () => {
    branchSellers.forEach((s) => {
      const hist = s.historicalSharePercentage ?? (100 / branchSellers.length);
      updateSellerShare(s.id, hist, 'historical');
    });
    addAuditLog('update_shares', 'Participação histórica aplicada para a equipe comercial');
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

    const logAction = actionType === 'publish' ? 'publish' : 'general_save';
    const logDesc =
      actionType === 'publish'
        ? `Meta publicada oficialmente: ${formatCurrency(finalMonthlyTarget)} (${calculatedLevels.length} níveis) para a equipe comercial.`
        : `Rascunho de metas salvo: ${formatCurrency(finalMonthlyTarget)} (${weeks.length} semanas).`;

    const updatedLogs = addAuditLog(logAction, logDesc, {
      newMonthlyTarget: finalMonthlyTarget,
    });

    const masterGoalToSave: MonthlyMasterGoal = {
      id: existingMaster?.id || `goal-${activeCompany.id}-${selectedBranchId}-${selectedYear}-${selectedMonthNumber}`,
      companyId: activeCompany.id,
      branchId: selectedBranchId,
      branchName: selectedBranchId === 'all' ? 'Toda a Empresa (Consolidado)' : (activeBranch?.name || 'Unidade Principal'),
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
      levels: calculatedLevels,
      levelGrowthPercentages: levelGrowthRates,
      changeLogs: updatedLogs,
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

          {/* Seletores de Unidade, Mês e Ações no Topo */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor de Unidade */}
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <Building2 className="w-4 h-4 text-slate-500 ml-1" />
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  if (e.target.value !== 'all') {
                    setActiveBranchId(e.target.value);
                  }
                }}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-2"
              >
                <option value="all">
                  🏢 Toda a Empresa ({companySellers.filter((s) => s.active).length} vendedoras)
                </option>
                {companyBranches.map((branch) => {
                  const count = companySellers.filter((s) => s.branchId === branch.id && s.active).length;
                  return (
                    <option key={branch.id} value={branch.id}>
                      🏬 {branch.name} ({count} vendedoras)
                    </option>
                  );
                })}
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
              className="px-3.5 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              Simular
            </button>

            {/* Botão Salvar Rascunho no Topo */}
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Salvar alterações como rascunho"
            >
              <Save className="w-3.5 h-3.5 text-slate-600" />
              <span>Salvar</span>
            </button>

            {/* Botão Publicar Meta Oficial no Topo */}
            <button
              type="button"
              onClick={handlePublishGoal}
              disabled={!isGoalFormValid}
              className={`px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                isGoalFormValid
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
              title="Publicar meta oficial da unidade"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Publicar Oficial</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtro Rápido de Unidades / Lojas */}
        {companyBranches.length > 1 && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-indigo-600" />
              Visualizar Equipe:
            </span>
            <button
              type="button"
              onClick={() => setSelectedBranchId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                selectedBranchId === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>🏢 Toda a Empresa</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedBranchId === 'all' ? 'bg-indigo-700 text-white' : 'bg-white text-slate-700'}`}>
                {companySellers.filter((s) => s.active).length} vendedoras
              </span>
            </button>
            {companyBranches.map((b) => {
              const count = companySellers.filter((s) => s.branchId === b.id && s.active).length;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBranchId(b.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    selectedBranchId === b.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>🏬 {b.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedBranchId === b.id ? 'bg-indigo-700 text-white' : 'bg-white text-slate-700'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Alerta inteligente se houver vendedoras em outras filiais */}
        {selectedBranchId !== 'all' && branchSellers.length < companySellers.length && (
          <div className="mt-3 p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Info className="w-4 h-4 text-indigo-600 shrink-0" />
              Exibindo <strong>{branchSellers.length}</strong> de <strong>{companySellers.length}</strong> vendedoras ativas desta empresa.
            </span>
            <button
              type="button"
              onClick={() => setSelectedBranchId('all')}
              className="text-indigo-700 hover:text-indigo-900 font-bold underline cursor-pointer text-xs shrink-0"
            >
              Ver e Distribuir para Toda a Equipe ({companySellers.length})
            </button>
          </div>
        )}

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
                Meta Mensal da Unidade (Meta 1 / Base Oficial)
              </h2>
              <p className="text-xs text-slate-500">
                Defina o valor base consolidado da loja para o mês. As demais metas (2, 3 e 4) e as semanas serão calculadas automaticamente a partir deste número.
              </p>
            </div>
          </div>

          {/* Input de Meta Mensal */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500">Meta do Mês:</span>
            <div className="relative flex items-center gap-2">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
              <input
                type="text"
                value={monthlyTargetInput}
                onChange={(e) => setMonthlyTargetInput(e.target.value)}
                onBlur={() => {
                  const clean = parseFloat(monthlyTargetInput.replace(/\D/g, '')) || 0;
                  handleMonthlyTargetChange(clean);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const clean = parseFloat(monthlyTargetInput.replace(/\D/g, '')) || 0;
                    handleMonthlyTargetChange(clean);
                  }
                }}
                placeholder="0"
                className="w-44 pl-9 pr-3 py-2 text-sm font-mono font-bold text-slate-900 bg-white border-2 border-indigo-200 rounded-xl focus:border-indigo-600 focus:outline-none shadow-sm"
              />
              <button
                type="button"
                onClick={() => {
                  const clean = parseFloat(monthlyTargetInput.replace(/\D/g, '')) || 0;
                  handleMonthlyTargetChange(clean);
                  handleSaveDraft();
                }}
                className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm whitespace-nowrap cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar Rascunho
              </button>
            </div>
          </div>
        </div>

        {/* Atalhos Rápidos de Meta Mensal */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 text-xs font-medium">Ajustes Rápidos:</span>
            <button
              type="button"
              onClick={() => {
                const val = Math.round(monthlyTarget * 1.05);
                handleMonthlyTargetChange(val);
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold transition-colors cursor-pointer"
            >
              +5% Crescimento
            </button>
            <button
              type="button"
              onClick={() => {
                const val = Math.round(monthlyTarget * 1.1);
                handleMonthlyTargetChange(val);
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold transition-colors cursor-pointer"
            >
              +10% Crescimento
            </button>
            <button
              type="button"
              onClick={() => {
                const val = Math.round(monthlyTarget * 1.15);
                handleMonthlyTargetChange(val);
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold transition-colors cursor-pointer"
            >
              +15% Crescimento
            </button>
            <button
              type="button"
              onClick={() => handleMonthlyTargetChange(0)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold transition-colors cursor-pointer"
            >
              Zerar Meta
            </button>
          </div>

          {/* Botão para abrir configuração de escada */}
          <button
            type="button"
            onClick={() => setIsGrowthConfigOpen(!isGrowthConfigOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isGrowthConfigOpen ? 'Fechar Configuração da Escada' : 'Configurar Evolução de Metas (%)'}</span>
          </button>
        </div>

        {/* Painel Expansível de Configuração da Escada de Metas */}
        {isGrowthConfigOpen && (
          <div className="mt-4 p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Padrão de Evolução de Metas (Crescimento entre Níveis)
                </h4>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  Defina a porcentagem que cada meta sobe em cima da anterior. Ao alterar a Meta 1, todas as demais serão calculadas automaticamente por este padrão:
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveGrowthRatesAsCompanyDefault}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar como Padrão da Empresa
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-700">Meta 1 ➔ Meta 2</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold">+% s/ Meta 1</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={levelGrowthRates[1] || 15}
                    onChange={(e) => handleGrowthRateChange(1, parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-sm font-bold text-slate-900"
                  />
                  <span className="text-xs font-bold text-slate-600">%</span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-700">Meta 2 ➔ Meta 3</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded font-semibold">+% s/ Meta 2</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={levelGrowthRates[2] || 10}
                    onChange={(e) => handleGrowthRateChange(2, parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-sm font-bold text-slate-900"
                  />
                  <span className="text-xs font-bold text-slate-600">%</span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-700">Meta 3 ➔ Meta 4</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold">+% s/ Meta 3</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={levelGrowthRates[3] || 10}
                    onChange={(e) => handleGrowthRateChange(3, parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-sm font-bold text-slate-900"
                  />
                  <span className="text-xs font-bold text-slate-600">%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Níveis de Metas Proporcionais do Mês Selecionado */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">
                Níveis de Metas & Comissionamento para {ALL_MONTHS.find((m) => m.number === selectedMonthNumber)?.name}/{selectedYear}:
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              💡 Você pode <strong>digitar o valor em R$</strong> ou <strong>ajustar a %</strong> diretamente em cada meta.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {calculatedLevels.map((lvl, idx) => {
              const estimatedCommission = Math.round(lvl.revenueTarget * (lvl.commissionPercentage / 100));
              const isManual = idx > 0 && manualLevelValues[idx] !== undefined;
              const growthPercent = idx === 0 ? 0 : levelGrowthRates[idx] || 0;

              return (
                <div
                  key={lvl.level}
                  className={`p-4 rounded-2xl border-2 transition-all shadow-xs ${
                    idx === 0
                      ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-400/20'
                      : idx === 1
                      ? 'bg-blue-50/90 border-blue-300 ring-1 ring-blue-400/20'
                      : idx === 2
                      ? 'bg-purple-50/90 border-purple-300 ring-1 ring-purple-400/20'
                      : 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-400/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                      {lvl.name}
                    </span>
                    <div className="flex items-center gap-1">
                      {isManual && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          ✏️ Manual
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                        {lvl.commissionPercentage}% Comiss.
                      </span>
                    </div>
                  </div>

                  {/* Input Direto de Valor em R$ */}
                  <div className="space-y-1 my-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Valor da Meta (R$):
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs font-bold text-slate-400">R$</span>
                      <input
                        type="text"
                        value={getLevelInputValue(idx, lvl.revenueTarget)}
                        onChange={(e) => handleLevelInputChange(idx, e.target.value)}
                        onBlur={() => handleLevelInputBlurOrEnter(idx)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleLevelInputBlurOrEnter(idx);
                        }}
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-sm text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:outline-none shadow-2xs transition-all"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Seletor de Porcentagem (para Metas 2, 3 e 4) */}
                  {idx > 0 ? (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-xs">
                      <span className="text-[11px] text-slate-600 font-medium">Ajuste %:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-indigo-700">+</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={growthPercent}
                          onChange={(e) => handleGrowthRateChangeDirect(idx, parseFloat(e.target.value) || 0)}
                          className="w-12 text-center py-0.5 px-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                        />
                        <span className="text-[11px] font-bold text-slate-600">% s/ anterior</span>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-200/70 text-xs text-emerald-800 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Meta Base da Unidade</span>
                    </div>
                  )}

                  {/* Prêmio Estimado da Equipe */}
                  <div className="text-[11px] text-slate-600 mt-2 flex justify-between pt-1.5 border-t border-slate-200/70">
                    <span>Prêmio Equipe:</span>
                    <strong className="text-slate-900 font-mono">{formatCurrency(estimatedCommission)}</strong>
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

      {/* 7. HISTÓRICO DE ALTERAÇÕES & LOGS DE AUDITORIA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900">
                  Histórico de Alterações da Meta (Logs de Auditoria)
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {changeLogs.length} {changeLogs.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Rastreabilidade de todas as modificações de metas, níveis, escadas e participações realizadas nesta unidade/empresa.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsLogsExpanded(!isLogsExpanded)}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            {isLogsExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 text-slate-500" />
                <span>Recolher Histórico</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 text-slate-500" />
                <span>Ver Histórico Completo ({changeLogs.length})</span>
              </>
            )}
          </button>
        </div>

        {/* Campo para registrar observação manual */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Adicionar justificativa ou anotação sobre esta meta (ex: Meta reajustada após reunião com diretoria)..."
            value={newLogNote}
            onChange={(e) => setNewLogNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddManualNote();
            }}
            className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={handleAddManualNote}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registrar Anotação</span>
          </button>
        </div>

        {/* Lista de Registros da Linha do Tempo */}
        {isLogsExpanded && (
          <div className="space-y-2.5 pt-1 max-h-72 overflow-y-auto pr-1">
            {changeLogs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                Nenhuma alteração registrada ainda para este período.
              </div>
            ) : (
              changeLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-start justify-between gap-3 text-xs hover:border-slate-300 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          log.action === 'publish'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : log.action === 'update_target'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : log.action === 'update_levels'
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : log.action === 'update_shares'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}
                      >
                        {log.action === 'publish'
                          ? '🚀 Publicação Oficial'
                          : log.action === 'update_target'
                          ? '🎯 Meta Mensal'
                          : log.action === 'update_levels'
                          ? '📈 Escada de Metas'
                          : log.action === 'update_shares'
                          ? '👥 Participação Equipe'
                          : '📝 Anotação / Rascunho'}
                      </span>
                      <span className="font-bold text-slate-800">{log.description}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>
                        Autor: <strong>{log.userName}</strong> ({log.userRole === 'consultant' ? 'Consultor' : log.userRole === 'manager' ? 'Gestor' : 'Vendedor'})
                      </span>
                      <span>•</span>
                      <span>{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Barra de Ações Finais (Salvar Rascunho e Publicar no Rodapé) */}
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

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="w-full sm:w-auto justify-center px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Save className="w-4 h-4 text-slate-600" />
            <span>Salvar Rascunho</span>
          </button>

          <button
            type="button"
            onClick={handlePublishGoal}
            disabled={!isGoalFormValid}
            className={`w-full sm:w-auto justify-center px-5 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer ${
              isGoalFormValid
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Publicar Meta Oficial da Unidade</span>
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

      {/* Modal de Confirmação de Edição Manual de Nível de Meta */}
      {editingLevelModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Editar {editingLevelModal.levelName}
                  </h3>
                  <span className="text-xs text-slate-500">
                    Ajuste manual com confirmação
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingLevelModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Valor Atual Calculado:</span>
                <strong className="font-mono text-slate-900">{formatCurrency(editingLevelModal.currentValue)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Mês de Aplicação:</span>
                <span className="font-semibold text-slate-800">{ALL_MONTHS.find((m) => m.number === selectedMonthNumber)?.name}/{selectedYear}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Novo Valor Desejado para a {editingLevelModal.levelName}:
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="text"
                  autoFocus
                  value={editingLevelModal.inputValue}
                  onChange={(e) => {
                    const clean = e.target.value;
                    setEditingLevelModal((prev) => ({ ...prev, inputValue: clean }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmEditLevel();
                  }}
                  className="w-full pl-10 pr-3 py-2 text-sm font-mono font-bold text-slate-900 bg-white border-2 border-indigo-200 rounded-xl focus:border-indigo-600 focus:outline-none shadow-xs"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Confirmação Necessária:</strong> Este valor substituirá o cálculo automático para a {editingLevelModal.levelName}. Caso você altere a Meta 1 inicial novamente, os níveis voltarão a se ajustar pela regra percentual padrão.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingLevelModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmEditLevel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Confirmar Novo Valor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
