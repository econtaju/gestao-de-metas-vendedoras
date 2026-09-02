import {
  ExtractedHeader,
  ExtractedSellerRow,
  ExtractedTotals,
  ImportConfidenceScore,
  PaymentBreakdown,
  SmartImportPayload,
  Seller,
  Company,
  Branch,
  SellerAlias,
  CompanyAlias,
  ImportTemplate,
} from '../types';

// ==========================================
// 1. NORMALIZAÇÃO DE NÚMEROS E MOEDAS BR
// ==========================================

/**
 * Converte qualquer valor em formato brasileiro (ex: "R$ 6.639,49", "1.989,00", "457", 1989)
 * para float JavaScript padrão (6639.49).
 * Trata ponto como milhar e vírgula como decimal.
 */
export function parseBrazilianCurrency(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : Number(val.toFixed(2));
  }

  const str = String(val).trim();
  if (!str || str === '-' || str === 'R$' || str === 'null') return 0;

  // Remove "R$", espaços, letras
  let cleaned = str.replace(/R\$/gi, '').replace(/\s+/g, '').trim();

  // Trata formatos:
  // "6.639,49" -> "6639.49"
  // "1,989.00" (formato US) vs "1.989,00" (formato BR)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      // Formato BR: 1.989,00 -> remove ponto, troca virgula por ponto
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato US: 1,989.00 -> remove virgula
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Apenas vírgula: "1989,00" -> "1989.00"
    cleaned = cleaned.replace(',', '.');
  }

  // Remove caracteres que não sejam dígitos, sinal de menos ou ponto
  cleaned = cleaned.replace(/[^0-9.-]/g, '');

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Number(num.toFixed(2));
}

export function parseIntegerSafe(val: any): number {
  if (typeof val === 'number') return Math.round(val);
  const cleaned = String(val || '').replace(/[^0-9]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

// ==========================================
// 2. NORMALIZAÇÃO TEXTUAL E ALIASES
// ==========================================

export function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/\s+/g, ' '); // remove espaços extras
}

/**
 * Correspondência rigorosa de vendedores:
 * 1. Verifica aliases cadastrados (ex: "HELEN" -> Helen)
 * 2. Verifica igualdade exata do nome normalizado
 * 3. NÃO une automaticamente nomes parecidos ("IASMIM" != "YASMIN JUSSARA")
 */
export function matchSellerWithCatalog(
  rawName: string,
  availableSellers: Seller[],
  aliases: SellerAlias[],
  companyId?: string
): { matchedSeller: Seller | null; matchType: 'alias' | 'exact' | 'none' } {
  const normRaw = normalizeText(rawName);
  if (!normRaw) return { matchedSeller: null, matchType: 'none' };

  // 1. Busca por Alias salvo
  const aliasMatch = aliases.find(
    (a) =>
      (!companyId || a.companyId === companyId) &&
      (normalizeText(a.sourceName) === normRaw || normalizeText(a.normalizedName) === normRaw)
  );

  if (aliasMatch) {
    const s = availableSellers.find((sel) => sel.id === aliasMatch.sellerId);
    if (s) return { matchedSeller: s, matchType: 'alias' };
  }

  // 2. Busca por Nome Exato normalizado
  const exactMatch = availableSellers.find(
    (s) => (!companyId || s.companyId === companyId) && normalizeText(s.name) === normRaw
  );
  if (exactMatch) return { matchedSeller: exactMatch, matchType: 'exact' };

  // 3. Busca por primeiro nome se houver apenas 1 vendedor com aquele primeiro nome na empresa
  const firstName = normRaw.split(' ')[0];
  if (firstName.length >= 3) {
    const candidates = availableSellers.filter(
      (s) =>
        (!companyId || s.companyId === companyId) &&
        normalizeText(s.name).split(' ')[0] === firstName
    );
    if (candidates.length === 1 && normalizeText(candidates[0].name) === normRaw) {
      return { matchedSeller: candidates[0], matchType: 'exact' };
    }
  }

  // Sem match seguro -> deixar para confirmação do usuário
  return { matchedSeller: null, matchType: 'none' };
}

// ==========================================
// 3. DICIONÁRIO DE SINÔNIMOS DE CAMPOS
// ==========================================

