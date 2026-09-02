import {
  MonthlyHistoricalRecord,
  GoalMethodology,
  SmartGoalExplanation,
  UnitDistributionMethod,
  WeeklyDistributionMethod,
  UnitGoalBreakdown,
  WeeklyGoalBreakdown,
  GoalLevel,
  FinancialSettings,
  Branch,
  SimulationTier,
  SaleRecord,
} from '../types';
import { formatCurrency, formatPercent } from './financialEngine';

export interface AnnualHistoricalSummary {
  year: number;
  totalRevenue: number;
  monthlyMean: number;
  bestMonth: {
    monthNumber: number;
    monthName: string;
    revenue: number;
    pctVsMean: number;
  };
  worstMonth: {
    monthNumber: number;
    monthName: string;
    revenue: number;
    pctVsMean: number;
  };
  recent3MonthsAvg: number;
  recent6MonthsAvg: number;
  recentTrendPct: number;
  branchTotals: Record<string, number>;
  branchShares: Record<string, number>; // branchId -> %
}

export interface SeasonalityMonthData {
  monthNumber: number;
  monthName: string;
  revenue: number;
  seasonalityIndex: number; // e.g. 1.487 for Dec, 0.652 for Feb
  classification: 'strong' | 'neutral' | 'weak';
  pctVsMean: number;
  branchRevenues: Record<string, number>;
}

export interface IntelligenceGoalResult {
  targetMonth: number;
  targetMonthName: string;
  methodology: GoalMethodology;
  desiredGrowthPercentage: number;
  baselineReferenceRevenue: number;
  suggestedBaseRevenue: number;
  explanation: SmartGoalExplanation;
  levels: GoalLevel[];
  tiers: SimulationTier[];
  centralPrincipleQuote: string;
  unitBreakdown: UnitGoalBreakdown[];
  weeklyBreakdown: WeeklyGoalBreakdown[];
}

export const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/**
 * Calcula o resumo anual de faturamento e comportamento histórico
 */
export function calculateAnnualSummary(
  monthlyData: MonthlyHistoricalRecord[]
): AnnualHistoricalSummary {
  if (!monthlyData || monthlyData.length === 0) {
    return {
      year: 2025,
      totalRevenue: 0,
      monthlyMean: 0,
      bestMonth: { monthNumber: 1, monthName: 'Janeiro', revenue: 0, pctVsMean: 0 },
      worstMonth: { monthNumber: 1, monthName: 'Janeiro', revenue: 0, pctVsMean: 0 },
      recent3MonthsAvg: 0,
      recent6MonthsAvg: 0,
      recentTrendPct: 0,
      branchTotals: {},
      branchShares: {},
    };
  }

  const year = monthlyData[0]?.year || 2025;
  const totalRevenue = monthlyData.reduce((acc, m) => acc + m.consolidatedRevenue, 0);
  const monthlyMean = totalRevenue / monthlyData.length;

  let best = monthlyData[0];
  let worst = monthlyData[0];

  const branchTotals: Record<string, number> = {};

  monthlyData.forEach((m) => {
    if (m.consolidatedRevenue > best.consolidatedRevenue) best = m;
    if (m.consolidatedRevenue < worst.consolidatedRevenue) worst = m;

    Object.entries(m.branchRevenues).forEach(([bId, rev]) => {
      branchTotals[bId] = (branchTotals[bId] || 0) + rev;
    });
  });

  const branchShares: Record<string, number> = {};
  Object.entries(branchTotals).forEach(([bId, tot]) => {
    branchShares[bId] = totalRevenue > 0 ? (tot / totalRevenue) * 100 : 0;
  });

  // Média últimos 3 e 6 meses
  const sorted = [...monthlyData].sort((a, b) => a.monthNumber - b.monthNumber);
  const last3 = sorted.slice(-3);
  const recent3MonthsAvg = last3.reduce((a, b) => a + b.consolidatedRevenue, 0) / (last3.length || 1);

  const last6 = sorted.slice(-6);
  const recent6MonthsAvg = last6.reduce((a, b) => a + b.consolidatedRevenue, 0) / (last6.length || 1);

  // Tendência recente (compara 1º semestre com 2º semestre)
  const first6 = sorted.slice(0, 6);
  const first6Avg = first6.reduce((a, b) => a + b.consolidatedRevenue, 0) / (first6.length || 1);
  const recentTrendPct = first6Avg > 0 ? ((recent6MonthsAvg - first6Avg) / first6Avg) * 100 : 0;

  return {
    year,
    totalRevenue,
    monthlyMean,
    bestMonth: {
      monthNumber: best.monthNumber,
      monthName: best.monthName,
      revenue: best.consolidatedRevenue,
      pctVsMean: monthlyMean > 0 ? ((best.consolidatedRevenue - monthlyMean) / monthlyMean) * 100 : 0,
    },
    worstMonth: {
      monthNumber: worst.monthNumber,
      monthName: worst.monthName,
      revenue: worst.consolidatedRevenue,
      pctVsMean: monthlyMean > 0 ? ((worst.consolidatedRevenue - monthlyMean) / monthlyMean) * 100 : 0,
    },
    recent3MonthsAvg,
    recent6MonthsAvg,
    recentTrendPct,
    branchTotals,
    branchShares,
  };
}

