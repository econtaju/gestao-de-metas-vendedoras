import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Download,
  Wallet,
  Building2,
  Calendar,
  Layers,
  Award,
  ArrowUpRight,
  Sparkles,
  PieChart,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  formatCurrency,
  formatPercent,
  getActiveLevels,
} from '../../services/financialEngine';

export const CommissionView: React.FC = () => {
  const {
    activeCompany,
    companyBranches,
    companySellers,
    filteredSales,
    activePeriodNumber,
    activeBranchId,
    activeSellerId,
    getSellerCalculation,
  } = useApp();

  const [selectedBranch, setSelectedBranch] = useState<string>(activeBranchId);
  const [selectedSeller, setSelectedSeller] = useState<string>(activeSellerId);

  useEffect(() => {
    setSelectedBranch(activeBranchId);
  }, [activeBranchId]);

  useEffect(() => {
    setSelectedSeller(activeSellerId);
  }, [activeSellerId]);

  // Aggregated commission summary per seller for the filtered period
  const sellerCommissionSummary = useMemo(() => {
    const summaryMap: Record<
      string,
      {
        sellerId: string;
        sellerName: string;
        branchName: string;
        role: string;
        totalRevenue: number;
        target: number;
        achievedLevel: number;
        achievedLevelName: string;
        commissionPercentage: number;
        commissionAmount: number;
        marginAmount: number;
        marginPercentage: number;
      }
    > = {};

    const periodTargetsMap: Record<string, Record<number, number>> = {};

    filteredSales.forEach((sale) => {
      if (selectedBranch !== 'all' && sale.branchId !== selectedBranch) return;
      if (selectedSeller !== 'all' && sale.sellerId !== selectedSeller) return;

      const seller = companySellers.find((s) => s.id === sale.sellerId);
      const branch = companyBranches.find((b) => b.id === sale.branchId);
      const calc = getSellerCalculation(sale);

      if (!periodTargetsMap[sale.sellerId]) {
        periodTargetsMap[sale.sellerId] = {};
      }
      periodTargetsMap[sale.sellerId][sale.periodNumber] = calc.target;

      if (!summaryMap[sale.sellerId]) {
        summaryMap[sale.sellerId] = {
          sellerId: sale.sellerId,
          sellerName: seller?.name || 'Vendedor',
          branchName: branch?.name || '—',
          role: seller?.role || 'Consultor',
          totalRevenue: 0,
          target: 0,
          achievedLevel: calc.achievedLevel,
          achievedLevelName: calc.achievedLevelName,
          commissionPercentage: calc.commissionPercentage,
          commissionAmount: 0,
          marginAmount: 0,
          marginPercentage: 0,
        };
      }

      summaryMap[sale.sellerId].totalRevenue += sale.revenue;
      summaryMap[sale.sellerId].commissionAmount += calc.commissionAmount;
      summaryMap[sale.sellerId].marginAmount += calc.contributionMarginAmount;
      if (calc.achievedLevel > summaryMap[sale.sellerId].achievedLevel) {
        summaryMap[sale.sellerId].achievedLevel = calc.achievedLevel;
        summaryMap[sale.sellerId].achievedLevelName = calc.achievedLevelName;
        summaryMap[sale.sellerId].commissionPercentage = calc.commissionPercentage;
      }
    });

    // Calcula a meta total acumulada para cada vendedor
    Object.keys(summaryMap).forEach((sellerId) => {
      const targets = Object.values(periodTargetsMap[sellerId] || {});
      summaryMap[sellerId].target = targets.reduce((acc, t) => acc + t, 0);
    });

    return Object.values(summaryMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [
    filteredSales,
    selectedBranch,
    selectedSeller,
    companySellers,
    companyBranches,
    getSellerCalculation,
  ]);

  // Overall totals
  const overallTotals = useMemo(() => {
    let totalRevenue = 0;
    let totalCommission = 0;
    let totalMargin = 0;

    sellerCommissionSummary.forEach((s) => {
      totalRevenue += s.totalRevenue;
      totalCommission += s.commissionAmount;
      totalMargin += s.marginAmount;
    });

    const commissionRateOnRevenue =
      totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0;
    const marginAfterCommissionRate =
      totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCommission,
      totalMargin,
      commissionRateOnRevenue,
      marginAfterCommissionRate,
    };
  }, [sellerCommissionSummary]);

  const handleExportCSV = () => {
    const rows = [
      [
        'Vendedor',
        'Unidade',
        'Cargo',
        'Faturamento Realizado',
        'Nível Atingido',
        '% Comissão Aplicada',
        'Comissão Total R$',
        'Margem de Contribuição R$',
      ],
    ];

    sellerCommissionSummary.forEach((s) => {
      rows.push([
        s.sellerName,
        s.branchName,
        s.role,
        s.totalRevenue.toFixed(2),
        s.achievedLevelName,
        `${s.commissionPercentage}%`,
        s.commissionAmount.toFixed(2),
        s.marginAmount.toFixed(2),
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `comissoes_${activeCompany.tradeName.toLowerCase().replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getLevelBadge = (level: number, name: string) => {
    switch (level) {
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
    <div id="commissions-view" className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <Wallet className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Folha de Comissões & Apuração Comercial
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cálculo automatizado do percentual atingido sobre todo o faturamento da equipe da{' '}
            {activeCompany.tradeName}.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <Download className="w-4 h-4" />
          Exportar Folha de Comissões (CSV)
        </button>
      </div>

      {/* 4 Key Totals Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">
            Faturamento Total
          </span>
          <div className="text-xl font-bold text-slate-900">
            {formatCurrency(overallTotals.totalRevenue)}
          </div>
          <span className="text-[11px] text-slate-500">Base total da equipe</span>
        </div>

        <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200 shadow-xs">
          <span className="text-xs font-bold text-amber-900 block mb-1">Comissão Total a Pagar</span>
          <div className="text-xl font-bold text-amber-800">
            {formatCurrency(overallTotals.totalCommission)}
          </div>
          <span className="text-[11px] text-amber-700 font-medium">
            Prêmio de desempenho calculado
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">
            % Médio de Comissão
          </span>
          <div className="text-xl font-bold text-purple-700">
            {formatPercent(overallTotals.commissionRateOnRevenue, 2)}
          </div>
          <span className="text-[11px] text-slate-500">Impacto sobre faturamento</span>
        </div>

        <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200 shadow-xs">
          <span className="text-xs font-bold text-emerald-900 block mb-1">
            Margem Após Comissões
          </span>
          <div className="text-xl font-bold text-emerald-800">
            {formatCurrency(overallTotals.totalMargin)}
          </div>
          <span className="text-[11px] text-emerald-700 font-bold">
            {overallTotals.marginAfterCommissionRate.toFixed(1)}% de margem líquida
          </span>
        </div>
      </div>

      {/* Detailed Seller Payouts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-slate-800 text-sm md:text-base">
            Detalhamento Individual por Vendedor
          </h3>

          <div className="flex items-center gap-2">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-3 py-1.5 font-medium outline-none"
            >
              <option value="all">Todas as Unidades</option>
              {companyBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-100 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3.5 px-4">Vendedor</th>
                <th className="py-3.5 px-4">Unidade</th>
                <th className="py-3.5 px-4 text-right">Venda Realizada</th>
                <th className="py-3.5 px-4 text-center">Meta Atingida</th>
                <th className="py-3.5 px-4 text-right">% Comissão</th>
                <th className="py-3.5 px-4 text-right bg-slate-800">Comissão R$</th>
                <th className="py-3.5 px-4 text-right">Margem Gerada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {sellerCommissionSummary.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhum vendedor encontrado com vendas no período selecionado.
                  </td>
                </tr>
              ) : (
                sellerCommissionSummary.map((s) => (
                  <tr key={s.sellerId} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs">{s.sellerName}</div>
                      <div className="text-[10px] text-slate-500">{s.role}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{s.branchName}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(s.totalRevenue)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getLevelBadge(
                          s.achievedLevel,
                          s.achievedLevelName
                        )}`}
                      >
                        {s.achievedLevelName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-amber-700">
                      {s.commissionPercentage}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-amber-900 text-sm bg-amber-50/40">
                      {formatCurrency(s.commissionAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-800">
                      {formatCurrency(s.marginAmount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
