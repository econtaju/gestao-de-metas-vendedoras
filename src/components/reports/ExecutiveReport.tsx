import React, { useMemo } from 'react';
import {
  FileText,
  Printer,
  Download,
  Building2,
  TrendingUp,
  Award,
  AlertCircle,
  CheckCircle2,
  PieChart,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  formatCurrency,
  formatPercent,
  getActiveLevels,
} from '../../services/financialEngine';

export const ExecutiveReport: React.FC = () => {
  const {
    activeCompany,
    companyBranches,
    companySellers,
    filteredSales,
    companySales,
    activePeriodNumber,
    activeBranchId,
    getSellerCalculation,
  } = useApp();

  const activeLevels = useMemo(
    () => getActiveLevels(activeCompany.levels, activeCompany.numberOfLevels),
    [activeCompany]
  );

  // Consolidation calculations for the active period
  const reportData = useMemo(() => {
    let totalRevenue = 0;
    let totalTarget = 0;
    let totalCommission = 0;
    let totalCmv = 0;
    let totalTax = 0;
    let totalCardFees = 0;
    let totalOtherCosts = 0;
    let totalMargin = 0;

    let sellersAboveTarget = 0;
    let sellersBelowTarget = 0;

    const branchBreakdown: Record<
      string,
      {
        name: string;
        revenue: number;
        target: number;
        commission: number;
        margin: number;
        sellersCount: number;
      }
    > = {};

    companyBranches.forEach((b) => {
      branchBreakdown[b.id] = {
        name: b.name,
        revenue: 0,
        target: 0,
        commission: 0,
        margin: 0,
        sellersCount: companySellers.filter((s) => s.branchId === b.id).length,
      };
    });

    filteredSales.forEach((sale) => {
      const calc = getSellerCalculation(sale);
      totalRevenue += sale.revenue;
      totalTarget += sale.target;
      totalCommission += calc.commissionAmount;
      totalCmv += calc.cmvAmount;
      totalTax += calc.taxAmount;
      totalCardFees += calc.cardFeeAmount;
      totalOtherCosts += calc.otherCostsAmount;
      totalMargin += calc.contributionMarginAmount;

      if (calc.achievedLevel >= 1) {
        sellersAboveTarget++;
      } else {
        sellersBelowTarget++;
      }

      if (branchBreakdown[sale.branchId]) {
        branchBreakdown[sale.branchId].revenue += sale.revenue;
        branchBreakdown[sale.branchId].target += sale.target;
        branchBreakdown[sale.branchId].commission += calc.commissionAmount;
        branchBreakdown[sale.branchId].margin += calc.contributionMarginAmount;
      }
    });

    // Previous period revenue for growth comparison
    const prevPeriodSales = companySales.filter(
      (s) =>
        (activeBranchId === 'all' || s.branchId === activeBranchId) &&
        s.periodNumber === (typeof activePeriodNumber === 'number' ? activePeriodNumber - 1 : 11) &&
        s.periodType === 'weekly'
    );
    const prevPeriodRevenue = prevPeriodSales.reduce((acc, s) => acc + s.revenue, 0);
    const revenueGrowth =
      prevPeriodRevenue > 0
        ? ((totalRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100
        : 0;

    const achievementPercentage = totalTarget > 0 ? (totalRevenue / totalTarget) * 100 : 0;
    const marginPercentage = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    const commissionPercentage = totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      prevPeriodRevenue,
      revenueGrowth,
      totalTarget,
      achievementPercentage,
      totalCommission,
      commissionPercentage,
      totalCmv,
      totalTax,
      totalCardFees,
      totalOtherCosts,
      totalMargin,
      marginPercentage,
      sellersAboveTarget,
      sellersBelowTarget,
      totalSellers: filteredSales.length,
      branchBreakdown: Object.values(branchBreakdown),
    };
  }, [
    filteredSales,
    companySales,
    activePeriodNumber,
    companyBranches,
    companySellers,
    getSellerCalculation,
  ]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const rows = [
      ['RELATORIO GERENCIAL EXECUTIVO - META RENTAVEL'],
      ['Empresa', activeCompany.tradeName],
      ['Período', `Semana ${activePeriodNumber}`],
      ['Data de Emissao', new Date().toLocaleDateString('pt-BR')],
      [],
      ['INDICADOR', 'VALOR R$', '% SOBRE FATURAMENTO'],
      ['(+) Faturamento Bruto', reportData.totalRevenue.toFixed(2), '100.0%'],
      ['(-) CMV', reportData.totalCmv.toFixed(2), `${activeCompany.financialSettings.cmvPercentage}%`],
      ['(-) Impostos', reportData.totalTax.toFixed(2), `${activeCompany.financialSettings.taxPercentage}%`],
      ['(-) Taxas de Cartao', reportData.totalCardFees.toFixed(2), `${activeCompany.financialSettings.cardFeePercentage}%`],
      ['(-) Outros Custos Variaveis', reportData.totalOtherCosts.toFixed(2), `${activeCompany.financialSettings.otherVariableCostsPercentage}%`],
      ['(-) Comissoes Pagas', reportData.totalCommission.toFixed(2), `${reportData.commissionPercentage.toFixed(2)}%`],
      ['(=) Margem de Contribuicao Liquida', reportData.totalMargin.toFixed(2), `${reportData.marginPercentage.toFixed(2)}%`],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `relatorio_gerencial_${activeCompany.tradeName.toLowerCase().replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="executive-report-view" className="space-y-6 pb-12 print:p-0 print:space-y-4">
      {/* Action Header - Hidden during print */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Relatório Gerencial Executivo & DRE de Contribuição
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Demonstrativo de resultado, atingimento de metas e rentabilidade consolidada para diretoria
            da {activeCompany.tradeName}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* Printable Report Document Card */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Document Letterhead */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              MetaRentável Consultoria Empresarial
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {activeCompany.tradeName}
            </h1>
            <p className="text-xs text-slate-500">
              Razão Social: {activeCompany.name} &bull; Segmento: {activeCompany.segment}
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-600">
            <div>
              <strong>Período:</strong> Semana {activePeriodNumber} / 2026
            </div>
            <div>
              <strong>Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às{' '}
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <span className="inline-block mt-1 bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
              Status: Apuração Consolidada
            </span>
          </div>
        </div>

        {/* Executive Summary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Faturamento Realizado
            </span>
            <div className="text-xl font-black text-slate-900 mt-1">
              {formatCurrency(reportData.totalRevenue)}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold mt-1">
              {reportData.revenueGrowth >= 0 ? (
                <span className="text-emerald-700 flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +{reportData.revenueGrowth.toFixed(1)}% vs
                  anterior
                </span>
              ) : (
                <span className="text-rose-600 flex items-center">
                  <ArrowDownRight className="w-3.5 h-3.5" /> {reportData.revenueGrowth.toFixed(1)}% vs
                  anterior
                </span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Atingimento da Meta Base
            </span>
            <div className="text-xl font-black text-emerald-700 mt-1">
              {reportData.achievementPercentage.toFixed(1)}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Meta: {formatCurrency(reportData.totalTarget)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Comissões Comerciais
            </span>
            <div className="text-xl font-black text-amber-700 mt-1">
              {formatCurrency(reportData.totalCommission)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {reportData.commissionPercentage.toFixed(2)}% do faturamento
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block">
              Margem de Contribuição
            </span>
            <div className="text-xl font-black text-emerald-800 mt-1">
              {formatCurrency(reportData.totalMargin)}
            </div>
            <div className="text-[11px] text-emerald-700 font-bold mt-1">
              {reportData.marginPercentage.toFixed(1)}% da receita
            </div>
          </div>
        </div>

        {/* Section: DRE Estruturado */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2">
            1. Demonstrativo de Resultado Econômico (DRE de Contribuição)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold">
                  <th className="py-2.5 px-4">Linha do Demonstrativo</th>
                  <th className="py-2.5 px-4 text-right">Valor em R$</th>
                  <th className="py-2.5 px-4 text-right">% s/ Faturamento</th>
                  <th className="py-2.5 px-4 text-left">Comentário Financeiro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                <tr className="bg-emerald-50/40 font-bold">
                  <td className="py-2.5 px-4 text-emerald-950">(+) FATURAMENTO BRUTO</td>
                  <td className="py-2.5 px-4 text-right text-emerald-900">
                    {formatCurrency(reportData.totalRevenue)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-emerald-900">100,0%</td>
                  <td className="py-2.5 px-4 text-slate-600 text-[11px]">
                    Receita total realizada pela equipe
                  </td>
                </tr>

                <tr>
                  <td className="py-2 px-4 text-rose-800">
                    (-) Custo da Mercadoria Vendida (CMV)
                  </td>
                  <td className="py-2 px-4 text-right text-rose-800">
                    -{formatCurrency(reportData.totalCmv)}
                  </td>
                  <td className="py-2 px-4 text-right text-slate-600">
                    {activeCompany.financialSettings.cmvPercentage.toFixed(1)}%
                  </td>
                  <td className="py-2 px-4 text-slate-500 text-[11px]">
                    Custo de reposição do mix de produtos
                  </td>
                </tr>

                <tr>
                  <td className="py-2 px-4 text-rose-800">(-) Impostos sobre Vendas</td>
                  <td className="py-2 px-4 text-right text-rose-800">
                    -{formatCurrency(reportData.totalTax)}
                  </td>
                  <td className="py-2 px-4 text-right text-slate-600">
                    {activeCompany.financialSettings.taxPercentage.toFixed(1)}%
                  </td>
                  <td className="py-2 px-4 text-slate-500 text-[11px]">
                    Carga tributária operacional
                  </td>
                </tr>

                <tr>
                  <td className="py-2 px-4 text-rose-800">(-) Taxas de Meios de Pagamento</td>
                  <td className="py-2 px-4 text-right text-rose-800">
                    -{formatCurrency(reportData.totalCardFees)}
                  </td>
                  <td className="py-2 px-4 text-right text-slate-600">
                    {activeCompany.financialSettings.cardFeePercentage.toFixed(1)}%
                  </td>
                  <td className="py-2 px-4 text-slate-500 text-[11px]">
                    Taxa média de cartão e parcelamento
                  </td>
                </tr>

                <tr>
                  <td className="py-2 px-4 text-rose-800">(-) Outros Custos Variáveis</td>
                  <td className="py-2 px-4 text-right text-rose-800">
                    -{formatCurrency(reportData.totalOtherCosts)}
                  </td>
                  <td className="py-2 px-4 text-right text-slate-600">
                    {activeCompany.financialSettings.otherVariableCostsPercentage.toFixed(1)}%
                  </td>
                  <td className="py-2 px-4 text-slate-500 text-[11px]">
                    Embalagens, fretes e insumos
                  </td>
                </tr>

                <tr>
                  <td className="py-2 px-4 text-amber-800 font-bold">
                    (-) Comissões Comerciais da Equipe
                  </td>
                  <td className="py-2 px-4 text-right text-amber-900 font-bold">
                    -{formatCurrency(reportData.totalCommission)}
                  </td>
                  <td className="py-2 px-4 text-right text-amber-800 font-bold">
                    {reportData.commissionPercentage.toFixed(2)}%
                  </td>
                  <td className="py-2 px-4 text-slate-500 text-[11px]">
                    Prêmio escalonado conforme atingimento de níveis
                  </td>
                </tr>

                <tr className="bg-slate-900 text-white font-bold">
                  <td className="py-3 px-4">(=) MARGEM DE CONTRIBUIÇÃO LÍQUIDA</td>
                  <td className="py-3 px-4 text-right text-emerald-400 text-sm">
                    {formatCurrency(reportData.totalMargin)}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-400">
                    {reportData.marginPercentage.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-slate-300 text-[11px]">
                    Valor livre para cobrir custos fixos e gerar lucro líquido
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section: Performance by Branch & Seller Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2">
              2. Desempenho por Unidade de Negócio
            </h3>

            <div className="space-y-2">
              {reportData.branchBreakdown.map((b) => {
                const perc = b.target > 0 ? (b.revenue / b.target) * 100 : 0;
                return (
                  <div
                    key={b.name}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{b.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {b.sellersCount} vendedores &bull; Meta: {formatCurrency(b.target)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-slate-900">{formatCurrency(b.revenue)}</div>
                      <span className="text-[10px] font-bold text-emerald-700">
                        {perc.toFixed(1)}% atingido
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2">
              3. Distribuição da Equipe nas Faixas de Meta
            </h3>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Vendedores Acima da Meta 1:</span>
                <span className="font-bold text-emerald-700">
                  {reportData.sellersAboveTarget} de {reportData.totalSellers} (
                  {((reportData.sellersAboveTarget / (reportData.totalSellers || 1)) * 100).toFixed(0)}
                  %)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Vendedores Abaixo da Meta 1:</span>
                <span className="font-bold text-amber-700">
                  {reportData.sellersBelowTarget} de {reportData.totalSellers}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                <strong>Parecer da Consultoria:</strong> A estrutura de metas atual apresenta
                aderência saudável. A margem de contribuição média de{' '}
                <strong>{reportData.marginPercentage.toFixed(1)}%</strong> preserva plenamente o ponto
                de equilíbrio financeiro da empresa.
              </div>
            </div>
          </div>
        </div>

        {/* Footer Signature Block */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
          <div>
            <div className="border-t border-slate-300 w-48 mx-auto pt-1 font-bold text-slate-800">
              Consultoria Comercial & FP&A
            </div>
            <span className="text-[10px]">MetaRentável Sistemas</span>
          </div>

          <div>
            <div className="border-t border-slate-300 w-48 mx-auto pt-1 font-bold text-slate-800">
              Diretoria Executiva
            </div>
            <span className="text-[10px]">{activeCompany.tradeName}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