/**
 * Calcula os índices de sazonalidade para cada mês do histórico
 * Índice = Faturamento Histórico do Mês / Média Mensal Histórica
 */
export function calculateSeasonalityIndices(
  monthlyData: MonthlyHistoricalRecord[]
): SeasonalityMonthData[] {
  if (!monthlyData || monthlyData.length === 0) return [];

  const totalRevenue = monthlyData.reduce((acc, m) => acc + m.consolidatedRevenue, 0);
  const monthlyMean = totalRevenue / monthlyData.length;

  return monthlyData.map((m) => {
    const idx = monthlyMean > 0 ? m.consolidatedRevenue / monthlyMean : 1;
    let classification: 'strong' | 'neutral' | 'weak' = 'neutral';
    if (idx >= 1.05) classification = 'strong';
    else if (idx <= 0.95) classification = 'weak';

    const pctVsMean = monthlyMean > 0 ? (idx - 1) * 100 : 0;

    return {
      monthNumber: m.monthNumber,
      monthName: m.monthName,
      revenue: m.consolidatedRevenue,
      seasonalityIndex: Number(idx.toFixed(3)),
      classification,
      pctVsMean: Number(pctVsMean.toFixed(1)),
      branchRevenues: m.branchRevenues,
    };
  });
}

/**
 * Motor de Inteligência Comercial e Sugestão de Metas
 * Implementa os 4 Métodos (YoY, Médias Recentes, Sazonalidade e Meta Inteligente Híbrida)
 */