export const SYSTEM_FIELD_SYNONYMS: Record<string, string[]> = {
  vendedor: ['vendedor', 'consultor', 'atendente', 'nome do vendedor', 'funcionario', 'colaborador'],
  quantidade_vendas: ['qtd vendas', 'quantidade de vendas', 'qtde', 'quantidade', 'nº vendas', 'n de vendas', 'vendas', 'pedidos'],
  faturamento: ['subtotal', 'total vendedor', 'faturamento', 'venda total', 'total em vendas', 'valor total'],
  dinheiro: ['dinheiro', 'especie', 'espécie', 'cash', 'moeda'],
  cheque: ['cheque', 'cheques', 'chq'],
  cartao: ['cartao', 'cartão', 'cartoes', 'cartões', 'cartao credito', 'cartao debito', 'credito/debito', 'pos', 'tef'],
  boleto: ['boleto', 'boletos', 'boleto bancario', 'bloqueto'],
  carne: ['carne', 'carnê', 'crediario', 'crediário', 'promissoria', 'promissória'],
  digital: ['digital', 'pix', 'transferencia', 'transferência', 'ted', 'doc', 'chave pix', 'pagamento digital'],
  pagamento_parcial: ['pagamento parcial', 'parcial', 'sinal', 'entrada', 'adiantamento'],
  total_geral: ['valor total em vendas', 'total geral', 'total geral de vendas', 'faturamento total', 'totalizador geral'],
};

// ==========================================
// 4. TEMPLATES PRÉ-CONFIGURADOS
// ==========================================

