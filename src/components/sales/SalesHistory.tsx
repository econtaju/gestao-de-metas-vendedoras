import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  Building2,
  User,
  Calendar,
  Layers,
  ArrowUpDown,
  PlusCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  formatCurrency,
  formatPercent,
  getActiveLevels,
} from '../../services/financialEngine';

export const SalesHistory: React.FC = () => {
  const {
    activeCompany,
    companyBranches,
    companySellers,
    companySales,
    activeBranchId,
    activeSellerId,
    deleteSale,
    setCurrentView,
    getSellerCalculation,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>(activeBranchId);
  const [selectedSeller, setSelectedSeller] = useState<string>(activeSellerId);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'period' | 'revenue' | 'margin'>('period');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    setSelectedBranch(activeBranchId);
  }, [activeBranchId]);

  useEffect(() => {
    setSelectedSeller(activeSellerId);
  }, [activeSellerId]);

  const availableSellersForDropdown = useMemo(() => {
    if (selectedBranch === 'all') return companySellers;
    return companySellers.filter((s) => s.branchId === selectedBranch);
  }, [companySellers, selectedBranch]);

  const filteredAndSortedSales = useMemo(() => {
    return companySales
      .filter((sale) => {
        if (selectedBranch !== 'all' && sale.branchId !== selectedBranch) return false;
        if (selectedSeller !== 'all' && sale.sellerId !== selectedSeller) return false;
        if (selectedPeriod !== 'all' && sale.periodNumber.toString() !== selectedPeriod)
          return false;

        if (searchQuery.trim()) {
          const seller = companySellers.find((s) => s.id === sale.sellerId);
          const branch = companyBranches.find((b) => b.id === sale.branchId);
          const q = searchQuery.toLowerCase();
          const matchesSeller = seller?.name.toLowerCase().includes(q);
          const matchesBranch = branch?.name.toLowerCase().includes(q);
          const matchesLabel = sale.periodLabel.toLowerCase().includes(q);
          if (!matchesSeller && !matchesBranch && !matchesLabel) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'period') diff = a.periodNumber - b.periodNumber;
        else if (sortBy === 'revenue') diff = a.revenue - b.revenue;
        else if (sortBy === 'margin') {
          const calcA = getSellerCalculation(a);
          const calcB = getSellerCalculation(b);
          diff = calcA.contributionMarginAmount - calcB.contributionMarginAmount;
        }
        return sortOrder === 'desc' ? -diff : diff;
      });
  }, [
    companySales,
    selectedBranch,
    selectedSeller,
    selectedPeriod,
    searchQuery,
    sortBy,
    sortOrder,
    companySellers,
    companyBranches,
    getSellerCalculation,
  ]);

  // Aggregate totals
  const totals = useMemo(() => {
    let rev = 0;
    let comm = 0;
    let cmv = 0;
    let tax = 0;
    let margin = 0;

    filteredAndSortedSales.forEach((s) => {
      const c = getSellerCalculation(s);
      rev += s.revenue;
      comm += c.commissionAmount;
      cmv += c.cmvAmount;
      tax += c.taxAmount;
      margin += c.contributionMarginAmount;
    });

    return { rev, comm, cmv, tax, margin, count: filteredAndSortedSales.length };
  }, [filteredAndSortedSales, getSellerCalculation]);

  const handleExportCSV = () => {
    const rows = [
      [
        'ID',
        'Empresa',
        'Unidade',
        'Vendedor',
        'Período',
        'Faturamento',
        'Meta',
        'Nível Atingido',
        '% Comissão',
        'Comissão R$',
        'CMV R$',
        'Impostos R$',
        'Margem de Contribuição R$',
      ],
    ];

    filteredAndSortedSales.forEach((s) => {
      const seller = companySellers.find((sel) => sel.id === s.sellerId);
      const branch = companyBranches.find((b) => b.id === s.branchId);
      const c = getSellerCalculation(s);

      rows.push([
        s.id,
        activeCompany.tradeName,
        branch?.name || '',
        seller?.name || '',
        s.periodLabel,
        s.revenue.toString(),
        s.target.toString(),
        c.achievedLevelName,
        `${c.commissionPercentage}%`,
        c.commissionAmount.toFixed(2),
        c.cmvAmount.toFixed(2),
        c.taxAmount.toFixed(2),
        c.contributionMarginAmount.toFixed(2),
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `historico_vendas_${activeCompany.tradeName.toLowerCase().replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getBadgeStyle = (level: number) => {
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
    <div id="sales-history-view" className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-700" />
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Histórico Consolidado de Vendas
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registro histórico de {totals.count} lançamentos da {activeCompany.tradeName}.
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
            onClick={() => setCurrentView('sales_entry')}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            Novo Lançamento
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por vendedor ou loja..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium outline-none"
          >
            <option value="all">Todas as Unidades</option>
            {companyBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedSeller}
            onChange={(e) => setSelectedSeller(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium outline-none"
          >
            <option value="all">Todos os Vendedores</option>
            {availableSellersForDropdown.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium outline-none"
          >
            <option value="all">Todas as Semanas</option>
            {Array.from({ length: 12 }, (_, i) => i + 1)
              .reverse()
              .map((w) => (
                <option key={w} value={w.toString()}>
                  Semana {w.toString().padStart(2, '0')}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Summary Totals Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900 text-white p-4 rounded-xl text-xs">
        <div>
          <span className="text-slate-400 block text-[10px]">Faturamento Filtrado</span>
          <span className="text-base font-bold text-emerald-400">{formatCurrency(totals.rev)}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">Comissões Totais</span>
          <span className="text-base font-bold text-amber-400">{formatCurrency(totals.comm)}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">CMV Acumulado</span>
          <span className="text-base font-semibold text-rose-300">{formatCurrency(totals.cmv)}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">Margem de Contribuição</span>
          <span className="text-base font-bold text-teal-300">{formatCurrency(totals.margin)}</span>
        </div>
      </div>

      {/* Historical Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Período</th>
                <th className="py-3 px-4">Unidade</th>
                <th className="py-3 px-4">Vendedor</th>
                <th className="py-3 px-4 text-right">Faturamento</th>
                <th className="py-3 px-4 text-center">Nível Atingido</th>
                <th className="py-3 px-4 text-right">% Comis.</th>
                <th className="py-3 px-4 text-right">Comissão R$</th>
                <th className="py-3 px-4 text-right">Margem Líquida</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredAndSortedSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Nenhum registro de venda encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredAndSortedSales.map((sale) => {
                  const seller = companySellers.find((s) => s.id === sale.sellerId);
                  const branch = companyBranches.find((b) => b.id === sale.branchId);
                  const calc = getSellerCalculation(sale);

                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {sale.periodLabel}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-600">{branch?.name || '—'}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {seller?.name || 'Vendedor'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(sale.revenue)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getBadgeStyle(
                            calc.achievedLevel
                          )}`}
                        >
                          {calc.achievedLevelName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-amber-700">
                        {calc.commissionPercentage}%
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-amber-800">
                        {formatCurrency(calc.commissionAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        {formatCurrency(calc.contributionMarginAmount)}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {calc.contributionMarginPercentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            if (window.confirm('Excluir este lançamento de venda?')) {
                              deleteSale(sale.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                          title="Excluir Lançamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
