import {
  CommercialWeekPeriod,
  WeeklyWeightTemplate,
  MonthlyMasterGoal,
  SellerGoalDetail,
  TeamParticipationSummary,
  GoalSimulationScenario,
  Seller,
  SaleRecord,
  Company,
  Branch,
  FinancialSettings,
  SellerAvailability,
  WorkingDaysSettings,
  GoalChangeLog,
} from '../types';
import { MONTH_NAMES } from './intelligenceEngine';
import { formatCurrency, formatPercent } from './financialEngine';
import {
  getSellerIntervalAvailability,
  DEFAULT_WORKING_DAYS_SETTINGS,
} from './availabilityEngine';

// =========================================================================
// 1. TEMPLATES DE PESOS SEMANAIS PADRÃO
// =========================================================================

export const DEFAULT_WEIGHT_TEMPLATES: WeeklyWeightTemplate[] = [
  {
    id: 'tpl-normal-4',
    name: 'Mês normal (4 semanas)',
    description: 'Distribuição padrão de mercado com evolução equilibrada ao longo do mês.',
    weeksCount: 4,
    weights: [20, 25, 25, 30],
    isSystemDefault: true,
  },
  {
    id: 'tpl-inicio-fraco-4',
    name: 'Início fraco (4 semanas)',
    description: 'Concentração de faturamento na segunda quinzena e fechamento de mês.',
    weeksCount: 4,
    weights: [15, 20, 25, 40],
    isSystemDefault: true,
  },
  {
    id: 'tpl-igual-4',
    name: 'Distribuição Igualitária (4 semanas)',
    description: 'Divisão uniforme de 25% por semana comercial.',
    weeksCount: 4,
    weights: [25, 25, 25, 25],
    isSystemDefault: true,
  },
  {
    id: 'tpl-agressivo-fim-4',
    name: 'Final de Mês Agressivo (4 semanas)',
    description: 'Foco massivo na última semana comercial para bater metas de fechamento.',
    weeksCount: 4,
    weights: [10, 20, 30, 40],
    isSystemDefault: true,
  },
  {
    id: 'tpl-inicio-forte-4',
    name: 'Início Forte / Quinto Dia Útil (4 semanas)',
    description: 'Aproveita o recebimento de salários no início do mês.',
    weeksCount: 4,
    weights: [35, 25, 20, 20],
    isSystemDefault: true,
  },
  {
    id: 'tpl-normal-5',
    name: 'Mês com 5 semanas (Normal)',
    description: 'Distribuição equilibrada para meses que trabalham com 5 semanas comerciais.',
    weeksCount: 5,
    weights: [15, 20, 20, 25, 20],
    isSystemDefault: true,
  },
  {
    id: 'tpl-igual-5',
    name: 'Distribuição Igualitária (5 semanas)',
    description: 'Divisão uniforme de 20% por semana comercial.',
    weeksCount: 5,
    weights: [20, 20, 20, 20, 20],
    isSystemDefault: true,
  },
];

// =========================================================================
// 2. CONSTRUÇÃO E VALIDAÇÃO DE PERÍODOS COMERCIAIS
// =========================================================================

/**
 * Retorna o número de dias de um mês em um determinado ano.
 */
export function getDaysInMonth(year: number, monthNumber: number): number {
  return new Date(year, monthNumber, 0).getDate();
}

/**
 * Constrói a lista de semanas comerciais com base nas regras do negócio:
 * 4 semanas:
 *   Semana 1: 01 a 07
 *   Semana 2: 08 a 15
 *   Semana 3: 16 a 23
 *   Semana 4: 24 ao último dia do mês (30 ou 31, ou 28/29 em Fev)
 * 5 semanas:
 *   Semana 1: 01 a 07
 *   Semana 2: 08 a 14
 *   Semana 3: 15 a 21
 *   Semana 4: 22 a 28
 *   Semana 5: 29 ao último dia do mês (30 ou 31)
 */
