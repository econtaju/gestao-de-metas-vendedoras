import {
  FinancialSettings,
  GoalLevel,
  CalculationResult,
  SimulationTier,
  GoalSuggestion,
} from '../types';

/**
 * Normaliza e filtra os níveis ativos de acordo com numberOfLevels
 */
export function getActiveLevels(levels: GoalLevel[], numberOfLevels: number): GoalLevel[] {
  return levels
    .slice(0, Math.min(numberOfLevels, 4))
    .sort((a, b) => a.level - b.level);
}

/**
 * Identifica o maior nível de meta atingido por um faturamento e calcula comissão e margens.
 * Regra: O percentual do nível atingido incide sobre TODO o faturamento realizado no período.
 */
export function calculateSalePerformance(
  revenue: number,
  allLevels: GoalLevel[],
  numberOfLevels: number,
  financialSettings: FinancialSettings,
  targetBaseline?: number
): CalculationResult {
  const activeLevels = getActiveLevels(allLevels, numberOfLevels);
  const target = targetBaseline ?? (activeLevels.length > 0 ? activeLevels[0].revenueTarget : 0);

  // Encontra o maior nível atingido
  let achievedLevel = 0;
  let achievedLevelName = 'Abaixo da Meta 1';
  let commissionPercentage = 0;

  for (const level of activeLevels) {
    if (revenue >= level.revenueTarget) {
      achievedLevel = level.level;
      achievedLevelName = level.name;
      commissionPercentage = level.commissionPercentage;
    }
  }

  // Comissão sobre todo o faturamento
  const commissionAmount = revenue * (commissionPercentage / 100);

  // Custos variáveis
  const cmvAmount = revenue * (financialSettings.cmvPercentage / 100);
  const taxAmount = revenue * (financialSettings.taxPercentage / 100);
  const cardFeeAmount = revenue * (financialSettings.cardFeePercentage / 100);
  const otherCostsAmount = revenue * (financialSettings.otherVariableCostsPercentage / 100);

  const totalVariableCosts =
    cmvAmount + taxAmount + cardFeeAmount + otherCostsAmount + commissionAmount;
  const contributionMarginAmount = revenue - totalVariableCosts;
  const contributionMarginPercentage =
    revenue > 0 ? (contributionMarginAmount / revenue) * 100 : 0;

  // % de atingimento em relação à Meta 1 ou baseline
  const baseTarget = activeLevels.length > 0 ? activeLevels[0].revenueTarget : target;
  const achievementPercentage = baseTarget > 0 ? (revenue / baseTarget) * 100 : 0;

  // Próximo nível e gap
  let gapToNextLevel = 0;
  let nextLevelTarget: number | null = null;
  let nextLevelCommissionPercentage: number | null = null;
  let potentialCommissionNextLevel: number | null = null;
  let potentialCommissionGain: number | null = null;

  const nextLevel = activeLevels.find((lvl) => lvl.level === achievedLevel + 1);

  if (nextLevel) {
    gapToNextLevel = Math.max(0, nextLevel.revenueTarget - revenue);
    nextLevelTarget = nextLevel.revenueTarget;
    nextLevelCommissionPercentage = nextLevel.commissionPercentage;
    // Comissão que ele receberia no valor exato da próxima meta
    potentialCommissionNextLevel =
      nextLevel.revenueTarget * (nextLevel.commissionPercentage / 100);
    potentialCommissionGain = Math.max(0, potentialCommissionNextLevel - commissionAmount);
  }

  return {
    revenue,
    target: baseTarget,
    achievementPercentage,
    achievedLevel,
    achievedLevelName,
    commissionPercentage,
    commissionAmount,
    cmvAmount,
    taxAmount,
    cardFeeAmount,
    otherCostsAmount,
    totalVariableCosts,
    contributionMarginAmount,
    contributionMarginPercentage,
    gapToNextLevel,
    nextLevelTarget,
    nextLevelCommissionPercentage,
    potentialCommissionNextLevel,
    potentialCommissionGain,
  };
}

/**
 * Simula os cenários de metas (Atual vs Meta 1..Meta N) calculando Margem Incremental e Viabilidade
 */