export const DEFAULT_IMPORT_TEMPLATES: ImportTemplate[] = [
  {
    id: 'tmpl-expert-geral-vendas',
    name: 'Expert Informática — Relatório Geral de Vendas por Vendedor',
    systemName: 'expert_sales_report',
    fingerprintKeywords: [
      'relatorio geral de vendas por vendedor',
      'subtotal',
      'qtd vendas',
      'dinheiro',
      'cartao',
      'digital',
      'valor total em vendas',
    ],
    fieldSynonyms: SYSTEM_FIELD_SYNONYMS,
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tmpl-excel-fpa-semanal',
    name: 'Planilha Padrão FP&A / Varejo Semanal',
    systemName: 'standard_fpa_sheet',
    fingerprintKeywords: ['vendedor', 'unidade', 'data', 'faturamento', 'dinheiro', 'cartao'],
    fieldSynonyms: SYSTEM_FIELD_SYNONYMS,
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

// ==========================================
// 5. PARSER PRINCIPAL DE TEXTO ESTRUTURADO
// ==========================================

export interface RawParseContext {
  fileName?: string;
  fileType?: 'pdf_text' | 'pdf_ocr' | 'excel_xlsx' | 'excel_xls' | 'csv' | 'txt';
  fileSize?: number;
  companies: Company[];
  branches: Branch[];
  sellers: Seller[];
  sellerAliases: SellerAlias[];
  companyAliases: CompanyAlias[];
  templates: ImportTemplate[];
}

/**
 * Parser semântico e robusto para relatórios de vendas.
 * Identifica cabeçalhos, blocos dinâmicos de vendedores e totais.
 */
export function parseSalesTextDocument(
  rawText: string,
  context: RawParseContext
): SmartImportPayload {
  const finalFileName = context.fileName || 'relatorio_vendas.txt';
  const finalFileType = context.fileType || 'pdf_text';
  const finalFileSize = context.fileSize || rawText.length;
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 1. Extração do Cabeçalho
  let companyFound = '';
  let branchFound = '';
  let startDate = '';
  let endDate = '';
  let emissionDate = '';
  let reportTitle = 'Relatório Geral de Vendas por Vendedor';

  // Identifica título
  const titleLine = lines.find((l) =>
    normalizeText(l).includes('RELATORIO GERAL DE VENDAS') ||
    normalizeText(l).includes('RELATORIO DE VENDAS') ||
    normalizeText(l).includes('RESUMO DE VENDAS')
  );
  if (titleLine) {
    reportTitle = titleLine;
  }

  // Identifica Empresa e Unidade
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const line = lines[i];
    const norm = normalizeText(line);

    if (norm.startsWith('EMPRESA:') || norm.startsWith('EMPRESA :') || norm.startsWith('LOJA:')) {
      const parts = line.split(/:\s*/);
      if (parts[1]) {
        companyFound = parts[1].trim();
      }
    } else if (norm.includes("OW'ZAADIA") || norm.includes('OWZAADIA') || norm.includes('OTICA')) {
      if (!companyFound) companyFound = line;
    }

    if (norm.startsWith('UNIDADE:') || norm.startsWith('FILIAL:')) {
      const parts = line.split(/:\s*/);
      if (parts[1]) {
        branchFound = parts[1].trim();
      }
    }

    // Identifica Período: ex: "08/08/2026 a 14/08/2026" ou "08/08/2026 até 14/08/2026"
    if (norm.includes('PERIODO:') || norm.includes('PERIODO :') || norm.match(/\d{2}\/\d{2}\/\d{4}.*a.*\d{2}\/\d{2}\/\d{4}/)) {
      const dateMatches = line.match(/(\d{2}\/\d{2}\/\d{4})/g);
      if (dateMatches && dateMatches.length >= 2) {
        startDate = convertBrDateToIso(dateMatches[0]);
        endDate = convertBrDateToIso(dateMatches[1]);
      }
    }

    if (norm.includes('EMISSAO:') || norm.includes('DATA EMISSAO:')) {
      const dateMatches = line.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (dateMatches) {
        emissionDate = convertBrDateToIso(dateMatches[0]);
      }
    }
  }

  // Se a empresa encontrada contém a unidade (ex: "OW'ZAADIA BISS" ou "OW'ZAADIA BOUTIQUE")
  if (companyFound && !branchFound) {
    const normComp = normalizeText(companyFound);
    if (normComp.includes('BISS')) {
      branchFound = 'Biss';
    } else if (normComp.includes('BOUTIQUE')) {
      branchFound = 'Boutique';
    } else if (normComp.includes('MATRIZ')) {
      branchFound = 'Matriz';
    } else if (normComp.includes('CENTRO') || normComp.includes('FILIAL')) {
      branchFound = 'Filial Centro';
    }
  }

  // Mapeamento com empresas e filiais do sistema
  const matchedCompany = matchCompany(companyFound, context.companies, context.companyAliases);
  const matchedBranch = matchBranch(branchFound || companyFound, matchedCompany?.id, context.branches, context.companyAliases);

  const matchedCompanyId = matchedCompany?.id || (context.companies.length > 0 ? context.companies[0].id : null);
  const matchedCompanyName = matchedCompany?.name || (context.companies.length > 0 ? context.companies[0].name : companyFound);
  const matchedBranchId = matchedBranch?.id || (context.branches.length > 0 ? context.branches[0].id : null);
  const matchedBranchName = matchedBranch?.name || branchFound;

  // Fallback de datas caso não encontre
  if (!startDate) {
    startDate = new Date().toISOString().split('T')[0];
  }
  if (!endDate) {
    endDate = startDate;
  }

  const periodLabel = formatPeriodLabel(startDate, endDate);

  // 2. Extração dos Blocos de Vendedor
  const sellerRows: ExtractedSellerRow[] = [];
  let currentSeller: Partial<ExtractedSellerRow> | null = null;
  let inTotalsSection = false;

  // Totais extraídos do rodapé
  const rawTotals: Partial<ExtractedTotals> = {
    totalMoney: 0,
    totalCheck: 0,
    totalCard: 0,
    totalBillet: 0,
    totalInstallment: 0,
    totalDigital: 0,
    totalPartialPayment: 0,
    reportedTotalRevenue: 0,
  };

  const flushCurrentSeller = () => {
    if (currentSeller && (currentSeller.originalName || currentSeller.revenue || currentSeller.salesCount)) {
      const originalName = currentSeller.originalName || 'Vendedor Sem Nome';
      const normName = normalizeText(originalName);
      const match = matchSellerWithCatalog(
        originalName,
        context.sellers,
        context.sellerAliases,
        matchedCompanyId || undefined
      );

      const payments: PaymentBreakdown = {
        money: currentSeller.payments?.money || 0,
        check: currentSeller.payments?.check || 0,
        card: currentSeller.payments?.card || 0,
        billet: currentSeller.payments?.billet || 0,
        installment: currentSeller.payments?.installment || 0,
        digital: currentSeller.payments?.digital || 0,
        partialPayment: currentSeller.payments?.partialPayment || 0,
      };

      const calculatedPaymentsTotal = Number(
        (
          payments.money +
          payments.check +
          payments.card +
          payments.billet +
          payments.installment +
          payments.digital +
          payments.partialPayment
        ).toFixed(2)
      );

      const revenue = currentSeller.revenue !== undefined ? currentSeller.revenue : calculatedPaymentsTotal;
      const paymentDiff = Number(Math.abs(revenue - calculatedPaymentsTotal).toFixed(2));
      const isValid = paymentDiff <= 0.05;

      const validationIssues: string[] = [];
      if (!isValid) {
        validationIssues.push(
          `Soma dos pagamentos (R$ ${calculatedPaymentsTotal.toFixed(2)}) diverge do subtotal (R$ ${revenue.toFixed(2)}). Diferença: R$ ${paymentDiff.toFixed(2)}`
        );
      }
      if (!match.matchedSeller) {
        validationIssues.push(`Vendedor "${originalName}" não possui cadastro direto. Confirme ou vincule.`);
      }

      sellerRows.push({
        id: `sel-row-${sellerRows.length + 1}-${Date.now()}`,
        originalName,
        normalizedName: normName,
        matchedSellerId: match.matchedSeller?.id || null,
        matchedSellerName: match.matchedSeller?.name,
        salesCount: currentSeller.salesCount || 1,
        revenue,
        payments,
        calculatedPaymentsTotal,
        paymentDiff,
        isValid,
        validationIssues,
      });
    }
    currentSeller = null;
  };

  // Iteração linha a linha
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const norm = normalizeText(line);

    // Detecção de início de totais no rodapé
    if (
      norm.includes('TOTAL GERAL') ||
      norm.includes('VALOR TOTAL EM VENDAS') ||
      norm.includes('TOTAIS POR FORMA DE PAGAMENTO') ||
      norm.includes('RESUMO GERAL')
    ) {
      inTotalsSection = true;
      flushCurrentSeller();
    }

    if (inTotalsSection) {
      // Processa rodapé de totais
      if (norm.includes('DINHEIRO:')) {
        rawTotals.totalMoney = parseBrazilianCurrency(line.split(/:\s*/)[1] || line);
      } else if (norm.includes('CHEQUE:')) {
        rawTotals.totalCheck = parseBrazilianCurrency(line.split(/:\s*/)[1] || line);
      } else if (norm.includes('CARTAO:') || norm.includes('CARTAO')) {
        rawTotals.totalCard = parseBrazilianCurrency(line.split(/:\s*/)[1] || line);
      } else if (norm.includes('BOLETO:')) {
        rawTotals.totalBillet = parseBrazilianCurrency(line.split(/:\s*/)[1] || line);
      } else if (norm.includes('CARNE:') || norm.includes('CARNE')) {
        rawTotals.totalInstallment = parseBrazilianCurrency(line.split(/:\s*/)[1] || line);
      } else if (norm.includes('DIGITAL:') || norm.includes('PIX:')) {
        rawTotals.totalDigital = parseBrazilianCurrency(line.split(/:\s*/)[1] || line);
      } else if (norm.includes('PARCIAL:') || norm.includes('PAGAMENTO PARCIAL:')) {
        rawTotals.totalPartialPayment = parseBrazilianCurrency(line.split(/:\s*/)[1] || line);
      } else if (norm.includes('VALOR TOTAL EM VENDAS') || norm.includes('TOTAL EM VENDAS:') || norm.includes('FATURAMENTO TOTAL:')) {
        const parts = line.split(/:\s*/);
        rawTotals.reportedTotalRevenue = parseBrazilianCurrency(parts[1] || line);
      }
      continue;
    }

    // Detecção de novo bloco de Vendedor
    const isSellerStart =
      norm.startsWith('VENDEDOR:') ||
      norm.startsWith('VENDEDOR :') ||
      norm.startsWith('CONSULTOR:') ||
      norm.startsWith('ATENDENTE:') ||
      (norm.startsWith('VENDEDOR') && lines[i + 1]?.includes(':'));

    if (isSellerStart) {
      flushCurrentSeller();
      const parts = line.split(/:\s*/);
      const sellerName = (parts[1] || line.replace(/^VENDEDOR\s*/i, '')).trim();
      currentSeller = {
        originalName: sellerName,
        salesCount: 0,
        revenue: 0,
        payments: {
          money: 0,
          check: 0,
          card: 0,
          billet: 0,
          installment: 0,
          digital: 0,
          partialPayment: 0,
        },
      };
      continue;
    }

    if (!currentSeller) {
      // Se ainda não inicializou um vendedor, mas achou uma linha com "Quantidade de vendas:"
      if (norm.includes('QUANTIDADE DE VENDAS') || norm.includes('QTD VENDAS')) {
        currentSeller = {
          originalName: 'Vendedor',
          salesCount: parseIntegerSafe(line.split(/:\s*/)[1] || line),
          payments: {
            money: 0,
            check: 0,
            card: 0,
            billet: 0,
            installment: 0,
            digital: 0,
            partialPayment: 0,
          },
        };
      }
      continue;
    }

    // Campos do vendedor atual
    if (norm.includes('QUANTIDADE DE VENDAS:') || norm.includes('QTD VENDAS:') || norm.includes('QTDE:')) {
      currentSeller.salesCount = parseIntegerSafe(line.split(/:\s*/)[1] || line);
    } else if (norm.includes('SUBTOTAL:') || norm.includes('FATURAMENTO:') || norm.includes('TOTAL VENDEDOR:')) {
      currentSeller.revenue = parseBrazilianCurrency(line.split(/:\s*/)[1] || line);
    } else if (norm.includes('DINHEIRO:')) {
      if (currentSeller.payments) currentSeller.payments.money = parseBrazilianCurrency(line.split(/:\s*/)[1] || line);
    } else if (norm.includes('CHEQUE:')) {
      if (currentSeller.payments) currentSeller.payments.check = parseBrazilianCurrency(line.split(/:\s*/)[1] || line);
    } else if (norm.includes('CARTAO:') || norm.includes('CARTAO')) {
      if (currentSeller.payments) currentSeller.payments.card = parseBrazilianCurrency(line.split(/:\s*/)[1] || line);
    } else if (norm.includes('BOLETO:')) {
      if (currentSeller.payments) currentSeller.payments.billet = parseBrazilianCurrency(line.split(/:\s*/)[1] || line);
    } else if (norm.includes('CARNE:') || norm.includes('CARNE')) {
      if (currentSeller.payments) currentSeller.payments.installment = parseBrazilianCurrency(line.split(/:\s*/)[1] || line);
    } else if (norm.includes('DIGITAL:') || norm.includes('PIX:')) {
      if (currentSeller.payments) currentSeller.payments.digital = parseBrazilianCurrency(line.split(/:\s*/)[1] || line);
    } else if (norm.includes('PARCIAL:') || norm.includes('PAGAMENTO PARCIAL:')) {
      if (currentSeller.payments) currentSeller.payments.partialPayment = parseBrazilianCurrency(line.split(/:\s*/)[1] || line);
    }
  }

  // Descarrega o último vendedor
  flushCurrentSeller();

  // 3. Cálculo e Validação dos Totais
  const sumSellersRevenue = Number(
    sellerRows.reduce((acc, row) => acc + (row.revenue || 0), 0).toFixed(2)
  );

  const sumAllPayments = Number(
    sellerRows
      .reduce((acc, row) => acc + (row.calculatedPaymentsTotal || 0), 0)
      .toFixed(2)
  );

  const reportedTotalRevenue =
    rawTotals.reportedTotalRevenue && rawTotals.reportedTotalRevenue > 0
      ? rawTotals.reportedTotalRevenue
      : sumSellersRevenue;

  const sellersDiff = Number(Math.abs(sumSellersRevenue - reportedTotalRevenue).toFixed(2));
  const paymentsDiff = Number(Math.abs(sumAllPayments - reportedTotalRevenue).toFixed(2));

  const totalMoney = sellerRows.reduce((acc, r) => acc + r.payments.money, 0);
  const totalCheck = sellerRows.reduce((acc, r) => acc + r.payments.check, 0);
  const totalCard = sellerRows.reduce((acc, r) => acc + r.payments.card, 0);
  const totalBillet = sellerRows.reduce((acc, r) => acc + r.payments.billet, 0);
  const totalInstallment = sellerRows.reduce((acc, r) => acc + r.payments.installment, 0);
  const totalDigital = sellerRows.reduce((acc, r) => acc + r.payments.digital, 0);
  const totalPartialPayment = sellerRows.reduce((acc, r) => acc + r.payments.partialPayment, 0);

  const totals: ExtractedTotals = {
    totalMoney: Number(totalMoney.toFixed(2)),
    totalCheck: Number(totalCheck.toFixed(2)),
    totalCard: Number(totalCard.toFixed(2)),
    totalBillet: Number(totalBillet.toFixed(2)),
    totalInstallment: Number(totalInstallment.toFixed(2)),
    totalDigital: Number(totalDigital.toFixed(2)),
    totalPartialPayment: Number(totalPartialPayment.toFixed(2)),
    reportedTotalRevenue: Number(reportedTotalRevenue.toFixed(2)),
    sumSellersRevenue,
    sumAllPayments,
    sellersDiff,
    paymentsDiff,
  };

  // 4. Cálculo do Score de Confiança
  const confidence = calculateConfidenceScore({
    companyFound: !!matchedCompanyId,
    branchFound: !!matchedBranchId,
    periodFound: !!startDate && !!endDate,
    sellersCount: sellerRows.length,
    sellersIdentifiedCount: sellerRows.filter((r) => !!r.matchedSellerId).length,
    sellersDiff,
    paymentsDiff,
    allSellersValid: sellerRows.every((r) => r.isValid),
    reportedTotalRevenue,
  });

  // 5. Template Fingerprinting
  const matchedTemplate = findMatchingTemplate(rawText, context.templates);

  const fileHash = generateFileFingerprint(
    finalFileName,
    matchedCompanyName || '',
    matchedBranchName || '',
    startDate,
    endDate,
    reportedTotalRevenue
  );

  const header: ExtractedHeader = {
    companyName: companyFound || matchedCompanyName || 'Empresa Geral',
    matchedCompanyId,
    matchedCompanyName,
    branchName: branchFound || matchedBranchName || 'Unidade Geral',
    matchedBranchId,
    matchedBranchName,
    startDate,
    endDate,
    periodLabel,
    emissionDate: emissionDate || undefined,
    reportTitle,
    fileName: finalFileName,
    fileType: finalFileType,
    fileSize: finalFileSize,
    fileHash,
    templateId: matchedTemplate?.id || 'tmpl-expert-geral-vendas',
    templateName: matchedTemplate?.name || 'Expert Informática — Relatório Geral de Vendas por Vendedor',
  };

  const status: SmartImportPayload['status'] =
    confidence.score >= 98 && sellersDiff <= 0.05 && paymentsDiff <= 0.05
      ? 'validated'
      : confidence.score >= 90
      ? 'needs_review'
      : 'needs_review';

  return {
    id: `imp-payload-${Date.now()}`,
    header,
    sellers: sellerRows,
    totals,
    confidence,
    isDuplicate: false,
    status,
    rawText,
    createdAt: new Date().toISOString(),
  };
}

