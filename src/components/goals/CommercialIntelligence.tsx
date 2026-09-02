import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Layers,
  Award,
  AlertTriangle,
  Building2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Edit3,
  Check,
  X,
  Info,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ComposedChart,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import {
  calculateAnnualSummary,
  calculateSeasonalityIndices,
  MONTH_NAMES,
  SeasonalityMonthData,
} from '../../services/intelligenceEngine';
import {
  formatCurrency,
  formatCompactCurrency,
  formatPercent,
} from '../../services/financialEngine';

export const CommercialIntelligence: React.FC = () => {
  const {
    activeCompany,
    companyBranches,
    companyMonthlyHistory,
    updateMonthlyRecord,
    setCurrentView,
  } = useApp();

  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const branchA = companyBranches[0] || { id: `branch-${activeCompany.id}-matriz`, name: 'Matriz' };
  const branchB = companyBranches[1] || { id: `branch-${activeCompany.id}-filial-1`, name: companyBranches.length > 1 ? companyBranches[1].name : 'Filial' };

  const [editForm, setEditForm] = useState<{
    branchAId: string;
    branchARev: number;
    branchBId: string;
    branchBRev: number;
  }>({
    branchAId: branchA.id,
    branchARev: 0,
    branchBId: branchB.id,
    branchBRev: 0,
  });

  const annualSummary = useMemo(() => {
    return calculateAnnualSummary(companyMonthlyHistory);
  }, [companyMonthlyHistory]);

  const seasonalityData = useMemo(() => {
    return calculateSeasonalityIndices(companyMonthlyHistory);
  }, [companyMonthlyHistory]);

  // Branch names mapping
  const branchMap = useMemo(() => {
    const map: Record<string, string> = {};
    companyBranches.forEach((b) => {
      map[b.id] = b.name;
    });
    if (!map[branchA.id]) map[branchA.id] = branchA.name;
    if (!map[branchB.id]) map[branchB.id] = branchB.name;
    return map;
  }, [companyBranches, branchA, branchB]);

  const branchAShare = annualSummary.branchShares[branchA.id] ?? (companyBranches.length === 1 ? 100 : 50);
  const branchBShare = annualSummary.branchShares[branchB.id] ?? (companyBranches.length === 1 ? 0 : 50);

  // Chart data preparation
  const chartData = useMemo(() => {
    return seasonalityData.map((item) => {
      const bARev = item.branchRevenues[branchA.id] || 0;
      const bBRev = item.branchRevenues[branchB.id] || 0;
      return {
        month: item.monthName.slice(0, 3),
        fullName: item.monthName,
        monthNumber: item.monthNumber,
        faturamento: item.revenue,
        mediaAnual: annualSummary.monthlyMean,
        unidadeA: bARev,
        unidadeB: bBRev,
        indiceSazonalidade: item.seasonalityIndex,
        classification: item.classification,
      };
    });
  }, [seasonalityData, annualSummary, branchA, branchB]);

  const handleStartEdit = (month: SeasonalityMonthData) => {
    setEditingMonth(month.monthNumber);
    setEditForm({
      branchAId: branchA.id,
      branchARev: month.branchRevenues[branchA.id] || 0,
      branchBId: branchB.id,
      branchBRev: month.branchRevenues[branchB.id] || 0,
    });
  };

  const handleSaveEdit = () => {
    if (editingMonth === null) return;
    const consRev = editForm.branchARev + editForm.branchBRev;
    const branchRevenues: Record<string, number> = {
      [editForm.branchAId]: editForm.branchARev,
      [editForm.branchBId]: editForm.branchBRev,
    };

    updateMonthlyRecord(activeCompany.id, editingMonth, 2025, {
      consolidatedRevenue: consRev,
      branchRevenues,
    });

    setEditingMonth(null);
  };

  return (
    <div id="commercial-intelligence-view" className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Módulo de Inteligência Histórica & Sazonalidade
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              Inteligência Comercial & Diagnóstico de Vendas
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Análise profunda do comportamento real de 2025 da {activeCompany.tradeName}.
              Identifique oscilações de sazonalidade, participação dinâmica de filiais e curvas
              históricas para fundamentar metas viáveis e rentáveis.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-goto-goals"
              onClick={() => setCurrentView('goals_generator')}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition"
            >
              <Sparkles className="w-4 h-4" />
              Gerar Metas com este Histórico
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento Anual */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Faturamento Consolidado 2025
            </span>
            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              12 meses
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatCurrency(annualSummary.totalRevenue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Média mensal de</span>
            <strong className="text-slate-800 font-semibold">
              {formatCurrency(annualSummary.monthlyMean)}
            </strong>
          </div>
        </div>

        {/* Melhor Mês vs Pior Mês */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Amplitude de Sazonalidade
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Sazonal
            </span>
          </div>
          <div className="text-xs space-y-1 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Melhor ({annualSummary.bestMonth.monthName}):
              </span>
              <strong className="text-emerald-700">
                {formatCurrency(annualSummary.bestMonth.revenue)}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                Pior ({annualSummary.worstMonth.monthName}):
              </span>
              <strong className="text-amber-700">
                {formatCurrency(annualSummary.worstMonth.revenue)}
              </strong>
            </div>
          </div>
          <div className="text-[10px] text-slate-600 mt-1.5 pt-1 border-t border-slate-100">
            Variação de{' '}
            <strong className="text-slate-700">
              {((annualSummary.bestMonth.revenue / (annualSummary.worstMonth.revenue || 1) - 1) * 100).toFixed(0)}%
            </strong>{' '}
            entre o pior e o melhor mês.
          </div>
        </div>

        {/* Médias Móveis Recentes */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Médias Recentes (Móveis)
            </span>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
              Tendência
            </span>
          </div>
          <div className="text-xs space-y-1 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Últimos 3 Meses:</span>
              <strong className="text-slate-800">
                {formatCurrency(annualSummary.recent3MonthsAvg)}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Últimos 6 Meses:</span>
              <strong className="text-slate-800">
                {formatCurrency(annualSummary.recent6MonthsAvg)}
              </strong>
            </div>
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-1.5 pt-1 border-t border-slate-100">
            Tendência recente de +{annualSummary.recentTrendPct.toFixed(1)}% no 2º semestre.
          </div>
        </div>

        {/* Participação Unidades */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Participação Unidades
            </span>
            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              Histórico
            </span>
          </div>
          <div className="text-xs space-y-1.5 mt-1">
            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-600 truncate">{branchA.name}:</span>
                <strong className="text-slate-800">{branchAShare.toFixed(1)}%</strong>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full"
                  style={{ width: `${branchAShare}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-600 truncate">{branchB.name}:</span>
                <strong className="text-slate-800">{branchBShare.toFixed(1)}%</strong>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${branchBShare}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seasonality Chart & Strategic Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Seasonality Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                Curva de Sazonalidade & Faturamento Histórico (2025)
              </h3>
              <p className="text-xs text-slate-500">
                Visualização do faturamento mês a mês comparado à média anual de{' '}
                {formatCurrency(annualSummary.monthlyMean)}.
              </p>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span>
                Mês Forte (&gt;1,05x)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block"></span>
                Mês Fraco (&lt;0,95x)
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any, name: string) => {
                    if (name === 'faturamento') return [formatCurrency(Number(value)), 'Faturamento'];
                    if (name === 'mediaAnual') return [formatCurrency(Number(value)), 'Média Anual'];
                    if (name === 'unidadeA') return [formatCurrency(Number(value)), branchA.name];
                    if (name === 'unidadeB') return [formatCurrency(Number(value)), branchB.name];
                    return [value, name];
                  }}
                  labelFormatter={(lbl) => {
                    const found = chartData.find((c) => c.month === lbl);
                    return `${found?.fullName || lbl} (Índice: ${found?.indiceSazonalidade.toFixed(2)}x)`;
                  }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <ReferenceLine
                  y={annualSummary.monthlyMean}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'Média Anual',
                    position: 'top',
                    fill: '#ef4444',
                    fontSize: 10,
                  }}
                />
                <Bar dataKey="faturamento" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.classification === 'strong'
                          ? '#10b981' // emerald-500
                          : entry.classification === 'weak'
                          ? '#f59e0b' // amber-500
                          : '#6366f1' // indigo-500
                      }
                    />
                  ))}
                </Bar>
                <Line
                  type="monotone"
                  dataKey="mediaAnual"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800">Diretriz de Planejamento Comercial:</strong> Os
              meses de <strong>Fevereiro</strong> (R$ 126k) e <strong>Dezembro</strong> (R$ 287k)
              demonstram que metas comerciais lineares geram desmotivação ou metas inalcançáveis.
              Utilize o <strong>Gerador de Metas</strong> para aplicar o índice sazonal de cada mês
              específico.
            </div>
          </div>
        </div>

        {/* Seasonal Classification Card & Confidence Level */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Confiabilidade da Análise
              </h3>
            </div>

            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-emerald-900">
                  Grau de Confiança Inicial
                </span>
                <strong className="text-xs text-emerald-800">88% (Alta)</strong>
              </div>
              <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: '88%' }} />
              </div>
              <p className="text-[11px] text-emerald-700 mt-2 leading-relaxed">
                Baseado em 1 ano completo (12 meses). O modelo atualizará automaticamente os
                pesos e a precisão da sazonalidade à medida que novos meses forem registrados.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Meses Fortes (&gt; 1,05x):</span>
                <span className="font-bold text-emerald-700">
                  {seasonalityData.filter((s) => s.classification === 'strong').length} meses
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Meses Neutros (0,95x a 1,05x):</span>
                <span className="font-bold text-indigo-700">
                  {seasonalityData.filter((s) => s.classification === 'neutral').length} meses
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Meses Fracos (&lt; 0,95x):</span>
                <span className="font-bold text-amber-700">
                  {seasonalityData.filter((s) => s.classification === 'weak').length} meses
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-5 rounded-2xl text-white shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-1">
              Participação das Filiais
            </h4>
            <div className="text-sm font-bold mt-1">
              {branchA.name} vs {branchB.name}
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              A {branchB.name} responde por <strong>{branchBShare.toFixed(1)}%</strong> do
              faturamento anual histórico, enquanto a {branchA.name} representa{' '}
              <strong>{branchAShare.toFixed(1)}%</strong>. O sistema permite calibrar metas
              proporcionais a esse histórico ou de forma equalizada.
            </p>
          </div>
        </div>
      </div>

      {/* Full Monthly Historical Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Tabela Completa de Faturamento Mensal (2025)
            </h3>
            <p className="text-xs text-slate-500">
              Valores reais consolidados e segregados por unidade com índice de sazonalidade.
            </p>
          </div>

          <span className="text-xs text-slate-500 italic">
            * Clique em "Editar" para atualizar os valores de qualquer mês.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Mês</th>
                <th className="py-3 px-4 text-right">Consolidado</th>
                <th className="py-3 px-4 text-right">{branchA.name}</th>
                <th className="py-3 px-4 text-right">{branchB.name}</th>
                <th className="py-3 px-4 text-center">Índice Sazonal</th>
                <th className="py-3 px-4 text-center">Classificação</th>
                <th className="py-3 px-4 text-right">Vs Média Anual</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {seasonalityData.map((item) => {
                const isEditing = editingMonth === item.monthNumber;
                const bARev = item.branchRevenues[branchA.id] || 0;
                const bBRev = item.branchRevenues[branchB.id] || 0;

                const bAPct = item.revenue > 0 ? (bARev / item.revenue) * 100 : 0;
                const bBPct = item.revenue > 0 ? (bBRev / item.revenue) * 100 : 0;

                return (
                  <tr
                    key={item.monthNumber}
                    className={`hover:bg-slate-50/80 transition ${
                      isEditing ? 'bg-indigo-50/60' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {item.monthName}
                    </td>

                    {/* Consolidated */}
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {isEditing ? (
                        <span className="text-indigo-700">
                          {formatCurrency(editForm.branchARev + editForm.branchBRev)}
                        </span>
                      ) : (
                        formatCurrency(item.revenue)
                      )}
                    </td>

                    {/* Branch A */}
                    <td className="py-3 px-4 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.branchARev}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              branchARev: Number(e.target.value) || 0,
                            }))
                          }
                          className="w-28 px-2 py-1 text-xs border border-indigo-300 rounded bg-white text-right"
                        />
                      ) : (
                        <div>
                          <div className="font-medium text-slate-800">
                            {formatCurrency(bARev)}
                          </div>
                          <div className="text-[10px] text-slate-600">{bAPct.toFixed(1)}%</div>
                        </div>
                      )}
                    </td>

                    {/* Branch B */}
                    <td className="py-3 px-4 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.branchBRev}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              branchBRev: Number(e.target.value) || 0,
                            }))
                          }
                          className="w-28 px-2 py-1 text-xs border border-indigo-300 rounded bg-white text-right"
                        />
                      ) : (
                        <div>
                          <div className="font-medium text-slate-800">
                            {formatCurrency(bBRev)}
                          </div>
                          <div className="text-[10px] text-slate-600">{bBPct.toFixed(1)}%</div>
                        </div>
                      )}
                    </td>

                    {/* Seasonality Index */}
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {item.seasonalityIndex.toFixed(2)}x
                    </td>

                    {/* Classification */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.classification === 'strong'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.classification === 'weak'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.classification === 'strong'
                          ? 'Forte'
                          : item.classification === 'weak'
                          ? 'Fraco'
                          : 'Neutro'}
                      </span>
                    </td>

                    {/* Vs Annual Mean */}
                    <td className="py-3 px-4 text-right font-medium">
                      <span
                        className={
                          item.pctVsMean >= 0 ? 'text-emerald-700' : 'text-amber-700'
                        }
                      >
                        {item.pctVsMean >= 0 ? `+${item.pctVsMean}%` : `${item.pctVsMean}%`}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={handleSaveEdit}
                            title="Salvar"
                            className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingMonth(null)}
                            title="Cancelar"
                            className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="text-indigo-600 hover:text-indigo-800 font-medium text-[11px] flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" /> Editar
                          </button>
                          <button
                            onClick={() => setCurrentView('goals_generator')}
                            className="text-emerald-700 hover:text-emerald-900 font-semibold text-[11px] flex items-center gap-0.5"
                          >
                            Metas <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
              <tr>
                <td className="py-3 px-4">TOTAL / MÉDIA ANUAL</td>
                <td className="py-3 px-4 text-right text-emerald-800">
                  {formatCurrency(annualSummary.totalRevenue)}
                </td>
                <td className="py-3 px-4 text-right">
                  {formatCurrency(annualSummary.branchTotals[branchA.id])}
                </td>
                <td className="py-3 px-4 text-right">
                  {formatCurrency(annualSummary.branchTotals[branchB.id])}
                </td>
                <td className="py-3 px-4 text-center">1,00x</td>
                <td className="py-3 px-4 text-center">—</td>
                <td className="py-3 px-4 text-right">
                  Média: {formatCurrency(annualSummary.monthlyMean)}
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => setCurrentView('goals_generator')}
                    className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-semibold hover:bg-emerald-700 transition shadow-xs"
                  >
                    Gerar Metas
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