export function generateIntelligentGoalProposal(params: {
  targetMonth: number; // 1 to 12
  methodology: GoalMethodology;
  desiredGrowthPercentage: number;
  recentPeriodOption?: '3_months' | '6_months' | '4_weeks' | '8_weeks' | '12_weeks';
  customWeights?: { yoy: number; recent: number; seasonality: number; trend: number };
  levelPercentages?: number[]; // e.g. [5, 10, 15, 20]
  monthlyData: MonthlyHistoricalRecord[];
  weeklySales: SaleRecord[];
  branches: Branch[];
  financialSettings: FinancialSettings;
  customLevelCommissions?: number[]; // [1.3, 1.8, 2.3, 3.0]
  unitDistributionMethod?: UnitDistributionMethod;
  customUnitShares?: Record<string, number>;
  weeklyDistributionMethod?: WeeklyDistributionMethod;
  customWeeklyShares?: number[];
}): IntelligenceGoalResult {
  const {
    targetMonth,
    methodology,
    desiredGrowthPercentage,
    recentPeriodOption = '3_months',
    customWeights = { yoy: 35, recent: 30, seasonality: 20, trend: 15 },
    levelPercentages = [5, 10, 15, 20],
    monthlyData,
    weeklySales,
    branches,
    financialSettings,
    customLevelCommissions = [1.3, 1.8, 2.3, 3.0],
    unitDistributionMethod = 'historical',
    customUnitShares,
    weeklyDistributionMethod = 'business_days',
    customWeeklyShares,
  } = params;

  const monthName = MONTH_NAMES[targetMonth - 1] || `Mês ${targetMonth}`;
  const annualSummary = calculateAnnualSummary(monthlyData);
  const seasonalityList = calculateSeasonalityIndices(monthlyData);

  const targetMonthHistorical = monthlyData.find((m) => m.monthNumber === targetMonth);
  const yoyRevenue = targetMonthHistorical?.consolidatedRevenue ?? annualSummary.monthlyMean;

  const targetMonthSeasonality = seasonalityList.find((s) => s.monthNumber === targetMonth);
  const seasonalityIndex = targetMonthSeasonality?.seasonalityIndex ?? 1.0;

  // Cálculo da média recente
  let recentAverageRevenue = annualSummary.recent3MonthsAvg;
  if (recentPeriodOption === '6_months') {
    recentAverageRevenue = annualSummary.recent6MonthsAvg;
  } else if (recentPeriodOption === '4_weeks' || recentPeriodOption === '8_weeks' || recentPeriodOption === '12_weeks') {
    const weekCount = recentPeriodOption === '4_weeks' ? 4 : recentPeriodOption === '8_weeks' ? 8 : 12;
    // Soma vendas semanais recentes
    const weeklySumMap: Record<number, number> = {};
    weeklySales.forEach((s) => {
      weeklySumMap[s.periodNumber] = (weeklySumMap[s.periodNumber] || 0) + s.revenue;
    });
    const weeks = Object.keys(weeklySumMap).map(Number).sort((a, b) => a - b);
    const recentWeeks = weeks.slice(-weekCount);
    const weekAvg = recentWeeks.length > 0
      ? recentWeeks.reduce((acc, w) => acc + weeklySumMap[w], 0) / recentWeeks.length
      : annualSummary.monthlyMean / 4.33;
    recentAverageRevenue = weekAvg * 4.33; // Normaliza para mês
  }

  const recentTrendPercentage = annualSummary.recentTrendPct;

  // Cálculo da Meta Base conforme a Metodologia Escolhida
  let baselineReferenceRevenue = yoyRevenue;
  let suggestedBaseRevenue = 0;
  let explanationText = '';

  const growthFactor = 1 + desiredGrowthPercentage / 100;

  switch (methodology) {
    case 'yoy':
      baselineReferenceRevenue = yoyRevenue;
      suggestedBaseRevenue = Math.round((yoyRevenue * growthFactor) / 100) * 100;
      explanationText = `Meta calculada com base direta no mesmo período do ano anterior (${monthName}/2025: ${formatCurrency(
        yoyRevenue
      )}) acrescido de ${formatPercent(desiredGrowthPercentage)} de crescimento desejado.`;
      break;

    case 'recent_average':
      baselineReferenceRevenue = recentAverageRevenue;
      suggestedBaseRevenue = Math.round((recentAverageRevenue * growthFactor) / 100) * 100;
      explanationText = `Meta baseada na média recente da empresa (${formatCurrency(
        recentAverageRevenue
      )}), projetando ${formatPercent(desiredGrowthPercentage)} de crescimento adicional sobre a velocidade atual de vendas.`;
      break;

    case 'seasonality':
      // Aplica o índice de sazonalidade sobre a média mensal da empresa
      const seasonalBase = annualSummary.monthlyMean * seasonalityIndex;
      baselineReferenceRevenue = seasonalBase;
      suggestedBaseRevenue = Math.round((seasonalBase * growthFactor) / 100) * 100;
      explanationText = `Meta calculada ajustando a média anual histórica da empresa (${formatCurrency(
        annualSummary.monthlyMean
      )}) pelo índice de sazonalidade de ${monthName} (${seasonalityIndex.toFixed(
        2
      )}x), somando ${formatPercent(desiredGrowthPercentage)} de expansão.`;
      break;

    case 'hybrid_smart':
    default: {
      // Método Híbrido Inteligente Recomendado
      // Combina YoY + Média Recente + Sazonalidade + Ajuste de Tendência
      const totalWeight =
        customWeights.yoy +
        customWeights.recent +
        customWeights.seasonality +
        customWeights.trend;

      const yoyComponent = yoyRevenue;
      const recentComponent = recentAverageRevenue;
      const seasonalityComponent = annualSummary.monthlyMean * seasonalityIndex;
      // Tendência aplica aceleração se a empresa estiver crescendo
      const trendMultiplier = 1 + (recentTrendPercentage / 100) * 0.5;
      const trendComponent = recentAverageRevenue * trendMultiplier;

      const weightedBaseline =
        (yoyComponent * customWeights.yoy +
          recentComponent * customWeights.recent +
          seasonalityComponent * customWeights.seasonality +
          trendComponent * customWeights.trend) /
        (totalWeight || 100);

      baselineReferenceRevenue = Math.round(weightedBaseline);
      suggestedBaseRevenue = Math.round((weightedBaseline * growthFactor) / 100) * 100;

      explanationText = `Esta meta foi calculada considerando o desempenho de ${monthName} do ano anterior (${formatCurrency(
        yoyRevenue
      )}), a média recente da empresa (${formatCurrency(
        recentAverageRevenue
      )}), a sazonalidade histórica (${seasonalityIndex.toFixed(
        2
      )}x), a tendência das vendas (${formatPercent(recentTrendPercentage)}) e o crescimento planejado (${formatPercent(
        desiredGrowthPercentage
      )}).`;
      break;
    }
  }

  // Indicador de Confiança da Análise (com 1 ano de histórico = 82% moderada/alta, expande com mais anos)
  const confidenceScore = Math.min(95, 78 + monthlyData.length * 1.2);

  const smartExplanation: SmartGoalExplanation = {
    targetMonthName: monthName,
    methodology,
    yoyRevenue,
    recentAverageRevenue,
    seasonalityIndex,
    recentTrendPercentage: Number(recentTrendPercentage.toFixed(1)),
    desiredGrowthPercentage,
    weights: customWeights,
    suggestedBaseRevenue,
    confidenceScore: Math.round(confidenceScore),
    explanationText,
  };

  // Níveis sugeridos (Meta 1 a Meta 4)
  // Cada nível é calculado com base na referência + percentuais configuráveis
  const levels: GoalLevel[] = levelPercentages.slice(0, 4).map((pct, idx) => {
    const levelNum = idx + 1;
    // Meta 1 usa suggestedBaseRevenue como base ou referência * (1 + pct/100)
    const target =
      idx === 0
        ? suggestedBaseRevenue
        : Math.round((baselineReferenceRevenue * (1 + pct / 100)) / 500) * 500;

    return {
      level: levelNum,
      name: `Meta ${levelNum}`,
      revenueTarget: Math.max(0, target),
      commissionPercentage: customLevelCommissions[idx] ?? (1.3 + idx * 0.5),
    };
  });

  // Simulação de Viabilidade Financeira & Rentabilidade dos Níveis
  const baselinePerf = {
    revenue: baselineReferenceRevenue,
    cmv: baselineReferenceRevenue * (financialSettings.cmvPercentage / 100),
    tax: baselineReferenceRevenue * (financialSettings.taxPercentage / 100),
    card: baselineReferenceRevenue * (financialSettings.cardFeePercentage / 100),
    other: baselineReferenceRevenue * (financialSettings.otherVariableCostsPercentage / 100),
    commission: baselineReferenceRevenue * (levels[0].commissionPercentage / 100),
  };
  const baselineTotalCosts =
    baselinePerf.cmv +
    baselinePerf.tax +
    baselinePerf.card +
    baselinePerf.other +
    baselinePerf.commission;
  const baselineMargin = baselineReferenceRevenue - baselineTotalCosts;

  const tiers: SimulationTier[] = levels.map((lvl) => {
    const targetRevenue = lvl.revenueTarget;
    const growthAmount = targetRevenue - baselineReferenceRevenue;
    const growthPct =
      baselineReferenceRevenue > 0 ? (growthAmount / baselineReferenceRevenue) * 100 : 0;

    const cmv = targetRevenue * (financialSettings.cmvPercentage / 100);
    const tax = targetRevenue * (financialSettings.taxPercentage / 100);
    const card = targetRevenue * (financialSettings.cardFeePercentage / 100);
    const other = targetRevenue * (financialSettings.otherVariableCostsPercentage / 100);
    const commission = targetRevenue * (lvl.commissionPercentage / 100);

    const totalCosts = cmv + tax + card + other + commission;
    const contributionMargin = targetRevenue - totalCosts;
    const contributionMarginPct =
      targetRevenue > 0 ? (contributionMargin / targetRevenue) * 100 : 0;

    const incrementalRevenue = growthAmount;
    const incrementalCosts = totalCosts - baselineTotalCosts;
    const incrementalMargin = contributionMargin - baselineMargin;
    const incrementalMarginPct =
      incrementalRevenue > 0 ? (incrementalMargin / incrementalRevenue) * 100 : 0;

    const isViable = incrementalMargin > 0;
    let viabilityComment = '';
    if (incrementalMargin <= 0) {
      viabilityComment = 'Inviável: O custo com comissões adicionais supera a receita líquida gerada.';
    } else if (incrementalMarginPct < 15) {
      viabilityComment = 'Atenção: Margem incremental apertada. Risco de erosão de caixa.';
    } else if (incrementalMarginPct >= 30) {
      viabilityComment = 'Excelente: Alta rentabilidade incremental e alavancagem operacional.';
    } else {
      viabilityComment = 'Viável: Retorno equilibrado com expansão segura da margem de contribuição.';
    }

    return {
      level: lvl.level,
      name: lvl.name,
      targetRevenue,
      revenueGrowthAmount: growthAmount,
      revenueGrowthPercentage: growthPct,
      cmvAmount: cmv,
      taxAmount: tax,
      cardFeeAmount: card,
      commissionPercentage: lvl.commissionPercentage,
      commissionAmount: commission,
      otherCostsAmount: other,
      totalVariableCosts: totalCosts,
      contributionMargin,
      contributionMarginPercentage: contributionMarginPct,
      incrementalMarginAmount: incrementalMargin,
      incrementalMarginPercentage: incrementalMarginPct,
      incrementalRevenue,
      incrementalCosts,
      isViable,
      viabilityComment,
    };
  });

  // Parecer Central do Gerador de Metas (Princípio Central)
  const meta1Tier = tiers[0] || { incrementalMarginAmount: 0 };
  const centralPrincipleQuote = `Com base no histórico, sazonalidade e desempenho recente, uma meta de ${formatCurrency(
    suggestedBaseRevenue
  )} representa ${formatPercent(
    desiredGrowthPercentage
  )} de crescimento sobre o período comparável. Se atingida, considerando CMV (${formatPercent(
    financialSettings.cmvPercentage
  )}), impostos (${formatPercent(financialSettings.taxPercentage)}), taxas (${formatPercent(
    financialSettings.cardFeePercentage
  )}) e comissão (${formatPercent(
    levels[0]?.commissionPercentage ?? 1.3
  )}), deverá gerar aproximadamente ${formatCurrency(
    Math.max(0, meta1Tier.incrementalMarginAmount)
  )} adicionais de margem.`;

  // Distribuição da Meta Consolidada para as Unidades
  const unitBreakdown = distributeGoalToUnits(
    suggestedBaseRevenue,
    branches,
    monthlyData,
    unitDistributionMethod,
    customUnitShares
  );

  // Desdobramento da Meta Mensal para Semanas (4 a 5 semanas)
  const weeklyBreakdown = distributeGoalToWeeks(
    suggestedBaseRevenue,
    targetMonth,
    2026,
    weeklyDistributionMethod,
    customWeeklyShares
  );

  return {
    targetMonth,
    targetMonthName: monthName,
    methodology,
    desiredGrowthPercentage,
    baselineReferenceRevenue,
    suggestedBaseRevenue,
    explanation: smartExplanation,
    levels,
    tiers,
    centralPrincipleQuote,
    unitBreakdown,
    weeklyBreakdown,
  };
}