// ==========================================
// 6. SCORE DE CONFIANÇA E AUDITORIA
// ==========================================

interface ConfidenceFactors {
  companyFound: boolean;
  branchFound: boolean;
  periodFound: boolean;
  sellersCount: number;
  sellersIdentifiedCount: number;
  sellersDiff: number;
  paymentsDiff: number;
  allSellersValid: boolean;
  reportedTotalRevenue: number;
}

export function calculateConfidenceScore(factors: ConfidenceFactors): ImportConfidenceScore {
  const breakdown: ImportConfidenceScore['breakdown'] = [];
  let score = 0;

  // 1. Empresa e Unidade (20 pts)
  if (factors.companyFound) {
    score += 10;
    breakdown.push({ item: 'Empresa Identificada', points: 10, maxPoints: 10, passed: true, message: 'Empresa reconhecida no sistema.' });
  } else {
    breakdown.push({ item: 'Empresa Identificada', points: 0, maxPoints: 10, passed: false, message: 'Empresa precisa ser confirmada.' });
  }

  if (factors.branchFound) {
    score += 10;
    breakdown.push({ item: 'Unidade/Filial Identificada', points: 10, maxPoints: 10, passed: true, message: 'Unidade reconhecida no sistema.' });
  } else {
    breakdown.push({ item: 'Unidade/Filial Identificada', points: 0, maxPoints: 10, passed: false, message: 'Unidade requer atribuição manual.' });
  }

  // 2. Período (15 pts)
  if (factors.periodFound) {
    score += 15;
    breakdown.push({ item: 'Período Reconhecido', points: 15, maxPoints: 15, passed: true, message: 'Datas de início e fim extraídas com precisão.' });
  } else {
    breakdown.push({ item: 'Período Reconhecido', points: 5, maxPoints: 15, passed: false, message: 'Período aproximado requer conferência.' });
    score += 5;
  }

  // 3. Soma dos Vendedores vs Total Geral (25 pts)
  if (factors.sellersDiff <= 0.05 && factors.reportedTotalRevenue > 0) {
    score += 25;
    breakdown.push({ item: 'Soma dos Vendedores', points: 25, maxPoints: 25, passed: true, message: 'Soma dos faturamentos bate 100% com o total do relatório.' });
  } else {
    const pts = Math.max(0, 25 - Math.round(factors.sellersDiff * 2));
    score += pts;
    breakdown.push({ item: 'Soma dos Vendedores', points: pts, maxPoints: 25, passed: false, message: `Divergência de R$ ${factors.sellersDiff.toFixed(2)} em relação ao total informado.` });
  }

  // 4. Formas de Pagamento vs Total Geral (20 pts)
  if (factors.paymentsDiff <= 0.05 && factors.reportedTotalRevenue > 0) {
    score += 20;
    breakdown.push({ item: 'Formas de Pagamento', points: 20, maxPoints: 20, passed: true, message: 'Total de meios de pagamento bate exatamente com o faturamento.' });
  } else {
    const pts = Math.max(0, 20 - Math.round(factors.paymentsDiff * 2));
    score += pts;
    breakdown.push({ item: 'Formas de Pagamento', points: pts, maxPoints: 20, passed: false, message: `Diferença de R$ ${factors.paymentsDiff.toFixed(2)} na soma dos meios de pagamento.` });
  }

  // 5. Consistência Individual dos Vendedores (10 pts)
  if (factors.allSellersValid && factors.sellersCount > 0) {
    score += 10;
    breakdown.push({ item: 'Consistência por Vendedor', points: 10, maxPoints: 10, passed: true, message: 'Todos os vendedores têm pagamentos equilibrados com seus subtotais.' });
  } else {
    breakdown.push({ item: 'Consistência por Vendedor', points: 4, maxPoints: 10, passed: false, message: 'Alguns vendedores possuem divergências internas nos meios de pagamento.' });
    score += 4;
  }

  // Limita 0 a 100
  const finalScore = Math.min(100, Math.max(0, score));

  let rating: ImportConfidenceScore['rating'] = 'high';
  if (finalScore < 90) {
    rating = 'review_mandatory';
  } else if (finalScore < 98) {
    rating = 'review_recommended';
  }

  return {
    score: finalScore,
    rating,
    breakdown,
  };
}