export function buildCommercialWeeks(
  year: number,
  monthNumber: number,
  numberOfWeeks: 4 | 5 = 4,
  weights: number[] = [15, 20, 25, 40],
  monthlyTarget: number = 200000
): CommercialWeekPeriod[] {
  const lastDay = getDaysInMonth(year, monthNumber);
  const weeks: CommercialWeekPeriod[] = [];

  if (numberOfWeeks === 4) {
    const defaultWeights = weights.length === 4 ? weights : [15, 20, 25, 40];
    const ranges = [
      { start: 1, end: 7, label: '01 a 07' },
      { start: 8, end: 15, label: '08 a 15' },
      { start: 16, end: 23, label: '16 a 23' },
      { start: 24, end: lastDay, label: `24 a ${lastDay}` },
    ];

    ranges.forEach((r, idx) => {
      const weight = defaultWeights[idx] ?? 25;
      const target = monthlyTarget * (weight / 100);
      const mStr = String(monthNumber).padStart(2, '0');
      const startStr = `${year}-${mStr}-${String(r.start).padStart(2, '0')}`;
      const endStr = `${year}-${mStr}-${String(r.end).padStart(2, '0')}`;
      weeks.push({
        weekNumber: idx + 1,
        label: `Semana ${idx + 1} (${r.label})`,
        startDay: r.start,
        endDay: r.end,
        startDate: startStr,
        endDate: endStr,
        dateRangeLabel: r.label,
        weightPercentage: weight,
        revenueTarget: Math.round(target * 100) / 100,
      });
    });
  } else {
    // 5 semanas
    const defaultWeights = weights.length === 5 ? weights : [15, 20, 20, 25, 20];
    const ranges = [
      { start: 1, end: 7, label: '01 a 07' },
      { start: 8, end: 14, label: '08 a 14' },
      { start: 15, end: 21, label: '15 a 21' },
      { start: 22, end: 28, label: '22 a 28' },
      { start: 29, end: lastDay, label: `29 a ${lastDay}` },
    ];

    ranges.forEach((r, idx) => {
      const weight = defaultWeights[idx] ?? 20;
      const target = monthlyTarget * (weight / 100);
      const mStr = String(monthNumber).padStart(2, '0');
      const startStr = `${year}-${mStr}-${String(r.start).padStart(2, '0')}`;
      const endStr = `${year}-${mStr}-${String(r.end).padStart(2, '0')}`;
      weeks.push({
        weekNumber: idx + 1,
        label: `Semana ${idx + 1} (${r.label})`,
        startDay: r.start,
        endDay: r.end,
        startDate: startStr,
        endDate: endStr,
        dateRangeLabel: r.label,
        weightPercentage: weight,
        revenueTarget: Math.round(target * 100) / 100,
      });
    });
  }

  return weeks;
}

/**
 * Validação dos pesos semanais:
 * A soma deve ser exatamente 100%.
 */
export function validateWeeklyWeights(weeks: { weightPercentage: number }[]): {
  isValid: boolean;
  sum: number;
  message?: string;
} {
  const sum = Math.round(weeks.reduce((acc, w) => acc + (w.weightPercentage || 0), 0) * 100) / 100;
  if (sum < 100) {
    const diff = Math.round((100 - sum) * 100) / 100;
    return {
      isValid: false,
      sum,
      message: `Existem ${diff}% da meta ainda não distribuídos (Soma atual: ${sum}%).`,
    };
  }
  if (sum > 100) {
    const diff = Math.round((sum - 100) * 100) / 100;
    return {
      isValid: false,
      sum,
      message: `Os pesos das semanas ultrapassam 100% em +${diff}% (Soma atual: ${sum}%).`,
    };
  }
  return { isValid: true, sum: 100 };
}

// =========================================================================
// 3. SUGESTÃO AUTOMÁTICA DE PESOS PELO HISTÓRICO
// =========================================================================

/**
 * Analisa as vendas históricas da empresa/unidade e sugere os pesos de cada período comercial.
 */
export function suggestWeeklyWeightsFromHistory(
  companySales: SaleRecord[] = [],
  branchId: string = 'all',
  numberOfWeeks: 4 | 5 = 4
): {
  weights: number[];
  confidence: number;
  explanation: string;
  historicalBreakdown: { weekNumber: number; periodLabel: string; avgPct: number }[];
} {
  const safeCompanySales = Array.isArray(companySales) ? companySales : [];
  // Filtra vendas da unidade
  const sales = branchId === 'all'
    ? safeCompanySales
    : safeCompanySales.filter((s) => s.branchId === branchId);

  if (!sales || sales.length === 0) {
    const fallback = numberOfWeeks === 4 ? [15, 20, 25, 40] : [15, 20, 20, 25, 20];
    return {
      weights: fallback,
      confidence: 50,
      explanation: 'Sem histórico suficiente de vendas semanais. Sugerindo template padrão de mercado.',
      historicalBreakdown: fallback.map((w, idx) => ({
        weekNumber: idx + 1,
        periodLabel: `Semana ${idx + 1}`,
        avgPct: w,
      })),
    };
  }

  // Agrupa vendas por semanas 1..4 (ou 1..5)
  const totalsByWeek: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let grandTotal = 0;

  sales.forEach((s) => {
    // Mapeia o número da semana comercial
    let mappedWeek = ((s.periodNumber - 1) % numberOfWeeks) + 1;
    if (mappedWeek < 1 || mappedWeek > numberOfWeeks) mappedWeek = 1;

    totalsByWeek[mappedWeek] = (totalsByWeek[mappedWeek] || 0) + s.revenue;
    grandTotal += s.revenue;
  });

  if (grandTotal <= 0) {
    const fallback = numberOfWeeks === 4 ? [15, 20, 25, 40] : [15, 20, 20, 25, 20];
    return {
      weights: fallback,
      confidence: 50,
      explanation: 'Histórico com volume financeiro zerado. Aplicado padrão de mercado.',
      historicalBreakdown: fallback.map((w, idx) => ({
        weekNumber: idx + 1,
        periodLabel: `Semana ${idx + 1}`,
        avgPct: w,
      })),
    };
  }

  // Calcula percentuais brutos
  const rawPercentages: number[] = [];
  for (let i = 1; i <= numberOfWeeks; i++) {
    const pct = ((totalsByWeek[i] || 0) / grandTotal) * 100;
    rawPercentages.push(pct);
  }

  // Arredonda para números inteiros ou 1 casa decimal que somem exatamente 100%
  let rounded = rawPercentages.map((p) => Math.round(p));
  let currentSum = rounded.reduce((a, b) => a + b, 0);

  // Ajusta a diferença na última semana
  if (currentSum !== 100) {
    const diff = 100 - currentSum;
    rounded[rounded.length - 1] += diff;
  }

  const periods4 = ['01–07', '08–15', '16–23', '24–fim'];
  const periods5 = ['01–07', '08–14', '15–21', '22–28', '29–fim'];
  const pLabels = numberOfWeeks === 4 ? periods4 : periods5;

  const breakdown = rounded.map((w, idx) => ({
    weekNumber: idx + 1,
    periodLabel: `Dias ${pLabels[idx]}`,
    avgPct: w,
  }));

  const sampleSize = sales.length;
  const confidence = Math.min(95, 60 + sampleSize * 2);

  const explanation = `Análise baseada em ${sampleSize} registros históricos da unidade. O período final (${pLabels[pLabels.length - 1]}) representou historicamente a maior fatia do faturamento (${rounded[rounded.length - 1]}%).`;

  return {
    weights: rounded,
    confidence,
    explanation,
    historicalBreakdown: breakdown,
  };
}