/**
 * Distribui a meta consolidada entre as unidades (Matriz e Filiais)
 * 3 Opções:
 * 1. "Distribuir pelo histórico" (calcula dinamicamente a participação real)
 * 2. "Distribuir igualmente" (50/50 ou 1/N)
 * 3. "Definir manualmente"
 */
export function distributeGoalToUnits(
  consolidatedGoal: number,
  branches: Branch[],
  monthlyData: MonthlyHistoricalRecord[],
  method: UnitDistributionMethod = 'historical',
  customShares?: Record<string, number>
): UnitGoalBreakdown[] {
  const activeBranches = branches.filter((b) => b.active);
  if (activeBranches.length === 0) return [];

  // Calcula a participação histórica real de cada unidade
  const branchTotals: Record<string, number> = {};
  let totalHistorical = 0;

  monthlyData.forEach((m) => {
    Object.entries(m.branchRevenues).forEach(([bId, val]) => {
      branchTotals[bId] = (branchTotals[bId] || 0) + val;
      totalHistorical += val;
    });
  });

  return activeBranches.map((b) => {
    const bTotal = branchTotals[b.id] || 0;
    const historicalShare = totalHistorical > 0 ? (bTotal / totalHistorical) * 100 : 100 / activeBranches.length;

    let assignedShare = historicalShare;

    if (method === 'equal') {
      assignedShare = 100 / activeBranches.length;
    } else if (method === 'manual' && customShares && customShares[b.id] !== undefined) {
      assignedShare = customShares[b.id];
    }

    const suggestedTarget = Math.round((consolidatedGoal * (assignedShare / 100)) / 100) * 100;

    return {
      branchId: b.id,
      branchName: b.name,
      historicalSharePercentage: Number(historicalShare.toFixed(1)),
      assignedSharePercentage: Number(assignedShare.toFixed(1)),
      suggestedTarget,
    };
  });
}

