import React, { useMemo } from 'react';
import {
  DollarSign,
  Target,
  TrendingUp,
  Percent,
  AlertCircle,
  Award,
  Wallet,
  ArrowUpRight,
  Sparkles,
  PieChart as PieIcon,
  Layers,
  ChevronRight,
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
  AreaChart,
  Area,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import {
  formatCurrency,
  formatCompactCurrency,
  formatPercent,
  getActiveLevels,
  calculateSalePerformance,
} from '../../services/financialEngine';

export const DashboardView: React.FC = () => {
  const {
    activeCompany,
    companyBranches,
    companySellers,
    filteredSales,
    companySales,
    activePeriodNumber,
    activePeriodType,
    activeBranchId,
    setCurrentView,
    getSellerCalculation,
    masterGoals,
  } = useApp();

  const activeLevels = useMemo(
    () => getActiveLevels(activeCompany.levels, activeCompany.numberOfLevels),
    [activeCompany]
  );

  // Calcula a meta total do período filtrado com base nas Metas Mestre do FP&A
  const totalTargetFromMasterGoals = useMemo(() => {
    const year = 2026;
    const targetBranches = activeBranchId === 'all' 
      ? companyBranches 
      : companyBranches.filter(b => b.id === activeBranchId);
      
    let sumTarget = 0;
    
    if (activePeriodType === 'monthly') {
      if (activePeriodNumber === 'all') {
        targetBranches.forEach(branch => {
          for (let m = 1; m <= 12; m++) {
            const key = `${activeCompany.id}-${branch.id}-${year}-${m}`;
            const mGoal = masterGoals[key];
            if (mGoal) {
              sumTarget += mGoal.monthlyTarget;
            } else {
              sumTarget += activeCompany?.levels?.[0]?.revenueTarget || 30000;
            }
          }
        });
      } else {
        const monthNum = activePeriodNumber;
        targetBranches.forEach(branch => {
          const key = `${activeCompany.id}-${branch.id}-${year}-${monthNum}`;
          const mGoal = masterGoals[key];
          if (mGoal) {
            sumTarget += mGoal.monthlyTarget;
          } else {
            sumTarget += activeCompany?.levels?.[0]?.revenueTarget || 30000;
          }
        });
      }
    } else {
      if (activePeriodNumber === 'all') {
        const activeMonths = [1, 2, 3];
        targetBranches.forEach(branch => {
          activeMonths.forEach(monthNum => {
            const key = `${activeCompany.id}-${branch.id}-${year}-${monthNum}`;
            const mGoal = masterGoals[key];
            if (mGoal) {
              sumTarget += mGoal.monthlyTarget;
            } else {
              sumTarget += activeCompany?.levels?.[0]?.revenueTarget || 0;
            }
          });
        });
      } else {
        const weekNum = activePeriodNumber;
        let monthNum = 1;
        let weekIndexInMonth = weekNum - 1;
        
        if (weekNum >= 1 && weekNum <= 4) {
          monthNum = 1;
          weekIndexInMonth = weekNum - 1;
        } else if (weekNum >= 5 && weekNum <= 8) {
          monthNum = 2;
          weekIndexInMonth = weekNum - 5;
        } else if (weekNum >= 9 && weekNum <= 12) {
          monthNum = 3;
          weekIndexInMonth = weekNum - 9;
        } else {
          monthNum = Math.ceil(weekNum / 4);
          weekIndexInMonth = (weekNum - 1) % 4;
        }
        
        targetBranches.forEach(branch => {
          const key = `${activeCompany.id}-${branch.id}-${year}-${monthNum}`;
          const mGoal = masterGoals[key];
          if (mGoal && mGoal.weeks && mGoal.weeks[weekIndexInMonth]) {
            sumTarget += mGoal.weeks[weekIndexInMonth].revenueTarget;
          } else {
            sumTarget += (activeCompany?.levels?.[0]?.revenueTarget || 0) / 4;
          }
        });
      }
    }
    return sumTarget;
  }, [activeCompany?.id, activeBranchId, activePeriodType, activePeriodNumber, companyBranches, masterGoals, activeCompany?.levels]);

  // Consolidated financial aggregations for the filtered period
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalCommission = 0;
    let totalCMV = 0;
    let totalTax = 0;
    let totalCard = 0;
    let totalOther = 0;
    let totalMargin = 0;

    filteredSales.forEach((sale) => {
      const calc = getSellerCalculation(sale);
      totalRevenue += sale.revenue;
      totalCommission += calc.commissionAmount;
      totalCMV += calc.cmvAmount;
      totalTax += calc.taxAmount;
      totalCard += calc.cardFeeAmount;
      totalOther += calc.otherCostsAmount;
      totalMargin += calc.contributionMarginAmount;
    });

    const totalTarget = totalTargetFromMasterGoals;
    const totalCosts = totalCMV + totalTax + totalCard + totalOther + totalCommission;
    const achievementPct = totalTarget > 0 ? (totalRevenue / totalTarget) * 100 : 0;
    const gapToMeta1 = Math.max(0, totalTarget - totalRevenue);
    const marginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    // Run-rate projection (assuming 7-day week, 5.5 days elapsed average)
    const runRateMultiplier = 1.15;
    const projectedRevenue = totalRevenue * runRateMultiplier;
    const projectedCommission = totalCommission * runRateMultiplier;
    const projectedCMV = totalCMV * runRateMultiplier;
    const projectedTax = totalTax * runRateMultiplier;
    const projectedCard = totalCard * runRateMultiplier;
    const projectedMargin = totalMargin * runRateMultiplier;

    // Incremental margin vs baseline (last week or baseline 90%)
    const baselineRev = totalRevenue * 0.85;
    const baselineCosts =
      baselineRev *
      ((activeCompany.financialSettings.cmvPercentage +
        activeCompany.financialSettings.taxPercentage +
        activeCompany.financialSettings.cardFeePercentage +
        1.3) /
        100);
    const baselineMargin = baselineRev - baselineCosts;
    const incrementalMargin = Math.max(0, totalMargin - baselineMargin);

    return {
      totalRevenue,
      totalTarget,
      achievementPct,
      gapToMeta1,
      totalCommission,
      totalCMV,
      totalTax,
      totalCard,
      totalOther,
      totalCosts,
      totalMargin,
      marginPct,
      projectedRevenue,
      projectedCommission,
      projectedCMV,
      projectedTax,
      projectedCard,
      projectedMargin,
      incrementalMargin,
    };
  }, [filteredSales, activeLevels, activeCompany, getSellerCalculation]);

  // Chart 1: Seller Ranking & Achieved Levels
  const sellerRankingData = useMemo(() => {
    const map: Record<string, { seller: string; revenue: number; target: number; level: number; levelName: string; commission: number }> = {};

    filteredSales.forEach((sale) => {
      const seller = companySellers.find((s) => s.id === sale.sellerId);
      const name = seller?.name || 'Vendedor';
      const calc = getSellerCalculation(sale);

      if (!map[sale.sellerId]) {
        map[sale.sellerId] = {
          seller: name,
          revenue: 0,
          target: calc.target,
          level: calc.achievedLevel,
          levelName: calc.achievedLevelName,
          commission: 0,
        };
      }
      map[sale.sellerId].revenue += sale.revenue;
      map[sale.sellerId].commission += calc.commissionAmount;
      map[sale.sellerId].level = Math.max(map[sale.sellerId].level, calc.achievedLevel);
      map[sale.sellerId].levelName = calc.achievedLevelName;
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, companySellers, activeLevels, getSellerCalculation]);

  // Chart 2: 12-Week Historical Evolution Trend
  const timelineData = useMemo(() => {
    const weeksMap: Record<number, { week: string; revenue: number; target: number; meta1: number; meta2: number; meta3: number; meta4: number }> = {};

    // Group all company sales by periodNumber
    companySales
      .filter((s) => s.periodType === activePeriodType)
      .forEach((sale) => {
        // apply unit filter if selected
        if (activeBranchId !== 'all' && sale.branchId !== activeBranchId) return;

        const w = sale.periodNumber;
        const calc = getSellerCalculation(sale);
        if (!weeksMap[w]) {
          weeksMap[w] = {
            week: `Sem ${w.toString().padStart(2, '0')}`,
            revenue: 0,
            target: 0,
            meta1: (activeLevels[0]?.revenueTarget || 30000) * (activeBranchId === 'all' ? companySellers.length : 3),
            meta2: (activeLevels[1]?.revenueTarget || 33000) * (activeBranchId === 'all' ? companySellers.length : 3),
            meta3: (activeLevels[2]?.revenueTarget || 36000) * (activeBranchId === 'all' ? companySellers.length : 3),
            meta4: (activeLevels[3]?.revenueTarget || 40000) * (activeBranchId === 'all' ? companySellers.length : 3),
          };
        }
        weeksMap[w].revenue += sale.revenue;
        weeksMap[w].target += calc.target;
      });

    return Object.entries(weeksMap)
      .map(([w, data]) => ({ weekNum: Number(w), ...data }))
      .sort((a, b) => a.weekNum - b.weekNum);
  }, [companySales, activePeriodType, activeBranchId, activeLevels, companySellers]);

  // Chart 3: Profitability DRE Breakdown (Waterfall style bar chart)
  const dreBreakdownData = useMemo(() => {
    return [
      { name: 'Faturamento Bruto', valor: metrics.totalRevenue, fill: '#0ea5e9' },
      { name: '(-) CMV', valor: metrics.totalCMV, fill: '#f43f5e' },
      { name: '(-) Impostos', valor: metrics.totalTax, fill: '#fb7185' },
      { name: '(-) Taxas Cartão', valor: metrics.totalCard, fill: '#fb923c' },
      { name: '(-) Comissões', valor: metrics.totalCommission, fill: '#f59e0b' },
      { name: '(=) Margem Contrib.', valor: metrics.totalMargin, fill: '#10b981' },
    ];
  }, [metrics]);

  // Chart 4: Branch vs Branch Comparison (Matriz vs Filiais)
  const branchComparisonData = useMemo(() => {
    return companyBranches.map((branch) => {
      const branchSales = filteredSales.filter((s) => s.branchId === branch.id);
      let rev = 0;
      let margin = 0;
      let comm = 0;

      branchSales.forEach((s) => {
        const c = getSellerCalculation(s);
        rev += s.revenue;
        margin += c.contributionMarginAmount;
        comm += c.commissionAmount;
      });

      return {
        name: branch.name.replace(' - Shopping Flamboyant', '').replace(' - Av. Goiás', ''),
        type: branch.type === 'headquarters' ? 'Matriz' : 'Filial',
        Faturamento: rev,
        Margem: margin,
        Comissões: comm,
      };
    });
  }, [companyBranches, filteredSales, getSellerCalculation]);

  // Helper for level badge color
  const getLevelColor = (lvl: number) => {
    switch (lvl) {
      case 4:
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 3:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 2:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 1:
        return 'bg-teal-100 text-teal-800 border-teal-300';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-300';
    }
  };

  return (
    <div id="dashboard-view-container" className="space-y-6 pb-12">
      {/* Top Banner with Quick Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 p-5 rounded-2xl text-white shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider">
              Painel de Desempenho Executivo
            </span>
            <span className="text-xs text-slate-400">
              {activePeriodNumber === 'all'
                ? 'Histórico Completo'
                : `Semana ${activePeriodNumber.toString().padStart(2, '0')} de 2026`}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mt-1">
            Gestão Comercial & Rentabilidade Líquida
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Acompanhamento de vendas, atingimento de metas em {activeCompany.numberOfLevels} níveis,
            comissões incidentes e margem de contribuição.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="dash-btn-intelligence"
            onClick={() => setCurrentView('commercial_intelligence')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Inteligência 2025
          </button>
          <button
            id="dash-btn-goal-gen"
            onClick={() => setCurrentView('goals_generator')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow transition"
          >
            <Target className="w-3.5 h-3.5" />
            Gerador de Metas
          </button>
          <button
            id="dash-btn-simulator"
            onClick={() => setCurrentView('simulator')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-xl text-xs font-semibold transition border border-slate-600"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Simulador
          </button>
        </div>
      </div>

      {/* 11 Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5">
        {/* Card 1: Faturamento Atual */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Faturamento Realizado</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(metrics.totalRevenue)}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>{metrics.achievementPct.toFixed(1)}% da Meta 1</span>
          </div>
        </div>

        {/* Card 2: Meta Total */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Meta Base (Nível 1)</span>
            <Target className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(metrics.totalTarget)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {activeLevels.length} faixas de premiação
          </div>
        </div>

        {/* Card 3: % Atingimento */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">% Atingimento</span>
            <Percent className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-lg md:text-xl font-bold text-purple-700 tracking-tight">
            {formatPercent(metrics.achievementPct)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {metrics.achievementPct >= 100 ? 'Meta Base Superada' : 'Em progresso'}
          </div>
        </div>

        {/* Card 4: Falta para Meta 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Falta p/ Meta 1</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg md:text-xl font-bold text-amber-700 tracking-tight">
            {metrics.gapToMeta1 === 0 ? 'Concluída!' : formatCurrency(metrics.gapToMeta1)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {metrics.gapToMeta1 === 0 ? 'Buscando Meta 2+' : 'Gap a realizar'}
          </div>
        </div>

        {/* Card 5: Projeção de Fechamento */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Projeção Fechamento</span>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(metrics.projectedRevenue)}
          </div>
          <div className="text-[11px] text-teal-600 font-medium mt-1">
            +15% no ritmo atual
          </div>
        </div>

        {/* Card 6: Comissão Total */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Comissão Calculada</span>
            <Wallet className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg md:text-xl font-bold text-amber-800 tracking-tight">
            {formatCurrency(metrics.totalCommission)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {metrics.totalRevenue > 0
              ? `${((metrics.totalCommission / metrics.totalRevenue) * 100).toFixed(2)}% do faturamento`
              : '0%'}
          </div>
        </div>

        {/* Card 7: CMV Projetado */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">CMV ({activeCompany.financialSettings.cmvPercentage}%)</span>
            <span className="text-[10px] text-rose-500 font-bold">Custo Mercadoria</span>
          </div>
          <div className="text-base md:text-lg font-bold text-rose-700 tracking-tight">
            {formatCurrency(metrics.totalCMV)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Base: {formatCurrency(metrics.totalRevenue)}
          </div>
        </div>

        {/* Card 8: Impostos */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Impostos ({activeCompany.financialSettings.taxPercentage}%)</span>
            <span className="text-[10px] text-slate-500 font-bold">Tributação</span>
          </div>
          <div className="text-base md:text-lg font-bold text-slate-800 tracking-tight">
            {formatCurrency(metrics.totalTax)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Simples / Presumido
          </div>
        </div>

        {/* Card 9: Taxas de Cartão */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Taxas Cartão ({activeCompany.financialSettings.cardFeePercentage}%)</span>
            <span className="text-[10px] text-slate-500 font-bold">Adquirentes</span>
          </div>
          <div className="text-base md:text-lg font-bold text-slate-800 tracking-tight">
            {formatCurrency(metrics.totalCard)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Crédito, Débito e Pix
          </div>
        </div>

        {/* Card 10: Margem de Contribuição (R$ e %) */}
        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-xs font-bold">Margem de Contribuição</span>
            <span className="text-xs bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.5 rounded">
              {metrics.marginPct.toFixed(1)}%
            </span>
          </div>
          <div className="text-lg md:text-xl font-bold text-emerald-800 tracking-tight">
            {formatCurrency(metrics.totalMargin)}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            Após todos os custos variáveis
          </div>
        </div>

        {/* Card 11: Margem Incremental */}
        <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-2xs">
          <div className="flex items-center justify-between text-blue-800 mb-1">
            <span className="text-xs font-bold">Margem Incremental</span>
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg md:text-xl font-bold text-blue-800 tracking-tight">
            {formatCurrency(metrics.incrementalMargin)}
          </div>
          <div className="text-[11px] text-blue-700 font-medium mt-1">
            Lucro adicional gerado
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Evolução Temporal de Vendas com Níveis de Meta */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm md:text-base">
                Evolução Temporal de Vendas (Histórico 12 Semanas)
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhamento do faturamento real semana a semana vs Linhas de Meta
              </p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 font-medium px-2.5 py-1 rounded-lg">
              Semanal
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => formatCompactCurrency(v)} />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value)), '']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="revenue" name="Faturamento Real" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                <Line type="monotone" dataKey="meta1" name="Meta 1" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                {activeLevels.length >= 2 && (
                  <Line type="monotone" dataKey="meta2" name="Meta 2" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="2 2" dot={false} />
                )}
                {activeLevels.length >= 4 && (
                  <Line type="monotone" dataKey="meta4" name="Meta 4 (Teto)" stroke="#ec4899" strokeWidth={1.5} strokeDasharray="2 2" dot={false} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Ranking de Vendedores e Níveis Atingidos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm md:text-base">
                  Ranking Comercial & Nível de Meta Atingido
                </h3>
                <p className="text-xs text-slate-500">
                  Desempenho individual, comissão calculada e faixa alcançada
                </p>
              </div>
              <button
                onClick={() => setCurrentView('sellers')}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
              >
                Ver Equipe <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 mt-4">
              {sellerRankingData.map((item, idx) => {
                const pct = (item.revenue / item.target) * 100;
                return (
                  <div key={item.seller} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-xs text-slate-800">{item.seller}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getLevelColor(item.level)}`}>
                          {item.levelName}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-xs text-slate-900">{formatCurrency(item.revenue)}</div>
                        <div className="text-[10px] text-amber-700 font-semibold">
                          Comissão: {formatCurrency(item.commission)}
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.level >= 3
                            ? 'bg-purple-600'
                            : item.level >= 1
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chart 3: DRE Gerencial / Waterfall de Rentabilidade */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm md:text-base">
                Decomposição Financeira (DRE de Contribuição)
              </h3>
              <p className="text-xs text-slate-500">
                Faturamento (-) Custos Variáveis (-) Comissões = Margem Líquida
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dreBreakdownData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-15} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => formatCompactCurrency(v)} />
                <Tooltip
                  formatter={(v: any) => [formatCurrency(Number(v)), 'Valor']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                  {dreBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Matriz x Filial Comparison */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm md:text-base">
                Comparativo Unidades: Matriz vs Filiais
              </h3>
              <p className="text-xs text-slate-500">
                Distribuição de faturamento, margem e comissões por loja
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => formatCompactCurrency(v)} />
                <Tooltip
                  formatter={(v: any) => [formatCurrency(Number(v)), '']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Faturamento" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Margem" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Comissões" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