// =========================================================================
// 4. PARTICIPAÇÃO OFICIAL DO VENDEDOR & ANÁLISE HISTÓRICA
// =========================================================================

/**
 * Calcula a participação histórica de uma vendedora com base nos últimos 3, 6 ou 12 meses.
 */
export function calculateSellerHistoricalParticipation(
  sellerId: string,
  branchId: string,
  companySales: SaleRecord[] = [],
  periodMonths: 3 | 6 | 12 = 12
): {
  sharePercentage: number;
  totalRevenue: number;
  salesCount: number;
  averageTicket: number;
  totalBranchRevenue: number;
} {
  const safeCompanySales = Array.isArray(companySales) ? companySales : [];
  // Filtra vendas da unidade do vendedor
  const branchSales = branchId === 'all'
    ? safeCompanySales
    : safeCompanySales.filter((s) => s.branchId === branchId);

  const sellerSales = branchSales.filter((s) => s.sellerId === sellerId);

  const totalSellerRevenue = sellerSales.reduce((acc, s) => acc + s.revenue, 0);
  const totalBranchRevenue = branchSales.reduce((acc, s) => acc + s.revenue, 0);
  const totalSalesCount = sellerSales.reduce((acc, s) => acc + (s.salesCount || 1), 0);

  const averageTicket = totalSalesCount > 0 ? totalSellerRevenue / totalSalesCount : 300;

  let sharePercentage = 0;
  if (totalBranchRevenue > 0) {
    sharePercentage = Math.round((totalSellerRevenue / totalBranchRevenue) * 1000) / 10; // 1 casa decimal
  } else {
    sharePercentage = 25.0; // fallback equilibrado
  }

  return {
    sharePercentage,
    totalRevenue: totalSellerRevenue,
    salesCount: totalSalesCount,
    averageTicket,
    totalBranchRevenue,
  };
}

/**
 * Validação da participação total da equipe em uma unidade (deve somar 100%).
 */