export function calculateScenarioSimulation(
  baselineRevenue: number,
  allLevels: GoalLevel[],
  numberOfLevels: number,
  financialSettings: FinancialSettings
): {
  baselineTier: {
    revenue: number;
    cmv: number;
    taxes: number;
    cardFees: number;
    otherCosts: number;
    commission: number;
    commissionPct: number;
    totalCosts: number;
    margin: number;
    marginPct: number;
  };
  tiers: SimulationTier[];
} {
  const activeLevels = getActiveLevels(allLevels, numberOfLevels);

  // Baseline calculation (Cenário Atual)
  // Assume commission of 0% or achieved level for baseline
  const baselinePerf = calculateSalePerformance(
    baselineRevenue,
    activeLevels,
    numberOfLevels,
    financialSettings
  );

  const baselineTier = {
    revenue: baselineRevenue,
    cmv: baselinePerf.cmvAmount,
    taxes: baselinePerf.taxAmount,
    cardFees: baselinePerf.cardFeeAmount,
    otherCosts: baselinePerf.otherCostsAmount,
    commission: baselinePerf.commissionAmount,
    commissionPct: baselinePerf.commissionPercentage,
    totalCosts: baselinePerf.totalVariableCosts,
    margin: baselinePerf.contributionMarginAmount,
    marginPct: baselinePerf.contributionMarginPercentage,
  };

  const tiers: SimulationTier[] = activeLevels.map((lvl) => {
    const targetRevenue = lvl.revenueTarget;
    const revenueGrowthAmount = targetRevenue - baselineRevenue;
    const revenueGrowthPercentage =
      baselineRevenue > 0 ? (revenueGrowthAmount / baselineRevenue) * 100 : 0;

    const cmvAmount = targetRevenue * (financialSettings.cmvPercentage / 100);
    const taxAmount = targetRevenue * (financialSettings.taxPercentage / 100);
    const cardFeeAmount = targetRevenue * (financialSettings.cardFeePercentage / 100);
    const otherCostsAmount =
      targetRevenue * (financialSettings.otherVariableCostsPercentage / 100);
    const commissionAmount = targetRevenue * (lvl.commissionPercentage / 100);

    const totalVariableCosts =
      cmvAmount + taxAmount + cardFeeAmount + otherCostsAmount + commissionAmount;
    const contributionMargin = targetRevenue - totalVariableCosts;
    const contributionMarginPercentage =
      targetRevenue > 0 ? (contributionMargin / targetRevenue) * 100 : 0;

    const incrementalRevenue = revenueGrowthAmount;
    const incrementalCosts = totalVariableCosts - baselineTier.totalCosts;
    const incrementalMarginAmount = contributionMargin - baselineTier.margin;
    const incrementalMarginPercentage =
      incrementalRevenue > 0
        ? (incrementalMarginAmount / incrementalRevenue) * 100
        : 0;

    // Análise de viabilidade para o consultor:
    // Uma meta é financeiramente viável quando gera margem incremental positiva e retorno sobre comissão
    const isViable = incrementalMarginAmount > 0;
    let viabilityComment = '';

    if (incrementalMarginAmount <= 0) {
      viabilityComment =
        'Inviável: O aumento de comissão e custos supera a receita adicional, destruindo a margem da empresa.';
    } else if (incrementalMarginPercentage < 15) {
      viabilityComment =
        'Atenção: Margem incremental estreita. O ganho em lucro líquido adicional é baixo em relação ao esforço.';
    } else if (incrementalMarginPercentage >= 30) {
      viabilityComment =
        'Excelente: Alta geração de caixa incremental. Acelera faturamento e rentabilidade da empresa.';
    } else {
      viabilityComment =
        'Viável: Proporciona retorno positivo e absorve adequadamente os custos variáveis e comissão.';
    }

    return {
      level: lvl.level,
      name: lvl.name,
      targetRevenue,
      revenueGrowthAmount,
      revenueGrowthPercentage,
      cmvAmount,
      taxAmount,
      cardFeeAmount,
      commissionPercentage: lvl.commissionPercentage,
      commissionAmount,
      otherCostsAmount,
      totalVariableCosts,
      contributionMargin,
      contributionMarginPercentage,
      incrementalMarginAmount,
      incrementalMarginPercentage,
      incrementalRevenue,
      incrementalCosts,
      isViable,
      viabilityComment,
    };
  });

  return { baselineTier, tiers };
}

/**
 * Gera estatísticas históricas e sugestão inteligente de metas
 */