// ==========================================
// 7. AUXILIARES DE DATA E EMPRESA
// ==========================================

export function convertBrDateToIso(brDate: string): string {
  if (!brDate || typeof brDate !== 'string') return '';
  const parts = brDate.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return brDate;
}

export function formatPeriodLabel(startDate?: string, endDate?: string): string {
  if (!startDate || !endDate || typeof startDate !== 'string' || typeof endDate !== 'string') return 'Período Geral';
  const fmt = (d: string) => {
    const parts = d.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return d;
  };
  return `${fmt(startDate)} a ${fmt(endDate)}`;
}

export function matchCompany(name: string, companies: Company[], aliases: CompanyAlias[]): Company | null {
  const norm = normalizeText(name);
  if (!norm) return companies[0] || null;

  // Alias
  const alias = aliases.find((a) => normalizeText(a.sourceName) === norm || normalizeText(a.normalizedName) === norm);
  if (alias) {
    const c = companies.find((comp) => comp.id === alias.companyId);
    if (c) return c;
  }

  // Exact or contains
  const exact = companies.find(
    (c) =>
      normalizeText(c.name) === norm ||
      normalizeText(c.tradeName) === norm ||
      norm.includes(normalizeText(c.tradeName)) ||
      normalizeText(c.tradeName).includes(norm)
  );
  if (exact) return exact;

  return companies[0] || null;
}