export function validateTeamParticipation(
  sellers: Seller[] = [],
  branchId: string,
  companySales: SaleRecord[] = [],
  totalMonthlyTarget: number = 200000
): TeamParticipationSummary {
  const safeSellers = Array.isArray(sellers) ? sellers.filter((s) => s.active) : [];
  const safeCompanySales = Array.isArray(companySales) ? companySales : [];
  let branchSellers = branchId === 'all'
    ? safeSellers
    : safeSellers.filter((s) => s.branchId === branchId);

  // Fallback seguro: se a filial selecionada não tem vendedoras ou se a equipe da empresa foi dividida por engano
  if (branchSellers.length === 0 && safeSellers.length > 0) {
    branchSellers = safeSellers;
  } else if (branchId !== 'all' && branchSellers.length > 0 && branchSellers.length < safeSellers.length) {
    const branchSum = branchSellers.reduce((acc, s) => acc + (s.officialSharePercentage || 0), 0);
    const companySum = safeSellers.reduce((acc, s) => acc + (s.officialSharePercentage || 0), 0);
    if (branchSum <= 50 && companySum > branchSum) {
      branchSellers = safeSellers;
    }
  }

  const processed = branchSellers.map((seller) => {
    const historical = calculateSellerHistoricalParticipation(
      seller.id,
      seller.branchId,
      safeCompanySales,
      12
    );

    // Se o vendedor não tem participação oficial definida, usa histórica ou divisão igualitária
    const officialShare =
      typeof seller.officialSharePercentage === 'number'
        ? seller.officialSharePercentage
        : (historical.sharePercentage > 0 ? historical.sharePercentage : (100 / Math.max(1, branchSellers.length)));

    const monthlyTarget = totalMonthlyTarget * (officialShare / 100);

    // Vendas realizadas do vendedor
    const sellerSales = safeCompanySales.filter(
      (s) => s.sellerId === seller.id && (branchId === 'all' || s.branchId === branchId)
    );
    const realized = sellerSales.reduce((acc, s) => acc + s.revenue, 0);
    const salesCount = sellerSales.reduce((acc, s) => acc + (s.salesCount || 1), 0);
    const avgTicket = salesCount > 0 ? realized / salesCount : (seller.averageTicket || 300);
    const achievementPercentage = monthlyTarget > 0 ? (realized / monthlyTarget) * 100 : 0;

    return {
      sellerId: seller.id,
      sellerName: seller.name,
      seniorityLevel: seller.seniorityLevel || (seller.role?.includes('Sênior') ? 'senior' : 'pleno'),
      officialSharePercentage: Math.round(officialShare * 10) / 10,
      historicalSharePercentage: seller.historicalSharePercentage ?? historical.sharePercentage,
      shareOriginType: seller.shareOriginType || 'adjusted',
      monthlyTarget: Math.round(monthlyTarget * 100) / 100,
      realizedRevenue: realized,
      achievementPercentage,
      averageTicket: Math.round(avgTicket * 100) / 100,
      salesCount,
    };
  });

  const totalShare = Math.round(processed.reduce((acc, s) => acc + s.officialSharePercentage, 0) * 10) / 10;
  const isValid = Math.abs(totalShare - 100) < 0.05;

  let validationMessage = undefined;
  if (!isValid) {
    if (totalShare < 100) {
      const diff = Math.round((100 - totalShare) * 10) / 10;
      validationMessage = `A soma das participações está em ${totalShare}%. Faltam ${diff} p.p. para completar 100%.`;
    } else {
      const diff = Math.round((totalShare - 100) * 10) / 10;
      validationMessage = `A soma das participações ultrapassa 100% em +${diff} p.p. (Total: ${totalShare}%).`;
    }
  }

  return {
    branchId,
    branchName: branchId === 'all' ? 'Consolidado Todas as Unidades' : (branchSellers[0]?.branchId || 'Unidade'),
    totalMonthlyTarget,
    sellers: processed,
    totalSharePercentage: totalShare,
    isValid,
    validationMessage,
  };
}

/**
 * Redistribui a participação da equipe proporcionalmente quando um vendedor é alterado.
 */
export function redistributeTeamShares(
  sellers: { sellerId: string; officialSharePercentage: number }[],
  changedSellerId: string,
  newShare: number
): { sellerId: string; officialSharePercentage: number }[] {
  const otherSellers = sellers.filter((s) => s.sellerId !== changedSellerId);
  if (otherSellers.length === 0) {
    return [{ sellerId: changedSellerId, officialSharePercentage: 100 }];
  }

  const remainingShare = Math.max(0, 100 - newShare);
  const currentOtherSum = otherSellers.reduce((acc, s) => acc + s.officialSharePercentage, 0);

  const updatedOthers = otherSellers.map((s) => {
    let propShare = 0;
    if (currentOtherSum > 0) {
      propShare = (s.officialSharePercentage / currentOtherSum) * remainingShare;
    } else {
      propShare = remainingShare / otherSellers.length;
    }
    return {
      sellerId: s.sellerId,
      officialSharePercentage: Math.round(propShare * 10) / 10,
    };
  });

  // Ajusta arredondamento no primeiro outro vendedor
  const totalCalculated = newShare + updatedOthers.reduce((acc, s) => acc + s.officialSharePercentage, 0);
  if (Math.abs(totalCalculated - 100) > 0.01 && updatedOthers.length > 0) {
    const diff = Math.round((100 - totalCalculated) * 10) / 10;
    updatedOthers[0].officialSharePercentage = Math.round((updatedOthers[0].officialSharePercentage + diff) * 10) / 10;
  }

  return [
    { sellerId: changedSellerId, officialSharePercentage: newShare },
    ...updatedOthers,
  ];
}

// =========================================================================
// 5. CÁLCULO DETALHADO DA META DA VENDEDORA (MENSAL + SEMANAL)
// =========================================================================

/**
 * Calcula a visão individual da vendedora com base na Meta Mensal Mestre e seus pesos semanais.
 */
