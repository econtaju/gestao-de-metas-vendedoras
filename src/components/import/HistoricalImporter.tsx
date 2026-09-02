import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  History,
  UploadCloud,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Layers,
  Calendar,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Percent,
  Check,
  ChevronRight,
  Eye,
  Trash2,
  RefreshCw,
  Info,
  ArrowRight,
  ShieldCheck,
  Zap,
  Filter,
  BarChart2,
  Clock,
  PieChart,
  Table,
  Sliders,
  ExternalLink,
  Edit3,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  HistoricalImportSession,
  NormalizedHistoricalRecord,
  HistoricalMonthCoverage,
  HistoricalFileItem,
  HistoricalDataQualityLevel,
} from '../../types';
import {
  generate12MonthDateRange,
  generateMonthListInRange,
  calculateHistoricalCoverage,
  calculateHistoricalQualityLevel,
  calculateHistoricalDiagnostics,
  parseUploadedFilesBatch,
  generateMock12MonthsDataset,
  formatCurrencyBRL,
  formatPercentBRL,
  MONTH_NAMES,
} from '../../services/historicalImportEngine';

export const HistoricalImporter: React.FC = () => {
  const {
    companies,
    activeCompanyId,
    setActiveCompanyId,
    branches,
    sellers,
    historicalSessions,
    saveHistoricalSession,
    commitHistoricalSessionToOfficial,
    setCurrentView,
  } = useApp();

  const activeCompany = useMemo(
    () => companies.find((c) => c.id === activeCompanyId) || companies[0],
    [companies, activeCompanyId]
  );

  const companyBranches = useMemo(
    () => (activeCompany ? branches.filter((b) => b.companyId === activeCompany.id) : []),
    [branches, activeCompany?.id]
  );

  const companySellers = useMemo(
    () => (activeCompany ? sellers.filter((s) => s.companyId === activeCompany.id) : []),
    [sellers, activeCompany?.id]
  );

  // Período padrão: Últimos 12 meses
  const defaultDates = useMemo(() => generate12MonthDateRange(12), []);

  // Estado da sessão atual
  const [session, setSession] = useState<HistoricalImportSession>(() => {
    const existing = historicalSessions[activeCompanyId];
    if (existing) return existing;

    const initialCoverage = calculateHistoricalCoverage([], defaultDates.startDate, defaultDates.endDate);
    const initialQuality = calculateHistoricalQualityLevel([]);

    return {
      id: `session-hist-${activeCompanyId}`,
      companyId: activeCompanyId,
      companyName: activeCompany?.tradeName || 'Empresa Cliente',
      periodMode: 'last_12_months',
      startDate: defaultDates.startDate,
      endDate: defaultDates.endDate,
      stagingRecords: [],
      coverage: initialCoverage,
      batchStats: {
        receivedFiles: 0,
        processedFiles: 0,
        autoIdentified: 0,
        needsReview: 0,
        duplicates: 0,
        failed: 0,
      },
      qualityLevel: initialQuality.level,
      status: 'step1_company',
      files: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  // Atualiza a sessão quando o usuário troca de empresa no topo
  useEffect(() => {
    const existing = historicalSessions[activeCompanyId];
    if (existing) {
      setSession(existing);
    } else {
      const dates = generate12MonthDateRange(12);
      const cov = calculateHistoricalCoverage([], dates.startDate, dates.endDate);
      const qual = calculateHistoricalQualityLevel([]);
      setSession({
        id: `session-hist-${activeCompanyId}`,
        companyId: activeCompanyId,
        companyName: activeCompany?.tradeName || 'Empresa Cliente',
        periodMode: 'last_12_months',
        startDate: dates.startDate,
        endDate: dates.endDate,
        stagingRecords: [],
        coverage: cov,
        batchStats: {
          receivedFiles: 0,
          processedFiles: 0,
          autoIdentified: 0,
          needsReview: 0,
          duplicates: 0,
          failed: 0,
        },
        qualityLevel: qual.level,
        status: 'step1_company',
        files: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }, [activeCompanyId]);

  // Salva no contexto global sempre que o estado da sessão mudar
  const updateSession = (updated: Partial<HistoricalImportSession>) => {
    setSession((prev) => {
      const next = {
        ...prev,
        ...updated,
        updatedAt: new Date().toISOString(),
      };
      saveHistoricalSession(next);
      return next;
    });
  };

  // Recalcula cobertura e diagnósticos
  const coverage = useMemo(() => {
    return calculateHistoricalCoverage(session.stagingRecords, session.startDate, session.endDate);
  }, [session.stagingRecords, session.startDate, session.endDate]);

  const diagnostics = useMemo(() => {
    return calculateHistoricalDiagnostics(session.stagingRecords, coverage, session.startDate, session.endDate);
  }, [session.stagingRecords, coverage, session.startDate, session.endDate]);

  const qualityInfo = useMemo(() => {
    return calculateHistoricalQualityLevel(session.stagingRecords);
  }, [session.stagingRecords]);

  // Estados locais da UI
  const [activeTab, setActiveTab] = useState<'upload' | 'coverage' | 'staging' | 'diagnostics'>('coverage');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [selectedCrossRecord, setSelectedCrossRecord] = useState<NormalizedHistoricalRecord | null>(null);
  const [commitSuccessData, setCommitSuccessData] = useState<{
    monthlyCount: number;
    salesCount: number;
    sellersCount: number;
  } | null>(null);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handler de upload de arquivos reais
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress(15);

    try {
      const fileList: File[] = Array.from(files);
      const res = await parseUploadedFilesBatch(
        fileList,
        activeCompany,
        companyBranches,
        companySellers,
        session.startDate,
        session.endDate
      );

      setProcessingProgress(80);

      const mergedFiles = [...session.files, ...res.fileItems];
      const mergedRecords = [...session.stagingRecords, ...res.records];

      const newCoverage = calculateHistoricalCoverage(mergedRecords, session.startDate, session.endDate);
      const newQuality = calculateHistoricalQualityLevel(mergedRecords);

      updateSession({
        files: mergedFiles,
        stagingRecords: mergedRecords,
        coverage: newCoverage,
        batchStats: {
          receivedFiles: mergedFiles.length,
          processedFiles: mergedFiles.filter((f) => f.status === 'processed').length,
          autoIdentified: mergedFiles.filter((f) => f.status === 'processed').length,
          needsReview: mergedFiles.filter((f) => f.status === 'needs_review').length,
          duplicates: mergedFiles.filter((f) => f.status === 'duplicate').length,
          failed: mergedFiles.filter((f) => f.status === 'error').length,
        },
        qualityLevel: newQuality.level,
        status: 'step3_analysis',
      });

      setProcessingProgress(100);
      setActiveTab('coverage');
    } catch (err) {
      console.error('Erro no processamento dos arquivos:', err);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Carrega Demonstração Completa dos 12 Meses (52 Relatórios + DREs)
  const handleLoadDemoDataset = () => {
    setIsProcessing(true);
    setProcessingProgress(30);

    setTimeout(() => {
      const demo = generateMock12MonthsDataset(
        activeCompany,
        companyBranches,
        companySellers,
        session.startDate,
        session.endDate
      );

      setProcessingProgress(90);

      const newCoverage = calculateHistoricalCoverage(demo.records, session.startDate, session.endDate);
      const newQuality = calculateHistoricalQualityLevel(demo.records);

      updateSession({
        files: demo.files,
        stagingRecords: demo.records,
        coverage: newCoverage,
        batchStats: demo.batchStats,
        qualityLevel: newQuality.level,
        status: 'step3_analysis',
      });

      setIsProcessing(false);
      setActiveTab('coverage');
    }, 400);
  };

  // Limpa área temporária de staging
  const handleClearStaging = () => {
    if (window.confirm('Deseja realmente limpar todos os arquivos e registros temporários em análise?')) {
      const dates = generate12MonthDateRange(12);
      const cov = calculateHistoricalCoverage([], dates.startDate, dates.endDate);
      updateSession({
        files: [],
        stagingRecords: [],
        coverage: cov,
        batchStats: {
          receivedFiles: 0,
          processedFiles: 0,
          autoIdentified: 0,
          needsReview: 0,
          duplicates: 0,
          failed: 0,
        },
        qualityLevel: 1,
        status: 'step1_company',
      });
      setCommitSuccessData(null);
    }
  };

  // Aplica regra de divisão para períodos que cruzam mês
  const handleApplyCrossMonthRule = (recordId: string, rule: 'proportional_days' | 'predominant_month') => {
    const updated = session.stagingRecords.map((r) => {
      if (r.id === recordId && r.crossMonthDetails) {
        return {
          ...r,
          crossMonthDetails: {
            ...r.crossMonthDetails,
            allocationRule: rule,
          },
        };
      }
      return r;
    });

    updateSession({ stagingRecords: updated });
    setSelectedCrossRecord(null);
  };

  // Confirma e integra na Base Oficial
  const handleCommitToOfficial = () => {
    if (session.stagingRecords.length === 0) {
      alert('Nenhum dado em análise para integrar. Por favor, envie arquivos ou carregue a demonstração.');
      return;
    }

    const res = commitHistoricalSessionToOfficial({
      ...session,
      coverage,
    });

    setCommitSuccessData(res);
  };

  // Filtra registros do staging
  const filteredStagingRecords = useMemo(() => {
    return session.stagingRecords.filter((r) => {
      if (selectedMonthFilter !== 'all' && `${r.year}-${r.month}` !== selectedMonthFilter) {
        return false;
      }
      if (selectedBranchFilter !== 'all' && r.branchId !== selectedBranchFilter) {
        return false;
      }
      return true;
    });
  }, [session.stagingRecords, selectedMonthFilter, selectedBranchFilter]);

  // Lista única de meses disponíveis no staging
  const availableMonthsInStaging = useMemo(() => {
    const set = new Set<string>();
    (session.stagingRecords || []).forEach((r) => {
      if (r && r.year && r.month) {
        set.add(`${r.year}-${r.month}`);
      }
    });
    return Array.from(set).map((key) => {
      const parts = key.split('-');
      const year = Number(parts[0]) || 2026;
      const month = Number(parts[1]) || 1;
      return { key, label: `${MONTH_NAMES[month - 1] || 'Mês ' + month} / ${year}` };
    });
  }, [session.stagingRecords]);

  return (
    <div id="historical-importer-module" className="space-y-6 pb-12">
      {/* 1. Header do Módulo & Staging Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Módulo de Onboarding Histórico
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Área Segura: Dados em Análise (Staging)
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Importar Histórico (Últimos 12 Meses)
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-3xl">
              Carregue múltiplos relatórios em PDF, planilhas Excel (XLSX/XLS) ou CSV da empresa{' '}
              <strong className="text-emerald-400 font-semibold">{activeCompany.tradeName}</strong>. O sistema
              consolida filiais, separa vendedores e constrói a base de 12 meses para o Gerador de Metas FP&A.
            </p>
          </div>

          {/* Seletor Rápido de Empresa e Período */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs">
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Janela dos 12 Meses</div>
              <div className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                {diagnostics.periodLabel}
              </div>
            </div>

            {session.stagingRecords.length > 0 && (
              <button
                id="btn-clear-staging"
                onClick={handleClearStaging}
                className="bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-700/50 text-xs px-3 py-2 rounded-xl font-medium transition flex items-center gap-1.5"
                title="Limpar todos os arquivos temporários"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpar Análise
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Banner de Sucesso pós-integração */}
      {commitSuccessData && (
        <div className="bg-emerald-900/40 border-2 border-emerald-500/80 rounded-2xl p-5 text-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-900 font-black shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Histórico dos 12 Meses Integrado com Sucesso!</h3>
              <p className="text-xs text-emerald-200 mt-0.5">
                Foram gravados <strong className="text-white font-bold">{commitSuccessData.monthlyCount} meses</strong> consolidados,{' '}
                <strong className="text-white font-bold">{commitSuccessData.salesCount} vendas granulares</strong> e{' '}
                <strong className="text-white font-bold">{commitSuccessData.sellersCount} novos vendedores</strong> na base oficial da empresa {activeCompany.tradeName}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={() => setCurrentView('goals_generator')}
              className="w-full md:w-auto px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Ir para Gerador de Metas FP&A <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentView('commercial_intelligence')}
              className="w-full md:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl border border-slate-700 transition"
            >
              Ver Inteligência Comercial
            </button>
          </div>
        </div>
      )}

      {/* 3. Barra de Navegação das Abas de Análise */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('coverage')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'coverage'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Table className="w-4 h-4" />
            1. Matriz de Cobertura (12 Meses)
            <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-slate-900/20 text-current">
              {coverage.filter((c) => c.totalRevenue > 0).length}/12
            </span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'upload'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            2. Enviar Arquivos & Lote
            {session.files.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-slate-900/20 text-current">
                {session.files.length} arq.
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'diagnostics'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            3. Diagnóstico & Sazonalidade
          </button>

          <button
            onClick={() => setActiveTab('staging')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'staging'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            4. Registros Brutos em Análise
            <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-slate-900/20 text-current">
              {session.stagingRecords.length}
            </span>
          </button>
        </div>

        {/* Botão de Gravar na Base Oficial */}
        <button
          id="btn-commit-official-db"
          onClick={handleCommitToOfficial}
          disabled={session.stagingRecords.length === 0}
          className={`px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-lg transition ${
            session.stagingRecords.length > 0
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Salvar e Integrar na Base Oficial
        </button>
      </div>

      {/* 4. Diagnóstico de Nível de Qualidade e Resumo Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Nível de Qualidade */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
              qualityInfo.level === 4
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                : qualityInfo.level === 3
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : qualityInfo.level === 2
                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                : 'bg-rose-100 text-rose-700 border border-rose-300'
            }`}
          >
            N{qualityInfo.level}
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Maturidade dos Dados</div>
            <div className="font-bold text-slate-900 text-sm leading-tight">{qualityInfo.title}</div>
            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{qualityInfo.description}</div>
          </div>
        </div>

        {/* Faturamento Total dos 12M */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
            <span>Faturamento Total (12M)</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {formatCurrencyBRL(diagnostics.totalRevenue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Média de <strong className="text-slate-800">{formatCurrencyBRL(diagnostics.monthlyMean)}/mês</strong>
          </div>
        </div>

        {/* Cobertura Mensal */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
            <span>Meses Cobertos</span>
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {diagnostics.coverageMonthsCount} de 12 Meses
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {diagnostics.coverageMonthsCount === 12 ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Cobertura anual completa
              </span>
            ) : (
              <span className="text-amber-600 font-medium">
                {12 - diagnostics.coverageMonthsCount} meses restantes para completar
              </span>
            )}
          </div>
        </div>

        {/* Vendas & Margem Média */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
            <span>Margem Contribuição</span>
            <Percent className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {diagnostics.avgMarginPct > 0 ? formatPercentBRL(diagnostics.avgMarginPct) : '—'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            CMV Médio: <strong className="text-slate-800">{formatPercentBRL(diagnostics.avgCmvPct)}</strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: MATRIZ DE COBERTURA DOS 12 MESES (GRADE VISUAL MÊS A MÊS)          */}
      {/* ========================================================================= */}
      {activeTab === 'coverage' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Table className="w-5 h-5 text-emerald-600" />
                Matriz de Cobertura dos 12 Meses
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Visão consolidada mês a mês. O sistema analisa a presença de Faturamento, Vendedores, CMV e Custos Variáveis.
              </p>
            </div>
          </div>

          {/* Grid de 12 Meses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {coverage.map((m) => {
              const hasData = m.totalRevenue > 0;
              const isMissing = m.overallStatus === 'missing' || !hasData;
              const margin = m.totalRevenue > 0 ? ((m.totalRevenue - m.totalCmv - m.totalTaxes - m.totalCardFees) / m.totalRevenue) * 100 : 0;

              return (
                <div
                  key={`${m.year}-${m.monthNumber}`}
                  className={`p-4 rounded-2xl border transition relative flex flex-col justify-between ${
                    isMissing
                      ? 'bg-slate-50 border-dashed border-slate-300 opacity-90'
                      : m.overallStatus === 'complete'
                      ? 'bg-white border-emerald-200 shadow-sm ring-1 ring-emerald-500/10'
                      : 'bg-white border-amber-200 shadow-sm'
                  }`}
                >
                  <div>
                    {/* Header do Cartão do Mês */}
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-extrabold text-sm text-slate-900">
                          {m.monthName} <span className="text-slate-400 font-semibold">{m.year}</span>
                        </span>
                        <div className="text-[10px] text-slate-500">Mês {m.monthNumber.toString().padStart(2, '0')}</div>
                      </div>

                      {/* Badge de Status */}
                      {isMissing ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Ausente
                        </span>
                      ) : m.overallStatus === 'complete' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Completo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Parcial
                        </span>
                      )}
                    </div>

                    {/* Faturamento e Indicadores */}
                    {hasData ? (
                      <div className="space-y-2 mt-2 pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-slate-500">Faturamento:</span>
                          <span className="text-sm font-black text-slate-900">
                            {formatCurrencyBRL(m.totalRevenue)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1 text-[11px] bg-slate-50 p-2 rounded-xl">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-semibold">CMV Real:</span>
                            <span className="font-semibold text-slate-700">
                              {formatCurrencyBRL(m.totalCmv)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-semibold">Margem:</span>
                            <span className={`font-semibold ${margin >= 40 ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {formatPercentBRL(margin)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                          <span>{m.activeSellersCount} Vendedores</span>
                          <span>{m.filesCount} Relatórios/Arquivos</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center text-slate-400 text-xs">
                        <Calendar className="w-6 h-6 mx-auto mb-1 opacity-40" />
                        Nenhum relatório processado para este mês.
                      </div>
                    )}
                  </div>

                  {/* Ações do Mês */}
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedMonthFilter(`${m.year}-${m.monthNumber}`);
                        setActiveTab('staging');
                      }}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> Ver Registros
                    </button>

                    <button
                      onClick={() => {
                        if (fileInputRef.current) fileInputRef.current.click();
                      }}
                      className="text-[11px] text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
                    >
                      <UploadCloud className="w-3 h-3" /> Adicionar Arquivo
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: ENVIO E RECEPÇÃO DE ARQUIVOS (DRAG & DROP + LOTE)                  */}
      {/* ========================================================================= */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Zona de Drop */}
          <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 transition text-center shadow-sm relative">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".pdf,.xlsx,.xls,.csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-black text-slate-900">
              Arraste e solte múltiplos arquivos ou clique para selecionar
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
              Envie relatórios semanais de vendas em PDF, planilhas DRE em XLSX/XLS ou arquivos CSV. O motor
              reconhece automaticamente datas, filiais e equipes comerciais.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" /> Selecionar Arquivos do Computador
              </button>
            </div>

            {/* Barra de Progresso quando estiver processando */}
            {isProcessing && (
              <div className="mt-6 max-w-md mx-auto">
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Tratando e consolidando arquivos...</span>
                  <span>{processingProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Estatísticas do Lote Recebido */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Recebidos</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">{session.batchStats.receivedFiles}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-emerald-600">Auto Identificados</div>
              <div className="text-lg font-black text-emerald-700 mt-0.5">{session.batchStats.autoIdentified}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-amber-600">Revisão Necessária</div>
              <div className="text-lg font-black text-amber-700 mt-0.5">{session.batchStats.needsReview}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-indigo-600">Duplicados Descartados</div>
              <div className="text-lg font-black text-indigo-700 mt-0.5">{session.batchStats.duplicates}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-rose-600">Falhas de Leitura</div>
              <div className="text-lg font-black text-rose-700 mt-0.5">{session.batchStats.failed}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-500">Registros no Staging</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">{session.stagingRecords.length}</div>
            </div>
          </div>

          {/* Lista de Arquivos Processados */}
          {session.files.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Arquivos no Lote Atual ({session.files.length})
                </h4>
              </div>

              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {session.files.map((file) => (
                  <div key={file.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        {file.type.includes('excel') ? (
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <FileText className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{file.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{file.detectedBranch || 'Matriz'}</span>
                          <span>•</span>
                          <span>{file.detectedPeriod || 'Período não identificado'}</span>
                          {file.totalRevenue !== undefined && file.totalRevenue > 0 && (
                            <>
                              <span>•</span>
                              <strong className="text-slate-800 font-semibold">{formatCurrencyBRL(file.totalRevenue)}</strong>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {file.warning && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1" title={file.warning}>
                          <AlertTriangle className="w-3 h-3" /> Aviso
                        </span>
                      )}

                      {file.status === 'processed' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Processado ({file.recordsCount} reg.)
                        </span>
                      ) : file.status === 'duplicate' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                          Duplicado
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Revisão
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: DIAGNÓSTICO & SAZONALIDADE (FP&A INSIGHTS)                         */}
      {/* ========================================================================= */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Melhor e Pior Mês */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider">
                Extremos de Sazonalidade (12M)
              </h4>

              <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-xl">
                <div className="text-[10px] font-bold uppercase text-emerald-800 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-600" /> Melhor Mês (Pico de Vendas)
                </div>
                <div className="text-base font-black text-slate-900 mt-1">
                  {diagnostics.bestMonth.monthName} {diagnostics.bestMonth.year}
                </div>
                <div className="text-xs text-emerald-900 font-bold mt-0.5">
                  {formatCurrencyBRL(diagnostics.bestMonth.revenue)}
                </div>
              </div>

              <div className="bg-rose-50/70 border border-rose-200 p-3.5 rounded-xl">
                <div className="text-[10px] font-bold uppercase text-rose-800 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-rose-600 rotate-180" /> Pior Mês (Vale / Baixa)
                </div>
                <div className="text-base font-black text-slate-900 mt-1">
                  {diagnostics.worstMonth.monthName} {diagnostics.worstMonth.year}
                </div>
                <div className="text-xs text-rose-900 font-bold mt-0.5">
                  {formatCurrencyBRL(diagnostics.worstMonth.revenue)}
                </div>
              </div>
            </div>

            {/* Destaque de Vendas e Equipe */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider">
                Performance da Equipe
              </h4>

              <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-xl">
                <div className="text-[10px] font-bold uppercase text-blue-800 flex items-center gap-1">
                  <Users className="w-3 h-3 text-blue-600" /> Top Vendedora (12 Meses)
                </div>
                <div className="text-base font-black text-slate-900 mt-1">
                  {diagnostics.bestSeller.sellerName}
                </div>
                <div className="text-xs text-blue-900 font-bold mt-0.5">
                  {formatCurrencyBRL(diagnostics.bestSeller.totalRevenue)} ({formatPercentBRL(diagnostics.bestSeller.sharePct)} do faturamento total)
                </div>
              </div>

              <div className="bg-indigo-50/70 border border-indigo-200 p-3.5 rounded-xl">
                <div className="text-[10px] font-bold uppercase text-indigo-800 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-indigo-600" /> Unidade com Maior Volume
                </div>
                <div className="text-base font-black text-slate-900 mt-1">
                  {diagnostics.bestBranch.branchName}
                </div>
                <div className="text-xs text-indigo-900 font-bold mt-0.5">
                  {formatCurrencyBRL(diagnostics.bestBranch.totalRevenue)} ({formatPercentBRL(diagnostics.bestBranch.sharePct)} do total)
                </div>
              </div>
            </div>

            {/* Recomendações FP&A para o Consultor */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-2">
                  Diretrizes do Consultor
                </h4>
                <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Base histórica validada permite aplicar o algoritmo de 4 Níveis com precisão.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Sazonalidade capturada: Metas de Maio (Mães) e Novembro (Black Friday) serão ajustadas automaticamente.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>CMV histórico de {formatPercentBRL(diagnostics.avgCmvPct)} garante que o Ponto de Equilíbrio seja respeitado.</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setCurrentView('goals_generator')}
                className="w-full mt-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" /> Alimentar Gerador de Metas FP&A
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: REGISTROS BRUTOS EM ANÁLISE (STAGING TABLE)                         */}
      {/* ========================================================================= */}
      {activeTab === 'staging' && (
        <div className="space-y-4">
          {/* Filtros da Tabela */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-slate-700">Filtrar Mês:</span>
                <select
                  value={selectedMonthFilter}
                  onChange={(e) => setSelectedMonthFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800"
                >
                  <option value="all">Todos os Meses ({session.stagingRecords.length})</option>
                  {availableMonthsInStaging.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700">Filial:</span>
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800"
                >
                  <option value="all">Todas as Filiais</option>
                  {companyBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-slate-500 font-semibold">
              Exibindo <strong className="text-slate-900">{filteredStagingRecords.length}</strong> registros
            </div>
          </div>

          {/* Tabela de Dados Granulares */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-3">Período / Mês</th>
                    <th className="py-3 px-3">Unidade / Filial</th>
                    <th className="py-3 px-3">Vendedora</th>
                    <th className="py-3 px-3 text-right">Faturamento</th>
                    <th className="py-3 px-3 text-right">CMV</th>
                    <th className="py-3 px-3 text-right">Margem</th>
                    <th className="py-3 px-3">Origem</th>
                    <th className="py-3 px-3 text-center">Status Mês Cruzado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredStagingRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900">{r.monthName} {r.year}</span>
                        {r.weekNumber && (
                          <span className="text-[10px] text-slate-400 block">Semana {r.weekNumber}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{r.branchName || 'Matriz'}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-slate-800">
                        {r.sellerName || '— (Geral da Unidade)'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                        {formatCurrencyBRL(r.revenue)}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap text-slate-600">
                        {formatCurrencyBRL(r.cmvValor)}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span className={`font-bold ${r.margemContribuicaoPercentual >= 40 ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {formatPercentBRL(r.margemContribuicaoPercentual)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-slate-500 truncate max-w-xs" title={r.arquivoOrigem}>
                        {r.arquivoOrigem}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {r.isCrossMonth ? (
                          <button
                            onClick={() => setSelectedCrossRecord(r)}
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition"
                          >
                            Cruzado (Configurar)
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Divisão de Semana Cruzada */}
      {selectedCrossRecord && selectedCrossRecord.crossMonthDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              Alocação de Período Cruzado
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Este relatório semanal engloba dias de dois meses diferentes ({selectedCrossRecord.startDate} a {selectedCrossRecord.endDate}).
              Como deseja alocar o faturamento de {formatCurrencyBRL(selectedCrossRecord.revenue)}?
            </p>

            <div className="space-y-3 mt-4">
              <button
                onClick={() => handleApplyCrossMonthRule(selectedCrossRecord.id, 'proportional_days')}
                className="w-full text-left p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100 transition"
              >
                <div className="font-bold text-xs text-emerald-900">1. Divisão Proporcional por Dias (Recomendado)</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">
                  Divide os valores de acordo com a quantidade de dias em cada mês (ex: 4 dias no mês anterior, 3 dias no mês seguinte).
                </div>
              </button>

              <button
                onClick={() => handleApplyCrossMonthRule(selectedCrossRecord.id, 'predominant_month')}
                className="w-full text-left p-3.5 rounded-xl border border-slate-300 hover:bg-slate-50 transition"
              >
                <div className="font-bold text-xs text-slate-900">2. Alocar 100% no Mês Predominante</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Lança todo o montante no mês que teve maior número de dias da semana.
                </div>
              </button>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedCrossRecord(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