export function matchBranch(
  branchRaw: string,
  companyId: string | null,
  branches: Branch[],
  aliases: CompanyAlias[]
): Branch | null {
  const norm = normalizeText(branchRaw);
  const availableBranches = companyId ? branches.filter((b) => b.companyId === companyId) : branches;

  if (!norm) return availableBranches[0] || null;

  // Alias
  const alias = aliases.find((a) => (!companyId || a.companyId === companyId) && normalizeText(a.sourceName) === norm);
  if (alias) {
    const b = availableBranches.find((br) => br.id === alias.branchId);
    if (b) return b;
  }

  // Direct match
  const exact = availableBranches.find((b) => {
    const normB = normalizeText(b.name);
    return normB === norm || norm.includes(normB) || normB.includes(norm);
  });
  if (exact) return exact;

  // Keywords (BISS, BOUTIQUE, MATRIZ, FILIAL)
  if (norm.includes('BISS')) {
    const biss = availableBranches.find((b) => normalizeText(b.name).includes('BISS'));
    if (biss) return biss;
  }
  if (norm.includes('BOUTIQUE')) {
    const boutique = availableBranches.find((b) => normalizeText(b.name).includes('BOUTIQUE'));
    if (boutique) return boutique;
  }

  return availableBranches[0] || null;
}