export function calculateSellerGoalDetail(
  seller: Seller,
  masterGoal: MonthlyMasterGoal,
  companySales: SaleRecord[] = [],
  allUnitSellers: Seller[] = [],
  availabilities: SellerAvailability[] = [],
  workingDaysSettings: WorkingDaysSettings = DEFAULT_WORKING_DAYS_SETTINGS
): SellerGoalDetail {
  const safeCompanySales = Array.isArray(companySales) ? companySales : [];
  const officialShare = seller.officialSharePercentage ?? 25;
  const historicalShare = seller.historicalSharePercentage ?? officialShare;
  const shareOriginType = seller.shareOriginType ?? 'adjusted';

  // Meta Mensal Individual Base = Meta Mensal da Unidade * (Participação Oficial / 100)
  const baseMonthlyTarget = Math.round((masterGoal.monthlyTarget * (officialShare / 100)) * 100) / 100;

  // Vendas do vendedor no período
  const sellerSales = safeCompanySales.filter((s) => s.sellerId === seller.id);
  const realizedRevenue = sellerSales.reduce((acc, s) => acc + s.revenue, 0);
  const totalSalesCount = sellerSales.reduce((acc, s) => acc + (s.salesCount || 1), 0);

  // Ticket Médio
  const currentMonthAverageTicket = totalSalesCount > 0 ? realizedRevenue / totalSalesCount : (seller.averageTicket || 300);
  const historicalStats = calculateSellerHistoricalParticipation(seller.id, seller.branchId, safeCompanySales, 12);
  const historicalAverageTicket = historicalStats.averageTicket > 0 ? historicalStats.averageTicket : currentMonthAverageTicket;
  const last3MonthsStats = calculateSellerHistoricalParticipation(seller.id, seller.branchId, safeCompanySales, 3);
  const last3MonthsAverageTicket = last3MonthsStats.averageTicket > 0 ? last3MonthsStats.averageTicket : historicalAverageTicket;

  const currentAverageTicket = currentMonthAverageTicket > 0 ? currentMonthAverageTicket : (seller.averageTicket || 300);

  // Breakdown Semanal considerando Férias e Afastamentos
  const masterWeeks = Array.isArray(masterGoal?.weeks) ? masterGoal.weeks : [];
  const weeklyBreakdown = masterWeeks.map((week) => {
    const mStr = String(masterGoal.monthNumber || 9).padStart(2, '0');
    const startDateStr =
      week.startDate ||
      `${masterGoal.year || 2026}-${mStr}-${String(week.startDay || 1).padStart(2, '0')}`;
    const endDateStr =
      week.endDate ||
      `${masterGoal.year || 2026}-${mStr}-${String(week.endDay || 7).padStart(2, '0')}`;

    const avail = getSellerIntervalAvailability(
      seller.id,
      startDateStr,
      endDateStr,
      availabilities,
      workingDaysSettings
    );

    // Meta Semanal Base = Meta Mensal Base * (Peso da Semana / 100)
    const baseWeeklyTarget = Math.round((baseMonthlyTarget * (week.weightPercentage / 100)) * 100) / 100;
    // Meta Semanal Efetiva: multiplicada pela proporção de dias úteis trabalhados
    const weeklyTarget = Math.round(baseWeeklyTarget * avail.factor * 100) / 100;
    const isAbsent = avail.factor === 0 && avail.daysExpected > 0;
    const absenceReason = avail.activeAbsences[0]?.notes || (isAbsent ? 'Férias' : undefined);

    // Vendas da semana (semana comercial correspondente)
    const weekSales = sellerSales.filter((s) => {
      if (s.periodType === 'weekly') {
        const saleMonth = Math.min(12, Math.ceil(s.periodNumber / 4));
        const mappedWeek = ((s.periodNumber - 1) % (masterGoal.numberOfWeeks || 4)) + 1;
        return saleMonth === masterGoal.monthNumber && mappedWeek === week.weekNumber;
      }
      return false;
    });

    const weekRealized = weekSales.reduce((acc, s) => acc + s.revenue, 0);
    const weekSalesCount = weekSales.reduce((acc, s) => acc + (s.salesCount || 1), 0);
    const weekAvgTicket = weekSalesCount > 0 ? weekRealized / weekSalesCount : currentAverageTicket;
    const weekAchievement = weeklyTarget > 0 ? (weekRealized / weeklyTarget) * 100 : 0;
    const weekRemaining = Math.max(0, weeklyTarget - weekRealized);

    const estimatedRequiredSales = currentAverageTicket > 0 ? Math.ceil(weeklyTarget / currentAverageTicket) : 0;
    const remainingRequiredSales = currentAverageTicket > 0 ? Math.ceil(weekRemaining / currentAverageTicket) : 0;

    return {
      weekNumber: week.weekNumber,
      periodLabel: week.label || `Semana ${week.weekNumber}`,
      label: week.label || `Semana ${week.weekNumber}`,
      dateRangeLabel: week.dateRangeLabel || '',
      weightPercentage: week.weightPercentage,
      weeklyTarget,
      targetAmount: weeklyTarget,
      realizedRevenue: weekRealized,
      achievementPercentage: weekAchievement,
      remainingToTarget: weekRemaining,
      salesCount: weekSalesCount,
      averageTicket: Math.round(weekAvgTicket * 100) / 100,
      estimatedRequiredSales,
      remainingRequiredSales,
      daysExpected: avail.daysExpected,
      daysAvailable: avail.daysAvailable,
      availabilityFactor: avail.factor,
      isAbsent,
      absenceReason,
    };
  });

  // Se a vendedora tiver semanas de férias, a meta mensal individual efetiva é a soma das semanas ativas
  const hasAbsencesInMonth = weeklyBreakdown.some((w) => (w.availabilityFactor ?? 1) < 1);
  const monthlyTarget = hasAbsencesInMonth
    ? Math.round(weeklyBreakdown.reduce((acc, w) => acc + w.weeklyTarget, 0) * 100) / 100
    : baseMonthlyTarget;

  const achievementPercentage = monthlyTarget > 0 ? (realizedRevenue / monthlyTarget) * 100 : 0;
  const remainingToTarget = Math.max(0, monthlyTarget - realizedRevenue);
  const requiredSalesTotal = currentAverageTicket > 0 ? Math.ceil(remainingToTarget / currentAverageTicket) : 0;

  // Participação Real no Mês vs Planejada
  const totalUnitRealized = safeCompanySales
    .filter((s) => (masterGoal.branchId === 'all' || s.branchId === masterGoal.branchId))
    .reduce((acc, s) => acc + s.revenue, 0);

  const realShare = totalUnitRealized > 0
    ? Math.round((realizedRevenue / totalUnitRealized) * 1000) / 10
    : 0;

  const shareDiffPoints = Math.round((realShare - officialShare) * 10) / 10;

  // Ticket da semana atual (última com vendas ou primeira)
  const currentWeekObj = weeklyBreakdown.find((w) => w.salesCount > 0) || weeklyBreakdown[0];
  const currentWeekAverageTicket = currentWeekObj ? currentWeekObj.averageTicket : currentAverageTicket;

  // Projeção simples com base no ritmo atual
  const weeksWithSales = weeklyBreakdown.filter((w) => w.salesCount > 0).length;
  const projectedRevenue = weeksWithSales > 0
    ? Math.round((realizedRevenue / weeksWithSales) * (masterGoal.numberOfWeeks || 4))
    : monthlyTarget;

  // Estimativa de comissão (ex: 2.5% a 4% com base no atingimento)
  const commRate = achievementPercentage >= 120 ? 0.045 : achievementPercentage >= 100 ? 0.035 : achievementPercentage >= 80 ? 0.025 : 0.015;
  const estimatedCommissionAmount = Math.round(realizedRevenue * commRate);

  return {
    sellerId: seller.id,
    sellerName: seller.name,
    branchId: seller.branchId,
    branchName: masterGoal.branchName || 'Unidade',
    year: masterGoal.year || 2026,
    monthNumber: masterGoal.monthNumber || 9,
    monthName: masterGoal.monthName || 'Setembro',
    unitMonthlyTarget: masterGoal.monthlyTarget || 200000,
    seniorityLevel: seller.seniorityLevel,
    officialSharePercentage: officialShare,
    historicalSharePercentage: historicalShare,
    shareOriginType,
    monthlyTarget,
    realizedRevenue,
    projectedRevenue,
    estimatedCommissionAmount,
    commissionRuleType: masterGoal.commissionRuleType || 'monthly',
    achievementPercentage,
    remainingToTarget,
    averageTicket: Math.round(currentAverageTicket * 100) / 100,
    historicalAverageTicket: Math.round(historicalAverageTicket * 100) / 100,
    last3MonthsAverageTicket: Math.round(last3MonthsAverageTicket * 100) / 100,
    currentMonthAverageTicket: Math.round(currentMonthAverageTicket * 100) / 100,
    currentWeekAverageTicket: Math.round(currentWeekAverageTicket * 100) / 100,
    requiredSalesTotal,
    requiredSalesCount: requiredSalesTotal,
    totalSalesCount,
    salesCount: totalSalesCount,
    customersCount: totalSalesCount > 0 ? Math.round(totalSalesCount * 0.95) : undefined,
    ticketPerCustomer: currentAverageTicket,
    plannedShare: officialShare,
    realShare,
    shareDiffPoints,
    weeklyBreakdown,
    weeklyGoals: weeklyBreakdown,
  };
}