export function generateGoalSuggestions(
  historicalRevenues: number[],
  desiredGrowthPercentage: number,
  numberOfLevels: number = 4,
  currentLevels?: GoalLevel[]
): GoalSuggestion {
  if (historicalRevenues.length === 0) {
    const defaultBaseline = 80000;
    return {
      baselineRevenue: defaultBaseline,
      growthPercentage: desiredGrowthPercentage,
      suggestedLevels: createDefaultLevels(defaultBaseline, desiredGrowthPercentage, numberOfLevels),
      historicalStats: {
        periodCount: 0,
        mean: defaultBaseline,
        median: defaultBaseline,
        max: defaultBaseline,
        min: defaultBaseline,
        trendPercentage: 0,
        stdDev: 0,
        consistencyScore: 80,
      },
    };
  }

  const n = historicalRevenues.length;
  const sorted = [...historicalRevenues].sort((a, b) => a - b);
  const sum = historicalRevenues.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  const median =
    n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  // Desvio padrão
  const variance =
    historicalRevenues.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // Tendência recente (compara primeira metade com segunda metade)
  let trendPercentage = 0;
  if (n >= 4) {
    const half = Math.floor(n / 2);
    const firstHalfAvg =
      historicalRevenues.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const secondHalfAvg =
      historicalRevenues.slice(half).reduce((a, b) => a + b, 0) / (n - half);
    if (firstHalfAvg > 0) {
      trendPercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    }
  }

  // Score de consistência (0..100)
  const cv = mean > 0 ? (stdDev / mean) * 100 : 0;
  const consistencyScore = Math.max(0, Math.min(100, Math.round(100 - cv * 1.5)));

  // Baseline de cálculo (média ponderada dos dados recentes)
  const recentWeight = Math.min(4, n);
  const recentSlice = historicalRevenues.slice(-recentWeight);
  const recentAvg = recentSlice.reduce((a, b) => a + b, 0) / recentWeight;
  const baselineRevenue = Math.round(recentAvg > 0 ? recentAvg : mean);

  // Sugestões de níveis
  const suggestedLevels = createDefaultLevels(
    baselineRevenue,
    desiredGrowthPercentage,
    numberOfLevels,
    currentLevels
  );

  return {
    baselineRevenue,
    growthPercentage: desiredGrowthPercentage,
    suggestedLevels,
    historicalStats: {
      periodCount: n,
      mean: Math.round(mean),
      median: Math.round(median),
      max: Math.round(max),
      min: Math.round(min),
      trendPercentage: Number(trendPercentage.toFixed(1)),
      stdDev: Math.round(stdDev),
      consistencyScore,
    },
  };
}

/**
 * Cria níveis sugeridos com progressão geométrica suave e comissões coerentes
 */
export function createDefaultLevels(
  baseline: number,
  growthPercentage: number,
  numberOfLevels: number,
  existingLevels?: GoalLevel[]
): GoalLevel[] {
  const baseTarget = Math.round(baseline * (1 + growthPercentage / 100) / 100) * 100;

  // Fatores de escala para os níveis
  const multipliers = [1.0, 1.08, 1.18, 1.30];
  const commissionDefaults = [1.3, 1.8, 2.3, 3.0];

  const levels: GoalLevel[] = [];

  for (let i = 0; i < 4; i++) {
    const levelNumber = i + 1;
    const existing = existingLevels?.find((l) => l.level === levelNumber);

    const target =
      i === 0
        ? baseTarget
        : Math.round((baseTarget * multipliers[i]) / 500) * 500;

    levels.push({
      level: levelNumber,
      name: `Meta ${levelNumber}`,
      revenueTarget: existing?.revenueTarget ?? target,
      commissionPercentage: existing?.commissionPercentage ?? commissionDefaults[i],
    });
  }

  return levels.slice(0, numberOfLevels);
}

/**
 * Formata valores monetários em padrão BRL
 */
export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formata valores compactos (ex: R$ 80k, R$ 1,2M)
 */
export function formatCompactCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0';
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `R$ ${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  }
  return formatCurrency(value);
}

/**
 * Formata percentual
 */
export function formatPercent(value: number | undefined | null, decimals: number = 1): string {
  if (value === undefined || value === null || isNaN(value)) return '0,0%';
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}