export function findMatchingTemplate(text: string, templates: ImportTemplate[]): ImportTemplate | null {
  const norm = normalizeText(text);
  for (const t of templates) {
    const matchedCount = t.fingerprintKeywords.filter((kw) => norm.includes(normalizeText(kw))).length;
    if (matchedCount >= 3) {
      return t;
    }
  }
  return templates[0] || null;
}

export function generateFileFingerprint(
  fileName: string,
  company: string,
  branch: string,
  startDate: string,
  endDate: string,
  totalRevenue: number
): string {
  const raw = `${fileName}_${company}_${branch}_${startDate}_${endDate}_${totalRevenue.toFixed(2)}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

// ==========================================
// 8. RELATÓRIOS DEMO DE REFERÊNCIA
// ==========================================

export const SAMPLE_PDF_TEXT_BISS = `Relatório Geral de Vendas por Vendedor

Empresa:
OW'ZAADIA BISS

Período:
08/08/2026 a 14/08/2026

Data Emissão:
15/08/2026

Vendedor:
HELEN
Quantidade de vendas:
45
Subtotal:
R$ 11.333,30
Dinheiro:
R$ 273,90
Cheque:
R$ 0,00
Cartão:
R$ 8.089,40
Boleto:
R$ 0,00
Carnê:
R$ 0,00
Digital:
R$ 2.970,00
Pagamento parcial:
R$ 0,00

Vendedor:
LUANA
Quantidade de vendas:
38
Subtotal:
R$ 8.617,90
Dinheiro:
R$ 2.038,50
Cheque:
R$ 0,00
Cartão:
R$ 4.806,40
Boleto:
R$ 0,00
Carnê:
R$ 0,00
Digital:
R$ 1.773,00
Pagamento parcial:
R$ 0,00

Vendedor:
DHEINIELYY
Quantidade de vendas:
32
Subtotal:
R$ 8.352,06
Dinheiro:
R$ 882,20
Cheque:
R$ 0,00
Cartão:
R$ 6.806,86
Boleto:
R$ 0,00
Carnê:
R$ 0,00
Digital:
R$ 663,00
Pagamento parcial:
R$ 0,00

Vendedor:
REJANE 
Quantidade de vendas:
24
Subtotal:
R$ 5.419,60
Dinheiro:
R$ 287,00
Cheque:
R$ 0,00
Cartão:
R$ 4.287,60
Boleto:
R$ 0,00
Carnê:
R$ 0,00
Digital:
R$ 845,00
Pagamento parcial:
R$ 0,00

TOTAIS POR FORMA DE PAGAMENTO
Dinheiro: R$ 3.481,60
Cheque: R$ 0,00
Cartão: R$ 23.990,26
Boleto: R$ 0,00
Carnê: R$ 0,00
Digital: R$ 6.251,00
Pagamento parcial: R$ 0,00

Valor Total em Vendas:
R$ 33.722,86`;

export const SAMPLE_PDF_TEXT_BOUTIQUE = `Relatório Geral de Vendas por Vendedor

Empresa:
OW'ZAADIA BOUTIQUE E ACESSÓRIOS

Período:
08/08/2026 a 14/08/2026

Data Emissão:
15/08/2026

Vendedor:
MARIANA
Quantidade de vendas:
52
Subtotal:
R$ 14.850,50
Dinheiro:
R$ 1.650,00
Cheque:
R$ 0,00
Cartão:
R$ 9.800,50
Boleto:
R$ 0,00
Carnê:
R$ 0,00
Digital:
R$ 3.400,00
Pagamento parcial:
R$ 0,00

Vendedor:
CAMILA
Quantidade de vendas:
41
Subtotal:
R$ 11.240,44
Dinheiro:
R$ 980,44
Cheque:
R$ 0,00
Cartão:
R$ 7.660,00
Boleto:
R$ 0,00
Carnê:
R$ 0,00
Digital:
R$ 2.600,00
Pagamento parcial:
R$ 0,00

Vendedor:
IASMIM
Quantidade de vendas:
39
Subtotal:
R$ 10.221,00
Dinheiro:
R$ 850,00
Cheque:
R$ 0,00
Cartão:
R$ 6.971,00
Boleto:
R$ 0,00
Carnê:
R$ 0,00
Digital:
R$ 2.400,00
Pagamento parcial:
R$ 0,00

TOTAIS POR FORMA DE PAGAMENTO
Dinheiro: R$ 3.480,44
Cheque: R$ 0,00
Cartão: R$ 24.431,50
Boleto: R$ 0,00
Carnê: R$ 0,00
Digital: R$ 8.400,00
Pagamento parcial: R$ 0,00

Valor Total em Vendas:
R$ 36.311,94`;

export const DEMO_REPORTS = {
  OWZAADIA_BISS: SAMPLE_PDF_TEXT_BISS,
  OWZAADIA_BOUTIQUE: SAMPLE_PDF_TEXT_BOUTIQUE,
};