/**
 * Replica uma distribuição de porcentagens de vendedoras para uma lista de meses selecionados,
 * recalculando as metas semanais de cada mês proporcionalmente à meta mensal daquele mês.
 */
export function replicateSharesToOtherMonths(
  companyId: string,
  branchId: string,
  year: number,
  targetMonthNumbers: number[],
  sellerShares: Record<string, number>,
  existingMasterGoals: Record<string, MonthlyMasterGoal>,
  options: {
    replicateTargetToo?: boolean;
    monthlyTargetToReplicate?: number;
    userName?: string;
  } = {}
): Record<string, MonthlyMasterGoal> {
  const updatedGoals = { ...existingMasterGoals };
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  targetMonthNumbers.forEach((monthNum) => {
    const key = `${companyId}-${branchId}-${year}-${monthNum}`;
    const existing = updatedGoals[key];
    const target = (options.replicateTargetToo && options.monthlyTargetToReplicate)
      ? options.monthlyTargetToReplicate
      : (existing?.monthlyTarget || 200000);

    const numberOfWeeks = existing?.numberOfWeeks || 4;
    const defaultWeights = numberOfWeeks === 5 ? [15, 20, 20, 25, 20] : [15, 20, 25, 40];
    const currentWeeks = existing?.weeks && existing.weeks.length > 0
      ? existing.weeks
      : buildCommercialWeeks(year, monthNum, numberOfWeeks, defaultWeights, target);

    const weeks = currentWeeks.map((w) => ({
      ...w,
      revenueTarget: Math.round(target * (w.weightPercentage / 100)),
      targetAmount: Math.round(target * (w.weightPercentage / 100)),
    }));

    const newLog: GoalChangeLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      userName: options.userName || 'Consultor',
      action: 'update_shares',
      description: `Replicação de padrão de participação da equipe (${Object.keys(sellerShares).length} vendedoras) para ${monthNames[monthNum - 1]}/${year}.`,
    };

    updatedGoals[key] = {
      id: existing?.id || `goal-${companyId}-${branchId}-${year}-${monthNum}`,
      companyId,
      branchId,
      branchName: existing?.branchName || (branchId === 'all' ? 'Toda a Empresa (Consolidado)' : 'Unidade Principal'),
      year,
      monthNumber: monthNum,
      monthName: monthNames[monthNum - 1],
      monthlyTarget: target,
      numberOfWeeks,
      weeks,
      totalWeight: weeks.reduce((acc, w) => acc + w.weightPercentage, 0),
      isValid: true,
      templateUsed: existing?.templateUsed,
      commissionRuleType: existing?.commissionRuleType || 'monthly',
      status: existing?.status || 'draft',
      levels: existing?.levels,
      levelGrowthPercentages: existing?.levelGrowthPercentages,
      sellerShares: { ...sellerShares },
      changeLogs: existing?.changeLogs ? [newLog, ...existing.changeLogs] : [newLog],
      updatedAt: new Date().toISOString(),
    };
  });

  return updatedGoals;
}

