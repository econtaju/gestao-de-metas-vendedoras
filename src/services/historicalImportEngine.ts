import {
  NormalizedHistoricalRecord,
  HistoricalMonthCoverage,
  HistoricalBatchStats,
  HistoricalDiagnosticSummary,
  HistoricalDataQualityLevel,
  HistoricalFileType,
  HistoricalFileItem,
  DataOriginType,
  Company,
  Branch,
  Seller,
  PaymentBreakdown,
  MonthlyHistoricalRecord,
  SaleRecord,
} from '../types';
import { MONTH_NAMES } from './intelligenceEngine';
import { parseBrazilianCurrency, normalizeText } from './smartImportEngine';

export { MONTH_NAMES };

// ==========================================
// 1. HELPERS DE PERÍODO E DATA
// ==========================================

export function formatBRL(val: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

export function formatPct(val: number): string {
  return `${(val || 0).toFixed(1)}%`;
}

export const formatCurrencyBRL = formatBRL;
export const formatPercentBRL = formatPct;

/**
 * Retorna o range padrão dos últimos 12 meses finalizados
 */
export function getDefault12MonthsRange(monthsCount: number = 12): { startDate: string; endDate: string; label: string } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Fim: último dia do mês anterior ao atual
  const endMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const endYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const lastDay = new Date(endYear, endMonth + 1, 0).getDate();

  // Início: 12 meses atrás, dia 1
  let startMonth = endMonth + 1;
  let startYear = endYear - 1;
  if (startMonth > 11) {
    startMonth = 0;
    startYear = endYear;
  }

  const startDate = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-01`;
  const endDate = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const label = `${MONTH_NAMES[startMonth]}/${startYear} a ${MONTH_NAMES[endMonth]}/${endYear}`;

  return { startDate, endDate, label };
}

export const generate12MonthDateRange = getDefault12MonthsRange;

/**
 * Gera lista de 12 meses cronológicos no intervalo
 */
export function generateMonthListInRange(
  startDate: string,
  endDate: string
): { year: number; monthNumber: number; monthName: string; key: string }[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months: { year: number; monthNumber: number; monthName: string; key: string }[] = [];

  let cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const endLimit = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cur <= endLimit && months.length < 36) {
    const y = cur.getFullYear();
    const m = cur.getMonth() + 1;
    months.push({
      year: y,
      monthNumber: m,
      monthName: MONTH_NAMES[m - 1],
      key: `${y}-${String(m).padStart(2, '0')}`,
    });
    cur.setMonth(cur.getMonth() + 1);
  }

  return months;
}

/**
 * Detecta se um período semanal cruza dois meses (ex: 29/01 a 04/02)
 */
export function checkCrossMonthPeriod(
  startDateStr: string,
  endDateStr: string
): {
  isCross: boolean;
  month1?: { year: number; month: number; days: number; pct: number };
  month2?: { year: number; month: number; days: number; pct: number };
} {
  try {
    const d1 = new Date(startDateStr);
    const d2 = new Date(endDateStr);

    if (d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear()) {
      return { isCross: false };
    }

    // Calcula dias em cada mês
    const lastDayMonth1 = new Date(d1.getFullYear(), d1.getMonth() + 1, 0).getDate();
    const daysInMonth1 = lastDayMonth1 - d1.getDate() + 1;
    const daysInMonth2 = d2.getDate();
    const totalDays = daysInMonth1 + daysInMonth2;

    const pct1 = totalDays > 0 ? (daysInMonth1 / totalDays) * 100 : 50;
    const pct2 = totalDays > 0 ? (daysInMonth2 / totalDays) * 100 : 50;

    return {
      isCross: true,
      month1: {
        year: d1.getFullYear(),
        month: d1.getMonth() + 1,
        days: daysInMonth1,
        pct: pct1,
      },
      month2: {
        year: d2.getFullYear(),
        month: d2.getMonth() + 1,
        days: daysInMonth2,
        pct: pct2,
      },
    };
  } catch {
    return { isCross: false };
  }
}

// ==========================================
// 2. CLASSIFICAÇÃO SEMÂNTICA DE ARQUIVOS
// ==========================================

export function classifyFileType(
  fileName: string,
  fileContentText?: string
): HistoricalFileType {
  const normName = normalizeText(fileName);
  const normText = normalizeText(fileContentText || '');

  const isCost =
    normName.includes('CUSTO') ||
    normName.includes('DESPESA') ||
    normName.includes('GASTO') ||
    normText.includes('CUSTO FIXO') ||
    normText.includes('DESPESAS OPERACIONAIS');

  const isCMV =
    normName.includes('CMV') ||
    normName.includes('MERCADORIA') ||
    normText.includes('CMV') ||
    normText.includes('CUSTO DA MERCADORIA');

  const isFinancial =
    normName.includes('FINANCEIRO') ||
    normName.includes('DRE') ||
    normName.includes('IMPOSTO') ||
    normName.includes('TAXA') ||
    normText.includes('IMPOSTOS') ||
    normText.includes('TAXAS DE CARTAO') ||
    normText.includes('MARGEM');

  const isSeller =
    normName.includes('VENDEDOR') ||
    normName.includes('EQUIPE') ||
    normName.includes('CONSULTOR') ||
    normText.includes('VENDEDOR') ||
    normText.includes('CONSULTORA') ||
    normText.includes('COMISSAO');

  const isSales =
    normName.includes('VENDA') ||
    normName.includes('FATURAMENTO') ||
    normName.includes('RECEITA') ||
    normName.includes('RELATORIO') ||
    normText.includes('SUBTOTAL') ||
    normText.includes('FATURADO') ||
    normText.includes('VALOR TOTAL');

  if (isCMV) return 'cmv';
  if (isCost || (isFinancial && !isSales)) return 'financial_costs';
  if (isSales && isFinancial) return 'mixed';
  if (isSeller) return 'sellers';
  if (isSales) return 'sales';

  return 'unknown';
}

// ==========================================
// 3. DETECÇÃO DE DUPLICIDADE E HASH
// ==========================================

export function generateRecordFingerprint(
  companyId: string,
  branchId: string,
  year: number,
  month: number,
  sellerName?: string,
  revenue?: number
): string {
  const sName = normalizeText(sellerName || 'GERAL');
  const revRounded = Math.round((revenue || 0) * 100);
  return `${companyId}|${branchId}|${year}|${month}|${sName}|${revRounded}`;
}

// ==========================================
// 4. CONSOLIDAÇÃO E MERGE DE STAGING
// ==========================================

/**
 * Consolida registros vindos de múltiplos arquivos para o mesmo período e unidade.
 * Combina vendas comerciais com dados financeiros (CMV, taxas, impostos).
 */
export function mergeStagingRecords(
  existingRecords: NormalizedHistoricalRecord[],
  newRecords: NormalizedHistoricalRecord[]
): NormalizedHistoricalRecord[] {
  const mergedMap = new Map<string, NormalizedHistoricalRecord>();

  // Processa registros existentes
  for (const rec of existingRecords) {
    const key = rec.id || generateRecordFingerprint(rec.companyId, rec.branchId, rec.year, rec.month, rec.sellerName);
    mergedMap.set(key, { ...rec });
  }

  // Mescla novos registros
  for (const nRec of newRecords) {
    const key = nRec.id || generateRecordFingerprint(nRec.companyId, nRec.branchId, nRec.year, nRec.month, nRec.sellerName);
    const existing = mergedMap.get(key);

    if (!existing) {
      mergedMap.set(key, { ...nRec });
    } else {
      // Mescla inteligente:
      // Se nRec tiver receita e existing não tiver, usa de nRec
      const revenue = nRec.revenue > 0 ? nRec.revenue : existing.revenue;
      const salesCount = (nRec.salesCount || 0) > 0 ? nRec.salesCount : existing.salesCount;
      const ticketMedio = salesCount > 0 ? revenue / salesCount : existing.ticketMedio;

      const cmvValor = nRec.cmvValor > 0 ? nRec.cmvValor : existing.cmvValor;
      const cmvPercentual = cmvValor > 0 && revenue > 0 ? (cmvValor / revenue) * 100 : (nRec.cmvPercentual || existing.cmvPercentual);

      const impostos = nRec.impostos > 0 ? nRec.impostos : existing.impostos;
      const taxasCartao = nRec.taxasCartao > 0 ? nRec.taxasCartao : existing.taxasCartao;
      const comissoes = nRec.comissoes > 0 ? nRec.comissoes : existing.comissoes;
      const outrosCustosVariaveis = nRec.outrosCustosVariaveis > 0 ? nRec.outrosCustosVariaveis : existing.outrosCustosVariaveis;

      const totalCustos = cmvValor + impostos + taxasCartao + comissoes + outrosCustosVariaveis;
      const margemContribuicao = revenue - totalCustos;
      const margemContribuicaoPercentual = revenue > 0 ? (margemContribuicao / revenue) * 100 : 0;

      // Verifica discrepâncias de faturamento
      let hasDiscrepancy = existing.hasDiscrepancy || false;
      let discrepancyNotes = existing.discrepancyNotes || '';
      if (existing.revenue > 0 && nRec.revenue > 0 && Math.abs(existing.revenue - nRec.revenue) > 5) {
        hasDiscrepancy = true;
        discrepancyNotes = `Divergência de faturamento entre arquivos: ${formatBRL(existing.revenue)} (${existing.arquivoOrigem}) vs ${formatBRL(nRec.revenue)} (${nRec.arquivoOrigem}). Diferença de ${formatBRL(Math.abs(existing.revenue - nRec.revenue))}.`;
      }

      mergedMap.set(key, {
        ...existing,
        revenue,
        salesCount,
        ticketMedio,
        cmvValor,
        cmvPercentual,
        impostos,
        taxasCartao,
        comissoes,
        outrosCustosVariaveis,
        margemContribuicao,
        margemContribuicaoPercentual,
        origemCustos: nRec.cmvValor > 0 || nRec.impostos > 0 ? nRec.origemCustos : existing.origemCustos,
        arquivoOrigem: `${existing.arquivoOrigem} + ${nRec.arquivoOrigem}`,
        confiancaExtracao: Math.round((existing.confiancaExtracao + nRec.confiancaExtracao) / 2),
        hasDiscrepancy,
        discrepancyNotes,
      });
    }
  }

  return Array.from(mergedMap.values());
}

// ==========================================
// 5. CÁLCULO DE COBERTURA DOS 12 MESES
// ==========================================

export function calculate12MonthsCoverage(
  records: NormalizedHistoricalRecord[],
  startDate: string,
  endDate: string,
  defaultFinancialSettings?: { cmvPercentage: number; taxPercentage: number; cardFeePercentage: number }
): HistoricalMonthCoverage[] {
  const monthList = generateMonthListInRange(startDate, endDate);

  return monthList.map((m) => {
    const monthRecords = records.filter((r) => r.year === m.year && r.month === m.monthNumber);

    const totalRevenue = monthRecords.reduce((acc, r) => acc + (r.revenue || 0), 0);
    const totalCmv = monthRecords.reduce((acc, r) => acc + (r.cmvValor || 0), 0);
    const totalTaxes = monthRecords.reduce((acc, r) => acc + (r.impostos || 0), 0);
    const totalCardFees = monthRecords.reduce((acc, r) => acc + (r.taxasCartao || 0), 0);
    const totalSalesCount = monthRecords.reduce((acc, r) => acc + (r.salesCount || 0), 0);

    const uniqueSellers = new Set(monthRecords.filter((r) => !!r.sellerName).map((r) => r.sellerName));
    const uniqueFiles = new Set(monthRecords.map((r) => r.arquivoOrigem));

    const hasDiscrepancy = monthRecords.some((r) => r.hasDiscrepancy);
    const missingFields: string[] = [];
    const issues: string[] = [];

    // Avalia Faturamento
    let revenueStatus: 'complete' | 'partial' | 'missing' | 'discrepancy' = 'missing';
    if (hasDiscrepancy) {
      revenueStatus = 'discrepancy';
      issues.push('Divergência de faturamento entre arquivos comerciais e contábeis.');
    } else if (totalRevenue > 0) {
      revenueStatus = 'complete';
    } else {
      missingFields.push('Faturamento');
    }

    // Avalia Vendedores
    let sellersStatus: 'complete' | 'partial' | 'missing' = 'missing';
    if (uniqueSellers.size > 0) {
      sellersStatus = 'complete';
    } else if (totalRevenue > 0) {
      sellersStatus = 'partial';
      missingFields.push('Vendedores');
    }

    // Avalia CMV
    let cmvStatus: 'complete' | 'estimated' | 'missing' = 'missing';
    const hasRealCmv = monthRecords.some((r) => r.cmvValor > 0 && r.origemCustos !== 'estimated');
    const hasEstimatedCmv = monthRecords.some((r) => r.origemCustos === 'estimated');
    if (hasRealCmv) {
      cmvStatus = 'complete';
    } else if (hasEstimatedCmv) {
      cmvStatus = 'estimated';
    } else {
      missingFields.push('CMV');
    }

    // Avalia Impostos
    let taxesStatus: 'complete' | 'estimated' | 'missing' = 'missing';
    const hasRealTaxes = monthRecords.some((r) => r.impostos > 0 && r.origemCustos !== 'estimated');
    if (hasRealTaxes) {
      taxesStatus = 'complete';
    } else if (hasEstimatedCmv) {
      taxesStatus = 'estimated';
    } else {
      missingFields.push('Impostos');
    }

    // Avalia Taxas
    let cardFeesStatus: 'complete' | 'estimated' | 'missing' = 'missing';
    const hasRealFees = monthRecords.some((r) => r.taxasCartao > 0 && r.origemCustos !== 'estimated');
    if (hasRealFees) {
      cardFeesStatus = 'complete';
    } else if (hasEstimatedCmv) {
      cardFeesStatus = 'estimated';
    } else {
      missingFields.push('Taxas de Cartão');
    }

    // Status Geral do Mês
    let overallStatus: 'complete' | 'partial' | 'error' | 'missing' = 'missing';
    if (hasDiscrepancy) {
      overallStatus = 'error';
    } else if (totalRevenue > 0 && cmvStatus !== 'missing' && sellersStatus === 'complete') {
      overallStatus = 'complete';
    } else if (totalRevenue > 0) {
      overallStatus = 'partial';
    } else {
      overallStatus = 'missing';
    }

    return {
      year: m.year,
      monthNumber: m.monthNumber,
      monthName: m.monthName,
      revenueStatus,
      sellersStatus,
      cmvStatus,
      taxesStatus,
      cardFeesStatus,
      overallStatus,
      totalRevenue,
      totalCmv,
      totalTaxes,
      totalCardFees,
      totalSalesCount,
      activeSellersCount: uniqueSellers.size,
      filesCount: uniqueFiles.size,
      missingFields,
      issues,
    };
  });
}

export const calculateHistoricalCoverage = calculate12MonthsCoverage;

// ==========================================
// 6. NÍVEL DE QUALIDADE DO HISTÓRICO (1 a 4)
// ==========================================

export function calculateHistoricalQualityLevel(records: NormalizedHistoricalRecord[]): {
  level: HistoricalDataQualityLevel;
  title: string;
  description: string;
  nextSteps: string;
  scorePercentage: number;
} {
  if (!records || records.length === 0) {
    return {
      level: 1,
      title: 'Nível 1 — Básico',
      description: 'Nenhum dado importado ainda.',
      nextSteps: 'Faça o upload dos relatórios para iniciar a análise.',
      scorePercentage: 0,
    };
  }

  const hasRevenue = records.some((r) => r.revenue > 0);
  const hasSellers = records.some((r) => !!r.sellerName && r.sellerName !== 'Geral');
  const hasSalesCount = records.some((r) => (r.salesCount || 0) > 0);
  const hasBranches = new Set(records.map((r) => r.branchName)).size > 1;
  const hasTicketMedio = records.some((r) => (r.ticketMedio || 0) > 0);
  const hasCmv = records.some((r) => r.cmvValor > 0 || r.cmvPercentual > 0);
  const hasTaxes = records.some((r) => r.impostos > 0);
  const hasCardFees = records.some((r) => r.taxasCartao > 0);

  // Nível 4: Financeiro Completo
  if (hasRevenue && hasSellers && hasCmv && (hasTaxes || hasCardFees)) {
    return {
      level: 4,
      title: 'Nível 4 — Financeiro & FP&A Completo',
      description: 'Base completa com faturamento, equipe comercial, CMV real, impostos, taxas e margem de contribuição.',
      nextSteps: 'Excelente! A base histórica está 100% pronta para metas de alta precisão e rentabilidade.',
      scorePercentage: 100,
    };
  }

  // Nível 3: Gerencial
  if (hasRevenue && hasSellers && (hasBranches || hasTicketMedio || hasSalesCount)) {
    return {
      level: 3,
      title: 'Nível 3 — Gerencial & Unidades',
      description: 'Base com faturamento por vendedor, unidade, volume de vendas e ticket médio calculados.',
      nextSteps: 'Para atingir o Nível 4 (Financeiro), adicione arquivos de CMV, impostos ou taxas de cartão.',
      scorePercentage: 75,
    };
  }

  // Nível 2: Comercial
  if (hasRevenue && (hasSellers || hasSalesCount)) {
    return {
      level: 2,
      title: 'Nível 2 — Comercial',
      description: 'Base com faturamento por vendedor e volume de vendas.',
      nextSteps: 'Para atingir o Nível 3 (Gerencial), detalhe as vendas por filiais e ticket médio.',
      scorePercentage: 50,
    };
  }

  // Nível 1: Básico
  return {
    level: 1,
    title: 'Nível 1 — Básico',
    description: 'Possui faturamento e período global.',
    nextSteps: 'Para atingir o Nível 2 (Comercial), envie relatórios detalhados com nomes de vendedores.',
    scorePercentage: 25,
  };
}

// ==========================================
// 7. FICHA DE DIAGNÓSTICO COMERCIAL INICIAL
// ==========================================

export function generateHistoricalDiagnostics(
  records: NormalizedHistoricalRecord[],
  coverage: HistoricalMonthCoverage[],
  startDate: string,
  endDate: string
): HistoricalDiagnosticSummary {
  const totalRevenue = records.reduce((acc, r) => acc + (r.revenue || 0), 0);
  const totalSalesCount = records.reduce((acc, r) => acc + (r.salesCount || 0), 0);
  const ticketMedioGeral = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

  // Meses com faturamento
  const activeMonths = coverage.filter((m) => m.totalRevenue > 0);
  const coverageMonthsCount = activeMonths.length;
  const totalMonths = coverage.length || 12;
  const monthlyMean = coverageMonthsCount > 0 ? totalRevenue / coverageMonthsCount : 0;
  const weeklyMean = monthlyMean / 4.33;

  // Melhor e Pior mês
  let bestMonth = { monthName: '—', year: 0, revenue: 0, marginPct: 0 };
  let worstMonth = { monthName: '—', year: 0, revenue: Infinity, marginPct: 0 };

  if (activeMonths.length > 0) {
    const sorted = [...activeMonths].sort((a, b) => b.totalRevenue - a.totalRevenue);
    const b = sorted[0];
    const w = sorted[sorted.length - 1];

    const bMargin = b.totalRevenue > 0 ? ((b.totalRevenue - b.totalCmv - b.totalTaxes - b.totalCardFees) / b.totalRevenue) * 100 : 0;
    const wMargin = w.totalRevenue > 0 ? ((w.totalRevenue - w.totalCmv - w.totalTaxes - w.totalCardFees) / w.totalRevenue) * 100 : 0;

    bestMonth = { monthName: b.monthName, year: b.year, revenue: b.totalRevenue, marginPct: bMargin };
    worstMonth = { monthName: w.monthName, year: w.year, revenue: w.totalRevenue, marginPct: wMargin };
  } else {
    worstMonth = { monthName: '—', year: 0, revenue: 0, marginPct: 0 };
  }

  // Melhor Vendedor
  const sellerMap: Record<string, { totalRevenue: number; salesCount: number }> = {};
  for (const r of records) {
    const name = r.sellerName || 'Geral';
    if (!sellerMap[name]) {
      sellerMap[name] = { totalRevenue: 0, salesCount: 0 };
    }
    sellerMap[name].totalRevenue += r.revenue || 0;
    sellerMap[name].salesCount += r.salesCount || 0;
  }

  let bestSeller = { sellerName: '—', totalRevenue: 0, salesCount: 0, ticketMedio: 0, sharePct: 0 };
  const sellerEntries = Object.entries(sellerMap).filter(([name]) => name !== 'Geral');
  if (sellerEntries.length > 0) {
    sellerEntries.sort((a, b) => b[1].totalRevenue - a[1].totalRevenue);
    const top = sellerEntries[0];
    const topRevenue = top[1].totalRevenue;
    const topCount = top[1].salesCount;
    bestSeller = {
      sellerName: top[0],
      totalRevenue: topRevenue,
      salesCount: topCount,
      ticketMedio: topCount > 0 ? topRevenue / topCount : 0,
      sharePct: totalRevenue > 0 ? (topRevenue / totalRevenue) * 100 : 0,
    };
  }

  // Melhor Unidade / Filial
  const branchMap: Record<string, number> = {};
  for (const r of records) {
    const bName = r.branchName || 'Matriz';
    branchMap[bName] = (branchMap[bName] || 0) + (r.revenue || 0);
  }

  let bestBranch = { branchName: '—', totalRevenue: 0, sharePct: 0 };
  const branchEntries = Object.entries(branchMap);
  if (branchEntries.length > 0) {
    branchEntries.sort((a, b) => b[1] - a[1]);
    const topB = branchEntries[0];
    bestBranch = {
      branchName: topB[0],
      totalRevenue: topB[1],
      sharePct: totalRevenue > 0 ? (topB[1] / totalRevenue) * 100 : 0,
    };
  }

  // Médias de custos e margem
  const totalCmv = records.reduce((acc, r) => acc + (r.cmvValor || 0), 0);
  const totalTaxes = records.reduce((acc, r) => acc + (r.impostos || 0), 0);
  const totalCardFees = records.reduce((acc, r) => acc + (r.taxasCartao || 0), 0);
  const totalMargin = records.reduce((acc, r) => acc + (r.margemContribuicao || 0), 0);

  const avgCmvPct = totalRevenue > 0 ? (totalCmv / totalRevenue) * 100 : 0;
  const avgMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  // Tendência dos últimos 3 meses
  let growthLast3MonthsPct = 0;
  if (activeMonths.length >= 6) {
    const recent3 = activeMonths.slice(-3).reduce((acc, m) => acc + m.totalRevenue, 0);
    const prev3 = activeMonths.slice(-6, -3).reduce((acc, m) => acc + m.totalRevenue, 0);
    if (prev3 > 0) {
      growthLast3MonthsPct = ((recent3 - prev3) / prev3) * 100;
    }
  }

  // Qualidade dos dados
  const qualityInfo = calculateHistoricalQualityLevel(records);

  // Confiança da extração
  const avgConfidence =
    records.length > 0
      ? records.reduce((acc, r) => acc + (r.confiancaExtracao || 90), 0) / records.length
      : 95;

  return {
    periodLabel: `${MONTH_NAMES[new Date(startDate).getMonth()]}/${new Date(startDate).getFullYear()} a ${MONTH_NAMES[new Date(endDate).getMonth()]}/${new Date(endDate).getFullYear()}`,
    totalRevenue,
    monthlyMean,
    weeklyMean,
    bestMonth,
    worstMonth,
    bestSeller,
    bestBranch,
    totalSalesCount,
    ticketMedioGeral,
    avgCmvPct,
    avgMarginPct,
    growthLast3MonthsPct,
    qualityLevel: qualityInfo.level,
    qualityDescription: qualityInfo.title,
    coverageMonthsCount,
    totalMonths,
    dataConfidenceScore: Math.round(avgConfidence),
  };
}

export const calculateHistoricalDiagnostics = generateHistoricalDiagnostics;

// ==========================================
// 8. INTEGRAÇÃO COM A BASE OFICIAL DO APP
// ==========================================

export function buildOfficialDatabaseCommit(
  session: {
    companyId: string;
    stagingRecords: NormalizedHistoricalRecord[];
    coverage: HistoricalMonthCoverage[];
  },
  existingBranches: Branch[],
  existingSellers: Seller[]
): {
  newMonthlyHistory: MonthlyHistoricalRecord[];
  newSalesRecords: Omit<SaleRecord, 'id' | 'createdAt'>[];
  newSellers: Omit<Seller, 'id'>[];
} {
  const { companyId, stagingRecords, coverage } = session;

  // 1. Converte cobertura para MonthlyHistoricalRecord[]
  const newMonthlyHistory: MonthlyHistoricalRecord[] = coverage
    .filter((c) => c.totalRevenue > 0)
    .map((c) => {
      const monthRecords = stagingRecords.filter((r) => r.year === c.year && r.month === c.monthNumber);
      const branchRevenues: Record<string, number> = {};

      for (const r of monthRecords) {
        const bId = r.branchId || 'branch-default';
        branchRevenues[bId] = (branchRevenues[bId] || 0) + (r.revenue || 0);
      }

      return {
        monthNumber: c.monthNumber,
        monthName: c.monthName,
        year: c.year,
        consolidatedRevenue: c.totalRevenue,
        branchRevenues,
      };
    });

  // 2. Identifica novos vendedores para cadastrar
  const newSellersMap = new Map<string, Omit<Seller, 'id'>>();
  for (const r of stagingRecords) {
    if (!r.sellerName || r.sellerName === 'Geral') continue;

    const norm = normalizeText(r.sellerName);
    const existing = existingSellers.find(
      (s) => s.companyId === companyId && normalizeText(s.name) === norm
    );

    if (!existing && !newSellersMap.has(norm)) {
      newSellersMap.set(norm, {
        companyId,
        branchId: r.branchId || existingBranches[0]?.id || 'branch-default',
        name: r.sellerName,
        role: r.sellerRole || 'Vendedora',
        active: r.sellerActive !== undefined ? r.sellerActive : true,
        startDate: `${r.year}-01-01`,
        monthlyTarget: r.revenue > 0 ? Math.round(r.revenue * 1.1) : 30000,
        weeklyTarget: r.revenue > 0 ? Math.round((r.revenue * 1.1) / 4.33) : 7500,
      });
    }
  }

  // 3. Converte registros de vendas granulares
  const newSalesRecords: Omit<SaleRecord, 'id' | 'createdAt'>[] = stagingRecords.map((r) => {
    return {
      companyId,
      branchId: r.branchId || existingBranches[0]?.id || 'branch-default',
      sellerId: r.sellerId || `seller-${normalizeText(r.sellerName || 'geral')}`,
      periodType: r.periodType === 'weekly' ? 'weekly' : 'monthly',
      year: r.year,
      periodNumber: r.periodType === 'weekly' ? r.weekNumber || 1 : r.month,
      periodLabel:
        r.periodType === 'weekly'
          ? `Semana ${r.weekNumber || 1} (${r.startDate} - ${r.endDate})`
          : `${r.monthName} ${r.year}`,
      startDate: r.startDate,
      endDate: r.endDate,
      revenue: r.revenue,
      target: Math.round(r.revenue * 1.05),
      salesCount: r.salesCount,
      paymentBreakdown: r.paymentBreakdown,
      notes: `Importação Histórica: ${r.arquivoOrigem} (${r.origemFaturamento})`,
    };
  });

  return {
    newMonthlyHistory,
    newSalesRecords,
    newSellers: Array.from(newSellersMap.values()),
  };
}

// ==========================================
// 9. PROCESSAMENTO EM LOTE DE ARQUIVOS REAIS
// ==========================================

import { readFileContent } from './fileReaders';

export async function parseUploadedFilesBatch(
  files: File[],
  company: Company,
  branches: Branch[],
  sellers: Seller[],
  startDateStr: string,
  endDateStr: string
): Promise<{
  fileItems: HistoricalFileItem[];
  records: NormalizedHistoricalRecord[];
  batchStats: HistoricalBatchStats;
}> {
  const fileItems: HistoricalFileItem[] = [];
  let allRecords: NormalizedHistoricalRecord[] = [];
  let autoIdentified = 0;
  let needsReview = 0;
  let duplicates = 0;
  let failed = 0;

  const seenHashes = new Set<string>();

  for (let idx = 0; idx < files.length; idx++) {
    const file = files[idx];
    const fileHash = `${file.name}-${file.size}-${file.lastModified}`;

    // Detecção de duplicidade por arquivo
    if (seenHashes.has(fileHash)) {
      duplicates++;
      fileItems.push({
        id: `file-${Date.now()}-${idx}`,
        name: file.name,
        size: file.size,
        type: file.type || file.name.split('.').pop() || 'unknown',
        category: 'unknown',
        status: 'duplicate',
        recordsCount: 0,
        warning: 'Arquivo duplicado detectado no mesmo lote.',
        fileHash,
      });
      continue;
    }
    seenHashes.add(fileHash);

    try {
      const readRes = await readFileContent(file);
      const rawText = readRes.rawText || '';
      const category = classifyFileType(file.name, rawText);

      // Tenta detectar filial/unidade no nome ou no texto
      let matchedBranch = branches[0];
      for (const b of branches) {
        if (
          normalizeText(file.name).includes(normalizeText(b.name)) ||
          normalizeText(rawText).includes(normalizeText(b.name))
        ) {
          matchedBranch = b;
          break;
        }
      }

      // Tenta detectar data no texto ou nome
      let fileStartDate = startDateStr;
      let fileEndDate = endDateStr;
      const dateMatch = rawText.match(/(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})/g);
      if (dateMatch && dateMatch.length >= 2) {
        const p1 = dateMatch[0].split(/[\/\.-]/);
        const p2 = dateMatch[1].split(/[\/\.-]/);
        fileStartDate = `${p1[2]}-${p1[1]}-${p1[0]}`;
        fileEndDate = `${p2[2]}-${p2[1]}-${p2[0]}`;
      }

      const crossCheck = checkCrossMonthPeriod(fileStartDate, fileEndDate);

      // Parse linhas de texto / dados
      const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      const extractedForFile: NormalizedHistoricalRecord[] = [];
      let totalRevenueForFile = 0;

      // Se for planilha com matriz de células (sheetsData)
      if (readRes.sheetsData && readRes.sheetsData.length > 1) {
        const rows = readRes.sheetsData;
        const headerRow = rows[0].map((c: any) => normalizeText(String(c)));

        const vIdx = headerRow.findIndex((c) => c.includes('VENDEDOR') || c.includes('NOME') || c.includes('CONSULTOR'));
        const rIdx = headerRow.findIndex((c) => c.includes('FATURADO') || c.includes('RECEITA') || c.includes('VALOR') || c.includes('TOTAL'));
        const qIdx = headerRow.findIndex((c) => c.includes('QTD') || c.includes('VENDAS') || c.includes('QUANTIDADE') || c.includes('CUPONS'));
        const cmvIdx = headerRow.findIndex((c) => c.includes('CMV') || c.includes('CUSTO'));
        const taxIdx = headerRow.findIndex((c) => c.includes('IMPOSTO') || c.includes('TRIBUTO'));
        const feeIdx = headerRow.findIndex((c) => c.includes('TAXA') || c.includes('CARTAO'));

        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          const sellerRaw = vIdx >= 0 ? String(row[vIdx] || '').trim() : 'Geral';
          const revVal = rIdx >= 0 ? parseBrazilianCurrency(row[rIdx]) : 0;
          const qVal = qIdx >= 0 ? parseInt(String(row[qIdx] || '0').replace(/\D/g, ''), 10) || 1 : 1;
          const cmvVal = cmvIdx >= 0 ? parseBrazilianCurrency(row[cmvIdx]) : revVal * (company.financialSettings.cmvPercentage / 100);
          const taxVal = taxIdx >= 0 ? parseBrazilianCurrency(row[taxIdx]) : revVal * (company.financialSettings.taxPercentage / 100);
          const feeVal = feeIdx >= 0 ? parseBrazilianCurrency(row[feeIdx]) : revVal * (company.financialSettings.cardFeePercentage / 100);

          if (revVal > 0 || cmvVal > 0) {
            const d = new Date(fileStartDate);
            const m = d.getMonth() + 1;
            const y = d.getFullYear();

            const rec: NormalizedHistoricalRecord = {
              id: `rec-${fileHash}-${r}`,
              companyId: company.id,
              branchId: matchedBranch ? matchedBranch.id : 'branch-default',
              branchName: matchedBranch ? matchedBranch.name : 'Matriz',
              sellerName: sellerRaw !== 'Geral' ? sellerRaw : undefined,
              startDate: fileStartDate,
              endDate: fileEndDate,
              year: y,
              month: m,
              monthName: MONTH_NAMES[m - 1],
              periodType: 'monthly',
              revenue: revVal,
              salesCount: qVal,
              ticketMedio: qVal > 0 ? revVal / qVal : revVal,
              cmvValor: cmvVal,
              cmvPercentual: revVal > 0 ? (cmvVal / revVal) * 100 : company.financialSettings.cmvPercentage,
              impostos: taxVal,
              taxasCartao: feeVal,
              comissoes: revVal * 0.02,
              outrosCustosVariaveis: revVal * 0.01,
              margemContribuicao: revVal - (cmvVal + taxVal + feeVal + revVal * 0.03),
              margemContribuicaoPercentual: revVal > 0 ? ((revVal - (cmvVal + taxVal + feeVal + revVal * 0.03)) / revVal) * 100 : 0,
              origemFaturamento: 'imported',
              origemCustos: cmvIdx >= 0 ? 'imported' : 'estimated',
              arquivoOrigem: file.name,
              confiancaExtracao: 95,
              isCrossMonth: crossCheck.isCross,
            };

            extractedForFile.push(rec);
            totalRevenueForFile += revVal;
          }
        }
      } else {
        // Extração a partir de texto (PDF / TXT / CSV)
        let foundAny = false;
        for (const line of lines) {
          const upper = normalizeText(line);
          if (upper.includes('TOTAL') && !upper.includes('SUBTOTAL')) {
            const numbers = line.match(/\d{1,3}(?:\.\d{3})*,\d{2}|\d+\.\d{2}/g);
            if (numbers && numbers.length > 0) {
              const lastNum = parseBrazilianCurrency(numbers[numbers.length - 1]);
              if (lastNum > totalRevenueForFile) {
                totalRevenueForFile = lastNum;
              }
            }
          }

          // Busca vendedores conhecidos na linha
          for (const s of sellers) {
            if (upper.includes(normalizeText(s.name))) {
              const numbers = line.match(/\d{1,3}(?:\.\d{3})*,\d{2}|\d+\.\d{2}/g);
              if (numbers && numbers.length > 0) {
                const sRev = parseBrazilianCurrency(numbers[numbers.length - 1]);
                if (sRev > 0) {
                  foundAny = true;
                  const d = new Date(fileStartDate);
                  const m = d.getMonth() + 1;
                  const y = d.getFullYear();

                  const rec: NormalizedHistoricalRecord = {
                    id: `rec-${fileHash}-${normalizeText(s.name)}`,
                    companyId: company.id,
                    branchId: s.branchId || (matchedBranch ? matchedBranch.id : 'branch-default'),
                    branchName: matchedBranch ? matchedBranch.name : 'Matriz',
                    sellerId: s.id,
                    sellerName: s.name,
                    sellerRole: s.role,
                    sellerActive: s.active,
                    startDate: fileStartDate,
                    endDate: fileEndDate,
                    year: y,
                    month: m,
                    monthName: MONTH_NAMES[m - 1],
                    periodType: 'monthly',
                    revenue: sRev,
                    salesCount: Math.max(1, Math.round(sRev / 350)),
                    ticketMedio: 350,
                    cmvValor: sRev * (company.financialSettings.cmvPercentage / 100),
                    cmvPercentual: company.financialSettings.cmvPercentage,
                    impostos: sRev * (company.financialSettings.taxPercentage / 100),
                    taxasCartao: sRev * (company.financialSettings.cardFeePercentage / 100),
                    comissoes: sRev * 0.025,
                    outrosCustosVariaveis: sRev * 0.01,
                    margemContribuicao: sRev * (1 - (company.financialSettings.cmvPercentage + company.financialSettings.taxPercentage + company.financialSettings.cardFeePercentage + 3.5) / 100),
                    margemContribuicaoPercentual: 100 - (company.financialSettings.cmvPercentage + company.financialSettings.taxPercentage + company.financialSettings.cardFeePercentage + 3.5),
                    origemFaturamento: 'imported',
                    origemCustos: 'estimated',
                    arquivoOrigem: file.name,
                    confiancaExtracao: 92,
                    isCrossMonth: crossCheck.isCross,
                  };
                  extractedForFile.push(rec);
                }
              }
            }
          }
        }

        // Se não achou vendedores individuais mas tem receita total do arquivo
        if (!foundAny && totalRevenueForFile > 0) {
          const d = new Date(fileStartDate);
          const m = d.getMonth() + 1;
          const y = d.getFullYear();
          extractedForFile.push({
            id: `rec-${fileHash}-total`,
            companyId: company.id,
            branchId: matchedBranch ? matchedBranch.id : 'branch-default',
            branchName: matchedBranch ? matchedBranch.name : 'Matriz',
            startDate: fileStartDate,
            endDate: fileEndDate,
            year: y,
            month: m,
            monthName: MONTH_NAMES[m - 1],
            periodType: 'monthly',
            revenue: totalRevenueForFile,
            salesCount: Math.round(totalRevenueForFile / 400),
            ticketMedio: 400,
            cmvValor: totalRevenueForFile * (company.financialSettings.cmvPercentage / 100),
            cmvPercentual: company.financialSettings.cmvPercentage,
            impostos: totalRevenueForFile * (company.financialSettings.taxPercentage / 100),
            taxasCartao: totalRevenueForFile * (company.financialSettings.cardFeePercentage / 100),
            comissoes: totalRevenueForFile * 0.02,
            outrosCustosVariaveis: totalRevenueForFile * 0.01,
            margemContribuicao: totalRevenueForFile * 0.45,
            margemContribuicaoPercentual: 45,
            origemFaturamento: 'imported',
            origemCustos: 'estimated',
            arquivoOrigem: file.name,
            confiancaExtracao: 88,
            isCrossMonth: crossCheck.isCross,
          });
        }
      }

      if (extractedForFile.length > 0) {
        autoIdentified++;
        fileItems.push({
          id: `file-${Date.now()}-${idx}`,
          name: file.name,
          size: file.size,
          type: readRes.fileType,
          category,
          status: 'processed',
          detectedPeriod: `${fileStartDate} a ${fileEndDate}`,
          detectedBranch: matchedBranch ? matchedBranch.name : 'Matriz',
          recordsCount: extractedForFile.length,
          totalRevenue: totalRevenueForFile || extractedForFile.reduce((a, b) => a + b.revenue, 0),
          fileHash,
        });

        allRecords = mergeStagingRecords(allRecords, extractedForFile);
      } else {
        needsReview++;
        fileItems.push({
          id: `file-${Date.now()}-${idx}`,
          name: file.name,
          size: file.size,
          type: readRes.fileType,
          category,
          status: 'needs_review',
          recordsCount: 0,
          warning: 'Nenhum valor ou vendedor identificado automaticamente. Necessita mapeamento de colunas.',
          fileHash,
        });
      }
    } catch (err: any) {
      failed++;
      fileItems.push({
        id: `file-${Date.now()}-${idx}`,
        name: file.name,
        size: file.size,
        type: file.name.split('.').pop() || 'unknown',
        category: 'unknown',
        status: 'error',
        recordsCount: 0,
        warning: `Erro de leitura: ${err.message || 'Formato incompatível'}`,
        fileHash,
      });
    }
  }

  const batchStats: HistoricalBatchStats = {
    receivedFiles: files.length,
    processedFiles: files.length - failed,
    autoIdentified,
    needsReview,
    duplicates,
    failed,
  };

  return {
    fileItems,
    records: allRecords,
    batchStats,
  };
}

// ==========================================
// 10. GERADOR DE DEMONSTRAÇÃO COMPLETA 12 MESES
// ==========================================

/**
 * Cria um lote completo de demonstração dos últimos 12 meses (52 relatórios semanais + 12 financeiras)
 * para a empresa ativa, cobrindo todos os cenários (Matriz, Filiais, Vendedores Ativos e Inativos, CMV real, etc).
 */
export function generateMock12MonthsDataset(
  company: Company,
  branches: Branch[],
  sellers: Seller[],
  startDate: string,
  endDate: string
): {
  files: HistoricalFileItem[];
  records: NormalizedHistoricalRecord[];
  batchStats: HistoricalBatchStats;
} {
  const monthList = generateMonthListInRange(startDate, endDate);
  const records: NormalizedHistoricalRecord[] = [];
  const files: HistoricalFileItem[] = [];

  const targetBranches = branches.length > 0 ? branches : [
    { id: 'branch-matriz', companyId: company.id, name: 'Matriz', type: 'headquarters' as const, active: true },
    { id: 'branch-filial', companyId: company.id, name: 'Filial 01', type: 'branch' as const, active: true },
  ];

  const activeSellers = sellers.length > 0 ? sellers : [
    { id: 'sel-1', companyId: company.id, branchId: targetBranches[0].id, name: 'Helen', role: 'Vendedora', active: true, startDate: '2025-01-01' },
    { id: 'sel-2', companyId: company.id, branchId: targetBranches[0].id, name: 'Luana', role: 'Vendedora', active: true, startDate: '2025-01-01' },
    { id: 'sel-3', companyId: company.id, branchId: targetBranches[0].id, name: 'Dheinielly', role: 'Vendedora', active: true, startDate: '2025-01-01' },
    { id: 'sel-4', companyId: company.id, branchId: targetBranches[0].id, name: 'Rejane', role: 'Vendedora', active: true, startDate: '2025-01-01' },
    { id: 'sel-5', companyId: company.id, branchId: targetBranches[1]?.id || targetBranches[0].id, name: 'Mariana', role: 'Consultora', active: true, startDate: '2025-01-01' },
    { id: 'sel-6', companyId: company.id, branchId: targetBranches[1]?.id || targetBranches[0].id, name: 'Camila', role: 'Consultora', active: true, startDate: '2025-01-01' },
    { id: 'sel-7', companyId: company.id, branchId: targetBranches[1]?.id || targetBranches[0].id, name: 'Iasmim', role: 'Consultora', active: true, startDate: '2025-01-01' },
    { id: 'sel-8', companyId: company.id, branchId: targetBranches[0].id, name: 'Patrícia (Histórico)', role: 'Ex-Vendedora', active: false, startDate: '2024-05-01' },
  ];

  // Sazonalidade dos 12 meses
  const seasonalityWeights: Record<number, number> = {
    1: 0.88,  // Jan
    2: 0.82,  // Fev
    3: 0.95,  // Mar
    4: 0.98,  // Abr
    5: 1.18,  // Mai (Mães)
    6: 1.05,  // Jun (Namorados)
    7: 0.92,  // Jul
    8: 1.08,  // Ago (Pais)
    9: 0.96,  // Set
    10: 1.04, // Out (Crianças)
    11: 1.25, // Nov (Black Friday)
    12: 1.55, // Dez (Natal)
  };

  const baseMonthlyRevenue = 280000;
  let fileCount = 0;

  monthList.forEach((m, mIdx) => {
    const sWeight = seasonalityWeights[m.monthNumber] || 1.0;
    const monthRev = baseMonthlyRevenue * sWeight * (1 + (mIdx * 0.015)); // crescimento gradual

    // 1. Arquivo de DRE / Financeiro do Mês
    const dreFileName = `DRE_Financeiro_${m.monthName}_${m.year}.xlsx`;
    fileCount++;
    files.push({
      id: `file-dre-${m.year}-${m.monthNumber}`,
      name: dreFileName,
      size: 48200 + Math.round(Math.random() * 5000),
      type: 'excel_xlsx',
      category: 'financial_costs',
      status: 'processed',
      detectedPeriod: `01/${String(m.monthNumber).padStart(2, '0')}/${m.year} a 30/${String(m.monthNumber).padStart(2, '0')}/${m.year}`,
      detectedBranch: 'Consolidado Matriz & Filiais',
      recordsCount: targetBranches.length,
      totalRevenue: monthRev,
      fileHash: `hash-dre-${m.year}-${m.monthNumber}`,
    });

    // 2. Cria 4 ou 5 relatórios semanais por filial
    const weeksInMonth = m.monthNumber === 5 || m.monthNumber === 10 || m.monthNumber === 12 ? 5 : 4;

    for (let w = 1; w <= weeksInMonth; w++) {
      const weekRev = monthRev / weeksInMonth;
      const isCrossWeek = w === 1 && (m.monthNumber === 2 || m.monthNumber === 8);

      targetBranches.forEach((b) => {
        const bShare = b.type === 'headquarters' ? 0.58 : 0.42;
        const bWeekRev = weekRev * bShare;

        const branchSellers = activeSellers.filter((s) => s.branchId === b.id || (b.type === 'headquarters' && s.active));
        const sShare = branchSellers.length > 0 ? 1 / branchSellers.length : 1;

        const pdfFileName = `Relatorio_Semana_${String(w).padStart(2, '0')}_${b.name.replace(/\s+/g, '_')}_${m.monthName}.pdf`;
        fileCount++;
        files.push({
          id: `file-sem-${m.year}-${m.monthNumber}-${w}-${b.id}`,
          name: pdfFileName,
          size: 112000 + Math.round(Math.random() * 15000),
          type: 'pdf_text',
          category: 'sales',
          status: isCrossWeek ? 'needs_review' : 'processed',
          detectedPeriod: `Semana ${w} - ${m.monthName}/${m.year}`,
          detectedBranch: b.name,
          recordsCount: branchSellers.length,
          totalRevenue: bWeekRev,
          warning: isCrossWeek ? 'Relatório semanal cruza virada de mês (marcado como período misto).' : undefined,
          fileHash: `hash-pdf-${m.year}-${m.monthNumber}-${w}-${b.id}`,
        });

        // Cria registros por vendedor
        branchSellers.forEach((seller) => {
          const sellerVar = 0.85 + Math.random() * 0.3;
          const sRev = bWeekRev * sShare * sellerVar;
          const salesCount = Math.max(1, Math.round(sRev / (320 + Math.random() * 80)));
          const ticketMedio = sRev / salesCount;

          const cmvVal = sRev * (company.financialSettings.cmvPercentage / 100);
          const taxVal = sRev * (company.financialSettings.taxPercentage / 100);
          const feeVal = sRev * (company.financialSettings.cardFeePercentage / 100);
          const comVal = sRev * 0.025;
          const outVal = sRev * 0.01;
          const marginVal = sRev - (cmvVal + taxVal + feeVal + comVal + outVal);

          const startD = `${m.year}-${String(m.monthNumber).padStart(2, '0')}-${String((w - 1) * 7 + 1).padStart(2, '0')}`;
          const endD = `${m.year}-${String(m.monthNumber).padStart(2, '0')}-${String(Math.min(28, w * 7)).padStart(2, '0')}`;

          const paymentBreakdown: PaymentBreakdown = {
            money: Math.round(sRev * 0.08),
            check: 0,
            card: Math.round(sRev * 0.62),
            billet: 0,
            installment: Math.round(sRev * 0.05),
            digital: Math.round(sRev * 0.23),
            partialPayment: 0,
          };

          records.push({
            id: `rec-mock-${m.year}-${m.monthNumber}-w${w}-${b.id}-${seller.id}`,
            companyId: company.id,
            branchId: b.id,
            branchName: b.name,
            sellerId: seller.id,
            sellerName: seller.name,
            sellerRole: seller.role,
            sellerActive: seller.active,
            startDate: startD,
            endDate: endD,
            year: m.year,
            month: m.monthNumber,
            monthName: m.monthName,
            weekNumber: (mIdx * 4) + w,
            periodType: 'weekly',
            revenue: Math.round(sRev * 100) / 100,
            salesCount,
            ticketMedio: Math.round(ticketMedio * 100) / 100,
            cmvValor: Math.round(cmvVal * 100) / 100,
            cmvPercentual: company.financialSettings.cmvPercentage,
            impostos: Math.round(taxVal * 100) / 100,
            taxasCartao: Math.round(feeVal * 100) / 100,
            comissoes: Math.round(comVal * 100) / 100,
            outrosCustosVariaveis: Math.round(outVal * 100) / 100,
            margemContribuicao: Math.round(marginVal * 100) / 100,
            margemContribuicaoPercentual: Math.round((marginVal / sRev) * 1000) / 10,
            origemFaturamento: 'imported',
            origemCustos: 'imported',
            arquivoOrigem: `${pdfFileName} + ${dreFileName}`,
            confiancaExtracao: 98,
            isCrossMonth: isCrossWeek,
            crossMonthDetails: isCrossWeek ? {
              month1: { month: m.monthNumber, days: 4, revenue: sRev * 0.57 },
              month2: { month: m.monthNumber + 1, days: 3, revenue: sRev * 0.43 },
              allocationRule: 'proportional_days',
            } : undefined,
            paymentBreakdown,
          });
        });
      });
    }
  });

  const batchStats: HistoricalBatchStats = {
    receivedFiles: files.length,
    processedFiles: files.length,
    autoIdentified: files.length - 2,
    needsReview: 2,
    duplicates: 0,
    failed: 0,
  };

  return {
    files,
    records,
    batchStats,
  };
}