/**
 * Distribui a meta mensal entre as semanas do mês
 * Considera dias úteis comerciais (segunda a sábado), distribuição igual, histórica ou manual
 */
export function distributeGoalToWeeks(
  monthlyGoal: number,
  monthNumber: number,
  year: number = 2026,
  method: WeeklyDistributionMethod = 'business_days',
  customShares?: number[]
): WeeklyGoalBreakdown[] {
  // Configuração padrão de semanas por mês no varejo (normalmente 4 semanas cheias + resíduo, totalizando 4 ou 5 semanas)
  // Mapeamento de dias úteis padrão por semana do mês (ex: Seg a Sáb = 6 dias/sem)
  const is5WeekMonth = [1, 5, 7, 10, 12].includes(monthNumber); // Meses com 5 semanas completas
  const weekCount = is5WeekMonth ? 5 : 4;

  const defaultBusinessDays = is5WeekMonth ? [6, 6, 6, 6, 2] : [6, 6, 6, 7];
  const totalDays = defaultBusinessDays.reduce((a, b) => a + b, 0);

  const breakdowns: WeeklyGoalBreakdown[] = [];

  let accumulatedTarget = 0;

  for (let i = 0; i < weekCount; i++) {
    const weekNum = i + 1;
    const bDays = defaultBusinessDays[i];

    let sharePct = (bDays / totalDays) * 100;

    if (method === 'equal') {
      sharePct = 100 / weekCount;
    } else if (method === 'manual' && customShares && customShares[i] !== undefined) {
      sharePct = customShares[i];
    } else if (method === 'historical') {
      // Sazonalidade intra-mês típica do varejo (1ª semana forte de pagamento, 4ª semana fechamento)
      const intraMonthShares = is5WeekMonth
        ? [24, 22, 18, 26, 10]
        : [28, 25, 20, 27];
      sharePct = intraMonthShares[i] || 100 / weekCount;
    }

    let target = 0;
    if (i === weekCount - 1) {
      // Última semana ajusta a diferença para garantir soma exatamente igual à meta mensal
      target = Math.max(0, monthlyGoal - accumulatedTarget);
    } else {
      target = Math.round((monthlyGoal * (sharePct / 100)) / 100) * 100;
      accumulatedTarget += target;
    }

    breakdowns.push({
      weekNumber: weekNum,
      weekLabel: `Semana ${weekNum.toString().padStart(2, '0')}`,
      businessDays: bDays,
      sharePercentage: Number(sharePct.toFixed(1)),
      suggestedTarget: target,
    });
  }

  return breakdowns;
}