// =========================================================================
// 6. MOTOR DE SIMULAÇÃO DE CENÁRIOS (EMPRESA + EQUIPE + TICKET MÉDIO)
// =========================================================================

export interface SimulateGoalParams {
  originalMasterGoal: MonthlyMasterGoal;
  targetGrowthPercentage?: number; // e.g. +10%
  simulatedMonthlyTarget?: number; // valor manual
  sellers: Seller[];
  customSellerShares?: Record<string, number>; // sellerId -> new share %
  customSellerTickets?: Record<string, number>; // sellerId -> new ticket R$
  financialSettings: FinancialSettings;
  redistributionMode?: 'proportional_others' | 'specific_sellers' | 'increase_total_target' | 'keep_over_100';
  selectedSpecificSellerIds?: string[];
}

/**
 * Simula alterações de metas da empresa, participações de equipe e tickets médios com efeito cascata.
 * NUNCA altera os dados oficiais do sistema.
 */
export function simulateGoalScenario(params: SimulateGoalParams): GoalSimulationScenario {
  const {
    originalMasterGoal,
    targetGrowthPercentage,
    simulatedMonthlyTarget: manualTarget,
    sellers,
    customSellerShares = {},
    customSellerTickets = {},
    financialSettings,
    redistributionMode = 'proportional_others',
  } = params;

  // 1. Meta simulada da empresa/unidade
  let simulatedTarget = originalMasterGoal.monthlyTarget;
  let growthPct = 0;

  if (typeof manualTarget === 'number' && manualTarget > 0) {
    simulatedTarget = manualTarget;
    growthPct = originalMasterGoal.monthlyTarget > 0
      ? ((simulatedTarget - originalMasterGoal.monthlyTarget) / originalMasterGoal.monthlyTarget) * 100
      : 0;
  } else if (typeof targetGrowthPercentage === 'number') {
    growthPct = targetGrowthPercentage;
    simulatedTarget = originalMasterGoal.monthlyTarget * (1 + growthPct / 100);
  }

  // 2. Semanas simuladas com os mesmos pesos
  const origWeeks = Array.isArray(originalMasterGoal?.weeks) ? originalMasterGoal.weeks : [];
  const simulatedWeeks = origWeeks.map((w) => ({
    ...w,
    revenueTarget: Math.round((simulatedTarget * (w.weightPercentage / 100)) * 100) / 100,
  }));

  // 3. Vendedores da unidade
  const safeSellers = Array.isArray(sellers) ? sellers : [];
  const unitSellers = (originalMasterGoal?.branchId === 'all' || !originalMasterGoal?.branchId)
    ? safeSellers
    : safeSellers.filter((s) => s.branchId === originalMasterGoal.branchId && s.active);

  const simulatedSellers = unitSellers.map((seller) => {
    const origShare = seller.officialSharePercentage ?? 25;
    const simShare = typeof customSellerShares[seller.id] === 'number'
      ? customSellerShares[seller.id]
      : origShare;

    const origMonthlyTarget = originalMasterGoal.monthlyTarget * (origShare / 100);
    const simMonthlyTarget = simulatedTarget * (simShare / 100);
    const targetDiff = simMonthlyTarget - origMonthlyTarget;
    const growthReqPct = origMonthlyTarget > 0 ? (targetDiff / origMonthlyTarget) * 100 : 0;

    const origTicket = seller.averageTicket || 300;
    const simTicket = customSellerTickets[seller.id] || origTicket;

    const origReqSales = origTicket > 0 ? Math.ceil(origMonthlyTarget / origTicket) : 0;
    const simReqSales = simTicket > 0 ? Math.ceil(simMonthlyTarget / simTicket) : 0;
    const salesDiff = simReqSales - origReqSales;

    return {
      sellerId: seller.id,
      sellerName: seller.name,
      originalShare: origShare,
      simulatedShare: simShare,
      originalMonthlyTarget: Math.round(origMonthlyTarget * 100) / 100,
      simulatedMonthlyTarget: Math.round(simMonthlyTarget * 100) / 100,
      targetDiffAmount: Math.round(targetDiff * 100) / 100,
      growthRequiredPct: Math.round(growthReqPct * 10) / 10,
      originalTicket: origTicket,
      simulatedTicket: simTicket,
      originalRequiredSales: origReqSales,
      simulatedRequiredSales: simReqSales,
      salesDiff,
    };
  });

  // 4. Impacto Financeiro Cascata (CMV, Impostos, Taxas, Comissão, Margem e Margem Incremental)
  const baseRevenue = originalMasterGoal.monthlyTarget;
  const simRevenue = simulatedTarget;
  const revenueDiff = simRevenue - baseRevenue;

  const cmvPct = financialSettings.cmvPercentage / 100;
  const taxPct = financialSettings.taxPercentage / 100;
  const cardFeePct = financialSettings.cardFeePercentage / 100;
  const commissionPct = 0.025; // Taxa de comissão média projetada de 2.5%

  const baseCmv = baseRevenue * cmvPct;
  const baseTax = baseRevenue * taxPct;
  const baseCard = baseRevenue * cardFeePct;
  const baseComm = baseRevenue * commissionPct;
  const baseCosts = baseCmv + baseTax + baseCard + baseComm;
  const baseMargin = baseRevenue - baseCosts;

  const simCmv = simRevenue * cmvPct;
  const simTax = simRevenue * taxPct;
  const simCard = simRevenue * cardFeePct;
  const simComm = simRevenue * commissionPct;
  const simCosts = simCmv + simTax + simCard + simComm;
  const simMargin = simRevenue - simCosts;
  const simMarginPct = simRevenue > 0 ? (simMargin / simRevenue) * 100 : 0;

  const incrementalRevenue = revenueDiff;
  const incrementalCosts = simCosts - baseCosts;
  const incrementalMargin = simMargin - baseMargin;
  const incrementalMarginPct = incrementalRevenue > 0 ? (incrementalMargin / incrementalRevenue) * 100 : 0;

  return {
    id: `sim-${Date.now()}`,
    name: `Simulação ${growthPct >= 0 ? '+' : ''}${Math.round(growthPct)}% (${formatCurrency(simulatedTarget)})`,
    companyId: originalMasterGoal.companyId,
    branchId: originalMasterGoal.branchId,
    year: originalMasterGoal.year,
    monthNumber: originalMasterGoal.monthNumber,
    originalMonthlyTarget: baseRevenue,
    simulatedMonthlyTarget: simRevenue,
    targetGrowthPct: Math.round(growthPct * 10) / 10,
    simulatedWeeks,
    simulatedSellers,
    redistributionMode,
    financialImpact: {
      revenue: simRevenue,
      revenueDiff,
      cmvAmount: simCmv,
      taxAmount: simTax,
      cardFeeAmount: simCard,
      commissionAmount: simComm,
      totalCosts: simCosts,
      marginAmount: simMargin,
      marginPct: Math.round(simMarginPct * 10) / 10,
      incrementalMarginAmount: incrementalMargin,
      incrementalMarginPct: Math.round(incrementalMarginPct * 10) / 10,
    },
    createdAt: new Date().toISOString(),
  };
}
