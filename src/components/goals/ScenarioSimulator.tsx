import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Percent,
  Sliders,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Scale,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import {
  calculateScenarioSimulation,
  formatCurrency,
  formatCompactCurrency,
  formatPercent,
  getActiveLevels,
} from '../../services/financialEngine';

export const ScenarioSimulator: React.FC = () => {
  const { activeCompany, companySales, activeBranchId } = useApp();

  // Active levels
  const activeLevels = useMemo(
    () => getActiveLevels(activeCompany.levels, activeCompany.numberOfLevels),
    [activeCompany]
  );

  // Baseline revenue derived from recent weeks or editable by consultant
  const defaultBaseline = useMemo(() => {
    const branchFilteredSales = activeBranchId === 'all'
      ? companySales
      : companySales.filter((s) => s.branchId === activeBranchId);

    const recent = branchFilteredSales
      .filter((s) => s.periodNumber >= 8 && s.periodType === 'weekly')
      .reduce((sum, s) => sum + s.revenue, 0);
    const count = 5; // average over ~5 weeks
    return recent > 0 ? Math.round(recent / count) : 80000;
  }, [companySales, activeBranchId]);

  const [simBaselineRevenue, setSimBaselineRevenue] = useState<number>(defaultBaseline);
  const [customCMV, setCustomCMV] = useState<number>(activeCompany.financialSettings.cmvPercentage);
  const [customTax, setCustomTax] = useState<number>(activeCompany.financialSettings.taxPercentage);
  const [customCard, setCustomCard] = useState<number>(activeCompany.financialSettings.cardFeePercentage);
  const [customOther, setCustomOther] = useState<number>(
    activeCompany.financialSettings.otherVariableCostsPercentage
  );

  // Editable simulation levels
  const [simLevels, setSimLevels] = useState(activeLevels);

  // Keep levels in sync when activeCompany changes
  React.useEffect(() => {
    setSimLevels(getActiveLevels(activeCompany.levels, activeCompany.numberOfLevels));
    setCustomCMV(activeCompany.financialSettings.cmvPercentage);
    setCustomTax(activeCompany.financialSettings.taxPercentage);
    setCustomCard(activeCompany.financialSettings.cardFeePercentage);
    setCustomOther(activeCompany.financialSettings.otherVariableCostsPercentage);
  }, [activeCompany]);

  // Run simulation calculation
  const simulation = useMemo(() => {
    return calculateScenarioSimulation(
      simBaselineRevenue,
      simLevels,
      activeCompany.numberOfLevels,
      {
        cmvPercentage: customCMV,
        taxPercentage: customTax,
        cardFeePercentage: customCard,
        otherVariableCostsPercentage: customOther,
      }
    );
  }, [
    simBaselineRevenue,
    simLevels,
    activeCompany.numberOfLevels,
    customCMV,
    customTax,
    customCard,
    customOther,
  ]);

  // Chart data comparing Margem de Contribuição vs Faturamento por Meta
  const chartData = useMemo(() => {
    const data = [
      {
        name: 'Atual',
        Faturamento: simulation.baselineTier.revenue,
        Margem: simulation.baselineTier.margin,
        Comissão: simulation.baselineTier.commission,
        Custos: simulation.baselineTier.totalCosts - simulation.baselineTier.commission,
      },
    ];

    simulation.tiers.forEach((t) => {
      data.push({
        name: t.name,
        Faturamento: t.targetRevenue,
        Margem: t.contributionMargin,
        Comissão: t.commissionAmount,
        Custos: t.totalVariableCosts - t.commissionAmount,
      });
    });

    return data;
  }, [simulation]);

  return (
    <div id="scenario-simulator-view" className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-teal-950 p-6 rounded-2xl text-white shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-teal-500/20 border border-teal-400/30">
            <Scale className="w-5 h-5 text-teal-300" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
            FP&A & Engenharia Financeira
          </span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">
          Simulador de Cenários & Rentabilidade Incremental
        </h2>
        <p className="text-xs text-slate-300 mt-1 max-w-3xl">
          Simule o impacto de cada nível de meta no caixa da empresa. Avalie se o crescimento de
          vendas compensa os custos adicionais de comissão e mercadoria antes de aprovar a política
          comercial.
        </p>
      </div>

      {/* Sensitivity & Financial Parameters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-slate-700" />
            <span className="font-bold text-xs md:text-sm text-slate-800">
              Parâmetros de Sensibilidade da Simulação
            </span>
          </div>
          <button
            onClick={() => {
              setSimBaselineRevenue(80000);
              setCustomCMV(activeCompany.financialSettings.cmvPercentage);
              setCustomTax(activeCompany.financialSettings.taxPercentage);
              setCustomCard(activeCompany.financialSettings.cardFeePercentage);
            }}
            className="text-xs text-teal-700 hover:text-teal-800 font-semibold"
          >
            Restaurar Padrão
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Faturamento Base Atual (R$)
            </label>
            <input
              type="number"
              step="1000"
              value={simBaselineRevenue}
              onChange={(e) => setSimBaselineRevenue(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              CMV % ({customCMV}%)
            </label>
            <input
              type="number"
              step="0.5"
              value={customCMV}
              onChange={(e) => setCustomCMV(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Impostos sobre Vendas % ({customTax}%)
            </label>
            <input
              type="number"
              step="0.5"
              value={customTax}
              onChange={(e) => setCustomTax(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Taxas de Cartão % ({customCard}%)
            </label>
            <input
              type="number"
              step="0.1"
              value={customCard}
              onChange={(e) => setCustomCard(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Main Comparative Simulation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base">
              Tabela Comparativa de Cenários & Margem Incremental
            </h3>
            <p className="text-xs text-slate-500">
              Análise completa da DRE de contribuição projetada para cada nível de meta
            </p>
          </div>
          <span className="text-xs bg-teal-50 text-teal-800 border border-teal-200 font-bold px-3 py-1 rounded-full">
            {simulation.tiers.length} Níveis Ativos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-100 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-bold">Indicador Financeiro</th>
                <th className="py-3 px-4 font-bold text-right bg-slate-800">Cenário Atual</th>
                {simulation.tiers.map((t) => (
                  <th key={t.level} className="py-3 px-4 font-bold text-right">
                    {t.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {/* Faturamento */}
              <tr className="font-bold text-slate-900 bg-slate-50/50">
                <td className="py-3 px-4">Faturamento Bruto (R$)</td>
                <td className="py-3 px-4 text-right bg-slate-100/60">
                  {formatCurrency(simulation.baselineTier.revenue)}
                </td>
                {simulation.tiers.map((t) => (
                  <td key={t.level} className="py-3 px-4 text-right text-emerald-800 font-bold">
                    {formatCurrency(t.targetRevenue)}
                  </td>
                ))}
              </tr>

              {/* Crescimento R$ */}
              <tr>
                <td className="py-2.5 px-4 text-slate-600">Crescimento de Faturamento (R$)</td>
                <td className="py-2.5 px-4 text-right bg-slate-50 text-slate-400">—</td>
                {simulation.tiers.map((t) => (
                  <td key={t.level} className="py-2.5 px-4 text-right font-semibold text-emerald-700">
                    +{formatCurrency(t.revenueGrowthAmount)}
                  </td>
                ))}
              </tr>

              {/* Crescimento % */}
              <tr>
                <td className="py-2.5 px-4 text-slate-600">Crescimento de Faturamento (%)</td>
                <td className="py-2.5 px-4 text-right bg-slate-50 text-slate-400">—</td>
                {simulation.tiers.map((t) => (
                  <td key={t.level} className="py-2.5 px-4 text-right font-semibold text-emerald-700">
                    +{formatPercent(t.revenueGrowthPercentage)}
                  </td>
                ))}
              </tr>

              {/* CMV */}
              <tr>
                <td className="py-2.5 px-4 text-slate-600">(-) CMV ({customCMV}%)</td>
                <td className="py-2.5 px-4 text-right bg-slate-50 text-rose-700">
                  {formatCurrency(simulation.baselineTier.cmv)}
                </td>
                {simulation.tiers.map((t) => (
                  <td key={t.level} className="py-2.5 px-4 text-right text-rose-700">
                    {formatCurrency(t.cmvAmount)}
                  </td>
                ))}
              </tr>

              {/* Impostos */}
              <tr>
                <td className="py-2.5 px-4 text-slate-600">(-) Impostos ({customTax}%)</td>
                <td className="py-2.5 px-4 text-right bg-slate-50 text-slate-700">
                  {formatCurrency(simulation.baselineTier.taxes)}
                </td>
                {simulation.tiers.map((t) => (
                  <td key={t.level} className="py-2.5 px-4 text-right text-slate-700">
                    {formatCurrency(t.taxAmount)}
                  </td>
                ))}
              </tr>

              {/* Taxas Cartão */}
              <tr>
                <td className="py-2.5 px-4 text-slate-600">(-) Taxas de Cartão ({customCard}%)</td>
                <td className="py-2.5 px-4 text-right bg-slate-50 text-slate-700">
                  {formatCurrency(simulation.baselineTier.cardFees)}
                </td>
                {simulation.tiers.map((t) => (
                  <td key={t.level} className="py-2.5 px-4 text-right text-slate-700">
                    {formatCurrency(t.cardFeeAmount)}
                  </td>
                ))}
              </tr>

              {/* Comissão % e R$ */}
              <tr className="bg-amber-50/40">
                <td className="py-2.5 px-4 font-semibold text-amber-900">
                  (-) Comissões Totais (% e R$)
                </td>
                <td className="py-2.5 px-4 text-right bg-amber-100/50 text-amber-900 font-semibold">
                  {formatCurrency(simulation.baselineTier.commission)} (0%)
                </td>
                {simulation.tiers.map((t) => (
                  <td key={t.level} className="py-2.5 px-4 text-right text-amber-900 font-bold">
                    {formatCurrency(t.commissionAmount)} ({t.commissionPercentage}%)
                  </td>
                ))}
              </tr>

              {/* Margem de Contribuição */}
              <tr className="bg-emerald-50 font-bold text-emerald-950 border-t-2 border-emerald-300">
                <td className="py-3 px-4 text-sm">Margem de Contribuição Líquida (R$)</td>
                <td className="py-3 px-4 text-right bg-emerald-100/60 text-sm">
                  {formatCurrency(simulation.baselineTier.margin)} (
                  {simulation.baselineTier.marginPct.toFixed(1)}%)
                </td>
                {simulation.tiers.map((t) => (
                  <td key={t.level} className="py-3 px-4 text-right text-emerald-900 text-sm font-black">
                    {formatCurrency(t.contributionMargin)} ({t.contributionMarginPercentage.toFixed(1)}%)
                  </td>
                ))}
              </tr>

              {/* Margem Incremental (Destaque do Sistema) */}
              <tr className="bg-indigo-50/80 font-bold text-indigo-950 border-t border-indigo-200">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>MARGEM INCREMENTAL (vs Atual)</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right bg-indigo-100/60 text-slate-400">—</td>
                {simulation.tiers.map((t) => (
                  <td key={t.level} className="py-3 px-4 text-right font-black text-indigo-900 text-sm">
                    +{formatCurrency(t.incrementalMarginAmount)}
                    <span className="block text-[10px] text-indigo-700 font-semibold">
                      ({t.incrementalMarginPercentage.toFixed(1)}% da nova receita)
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Incremental Analysis & Consultant Decision Box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Box: "Vale a pena aumentar a comissão para buscar essa meta?" */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-800">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm md:text-base">
                Diagnóstico Consultivo: Vale a Pena Aumentar a Comissão?
              </h4>
              <p className="text-xs text-slate-500">
                Análise de ROI, absorção de custos variáveis e retorno líquido para a empresa
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {simulation.tiers.map((t) => (
              <div
                key={t.level}
                className={`p-3.5 rounded-xl border ${
                  t.isViable
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    {t.isViable ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    )}
                    {t.name}: {formatCurrency(t.targetRevenue)} ({t.commissionPercentage}% comissão)
                  </span>
                  <span className="font-extrabold text-xs">
                    Lucro Adicional: +{formatCurrency(t.incrementalMarginAmount)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 leading-relaxed mt-1">
                  {t.viabilityComment}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Chart: Comparativo de Rentabilidade Líquida */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-slate-900 text-sm md:text-base">
                Faturamento x Margem de Contribuição por Nível
              </h4>
              <p className="text-xs text-slate-500">
                Visualização do ganho real no caixa para cada degrau de meta
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => formatCompactCurrency(v)} />
                <Tooltip
                  formatter={(v: any) => [formatCurrency(Number(v)), '']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Faturamento" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Margem" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Comissão" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
