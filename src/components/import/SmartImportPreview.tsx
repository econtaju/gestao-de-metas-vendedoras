import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  Calendar,
  User,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Banknote,
  DollarSign,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Edit3,
} from 'lucide-react';
import { SmartImportPayload, ExtractedSellerRow, PaymentBreakdown } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../services/financialEngine';
import { calculateConfidenceScore } from '../../services/smartImportEngine';

interface SmartImportPreviewProps {
  payload: SmartImportPayload;
  onCancel: () => void;
  onSuccess: (count: number, period: number) => void;
}

export const SmartImportPreview: React.FC<SmartImportPreviewProps> = ({
  payload: initialPayload,
  onCancel,
  onSuccess,
}) => {
  const {
    companies,
    branches,
    sellers,
    confirmSmartImport,
    activeCompanyId,
  } = useApp();

  const [payload, setPayload] = useState<SmartImportPayload>(initialPayload);
  const [expandedSellerIdx, setExpandedSellerIdx] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Recalcular métricas de validação ao editar valores
  const recomputeValidation = (currentPayload: SmartImportPayload): SmartImportPayload => {
    const sumSellersRevenue = currentPayload.sellers.reduce((acc, s) => acc + (s.revenue || 0), 0);
    const sumSellersCount = currentPayload.sellers.reduce((acc, s) => acc + (s.salesCount || 0), 0);

    const sumPayments: PaymentBreakdown = {
      money: currentPayload.sellers.reduce((acc, s) => acc + (s.payments?.money || 0), 0),
      check: currentPayload.sellers.reduce((acc, s) => acc + (s.payments?.check || 0), 0),
      card: currentPayload.sellers.reduce((acc, s) => acc + (s.payments?.card || 0), 0),
      billet: currentPayload.sellers.reduce((acc, s) => acc + (s.payments?.billet || 0), 0),
      installment: currentPayload.sellers.reduce((acc, s) => acc + (s.payments?.installment || 0), 0),
      digital: currentPayload.sellers.reduce((acc, s) => acc + (s.payments?.digital || 0), 0),
      partialPayment: currentPayload.sellers.reduce((acc, s) => acc + (s.payments?.partialPayment || 0), 0),
    };

    const totalFromPayments =
      sumPayments.money +
      sumPayments.check +
      sumPayments.card +
      sumPayments.billet +
      sumPayments.installment +
      sumPayments.digital +
      sumPayments.partialPayment;

    const reportedTotal = currentPayload.totals.reportedTotalRevenue || sumSellersRevenue;
    const sellersDiff = Math.abs(sumSellersRevenue - reportedTotal);
    const paymentsDiff = Math.abs(totalFromPayments - reportedTotal);

    const updatedTotals = {
      ...currentPayload.totals,
      totalMoney: sumPayments.money,
      totalCheck: sumPayments.check,
      totalCard: sumPayments.card,
      totalBillet: sumPayments.billet,
      totalInstallment: sumPayments.installment,
      totalDigital: sumPayments.digital,
      totalPartialPayment: sumPayments.partialPayment,
      sumSellersRevenue,
      sumAllPayments: totalFromPayments,
      sellersDiff,
      paymentsDiff,
    };

    const updatedScore = calculateConfidenceScore({
      companyFound: !!currentPayload.header.matchedCompanyId,
      branchFound: !!currentPayload.header.matchedBranchId,
      periodFound: !!currentPayload.header.startDate && !!currentPayload.header.endDate,
      sellersCount: currentPayload.sellers.length,
      sellersIdentifiedCount: currentPayload.sellers.filter((r) => !!r.matchedSellerId).length,
      sellersDiff,
      paymentsDiff,
      allSellersValid: currentPayload.sellers.every((r) => r.isValid),
      reportedTotalRevenue: reportedTotal,
    });

    return {
      ...currentPayload,
      confidence: updatedScore,
      totals: updatedTotals,
    };
  };

  // Alterar Empresa
  const handleCompanyChange = (companyId: string) => {
    const matchedComp = companies.find((c) => c.id === companyId);
    const availableBranches = branches.filter((b) => b.companyId === companyId);
    const defaultBranch = availableBranches[0]?.id || null;

    setPayload((prev) => {
      const updated = {
        ...prev,
        header: {
          ...prev.header,
          matchedCompanyId: companyId,
          matchedCompanyName: matchedComp?.name || undefined,
          matchedBranchId: defaultBranch,
          matchedBranchName: availableBranches[0]?.name || undefined,
        },
      };
      return recomputeValidation(updated);
    });
  };

  // Alterar Filial
  const handleBranchChange = (branchId: string) => {
    const matchedB = branches.find((b) => b.id === branchId);
    setPayload((prev) => {
      const updated = {
        ...prev,
        header: {
          ...prev.header,
          matchedBranchId: branchId,
          matchedBranchName: matchedB?.name || undefined,
        },
      };
      return recomputeValidation(updated);
    });
  };

  // Alterar Datas
  const handleDateChange = (field: 'startDate' | 'endDate', val: string) => {
    setPayload((prev) => {
      const updated = {
        ...prev,
        header: {
          ...prev.header,
          [field]: val,
        },
      };
      return recomputeValidation(updated);
    });
  };

  // Atualizar linha do Vendedor
  const updateSellerRow = (idx: number, updates: Partial<ExtractedSellerRow>) => {
    setPayload((prev) => {
      const newSellers = [...prev.sellers];
      const target = { ...newSellers[idx], ...updates };

      // Se mudou pagamentos ou receita, recalcula total de pagamentos e diferença
      if (updates.payments || updates.revenue !== undefined) {
        const p = target.payments;
        const calcPay = p.money + p.check + p.card + p.billet + p.installment + p.digital + p.partialPayment;
        target.calculatedPaymentsTotal = calcPay;
        target.paymentDiff = Math.abs(calcPay - target.revenue);
        target.isValid = target.paymentDiff < 0.05;
      }

      newSellers[idx] = target;

      const updated = {
        ...prev,
        sellers: newSellers,
      };
      return recomputeValidation(updated);
    });
  };

  // Adicionar Vendedor Manual
  const handleAddSellerRow = () => {
    setPayload((prev) => {
      const newRow: ExtractedSellerRow = {
        id: `seller_${Date.now()}_${prev.sellers.length}`,
        originalName: `Novo Vendedor ${prev.sellers.length + 1}`,
        normalizedName: `novo vendedor ${prev.sellers.length + 1}`,
        matchedSellerId: null,
        matchedSellerName: undefined,
        salesCount: 1,
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
        calculatedPaymentsTotal: 0,
        paymentDiff: 0,
        isValid: true,
        validationIssues: [],
      };
      const updated = {
        ...prev,
        sellers: [...prev.sellers, newRow],
      };
      return recomputeValidation(updated);
    });
  };

  // Remover Vendedor
  const handleRemoveSellerRow = (idx: number) => {
    setPayload((prev) => {
      const newSellers = prev.sellers.filter((_, i) => i !== idx);
      const updated = {
        ...prev,
        sellers: newSellers,
      };
      return recomputeValidation(updated);
    });
  };

  // Confirmar Importação
  const handleConfirm = () => {
    setIsConfirming(true);
    try {
      const res = confirmSmartImport(payload);
      onSuccess(res.importedSalesCount, res.periodNumber);
    } catch (err: any) {
      alert(`Erro ao confirmar importação: ${err?.message || 'Tente novamente'}`);
      setIsConfirming(false);
    }
  };

  const selectedCompanyBranches = branches.filter(
    (b) => b.companyId === (payload.header.matchedCompanyId || activeCompanyId)
  );

  const selectedCompanySellers = sellers.filter(
    (s) => s.companyId === (payload.header.matchedCompanyId || activeCompanyId)
  );

  const score = payload.confidence;
  const scoreColor =
    score.score >= 95
      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
      : score.score >= 80
      ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
      : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800';

  const isMathValid =
    payload.totals.sellersDiff < 0.05 && payload.totals.paymentsDiff < 0.05;

  return (
    <div className="space-y-6">
      {/* 1. Header Card with Identification & Confidence */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                Prévia de Importação Inteligente
              </span>
              <span className="text-xs text-slate-400">ID: {payload.id}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
              Validação de Dados Extraídos
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Revise os valores extraídos pelo motor semântico antes de gravar no banco de dados.
            </p>
          </div>

          {/* Confidence Score Badge */}
          <div className={`p-4 rounded-xl border flex items-center gap-4 ${scoreColor}`}>
            <div className="text-center">
              <span className="text-xs font-medium uppercase tracking-wider block">Score Geral</span>
              <span className="text-3xl font-extrabold">{score.score}%</span>
            </div>
            <div className="border-l border-current/20 pl-4 text-xs space-y-1">
              {score.breakdown.slice(0, 4).map((b, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <span>{b.item}:</span>
                  <span className="font-semibold">{b.points}/{b.maxPoints} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Entity Mapping Form */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Empresa Cliente
            </label>
            <select
              value={payload.header.matchedCompanyId || ''}
              onChange={(e) => handleCompanyChange(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.tradeName || c.name}
                </option>
              ))}
            </select>
            {payload.header.companyName && (
              <span className="text-[11px] text-slate-400 mt-1 block truncate">
                Lido no arquivo: &ldquo;{payload.header.companyName}&rdquo;
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Filial / Unidade
            </label>
            <select
              value={payload.header.matchedBranchId || ''}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {selectedCompanyBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.type === 'headquarters' ? 'Matriz' : 'Filial'})
                </option>
              ))}
            </select>
            {payload.header.branchName && (
              <span className="text-[11px] text-slate-400 mt-1 block truncate">
                Unidade identificada: &ldquo;{payload.header.branchName}&rdquo;
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Data Início
            </label>
            <input
              type="date"
              value={payload.header.startDate || ''}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Data Término
            </label>
            <input
              type="date"
              value={payload.header.endDate || ''}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Validation Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-3 ${
              payload.totals.sellersDiff < 0.05
                ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300'
            }`}
          >
            {payload.totals.sellersDiff < 0.05 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <div>
              <p className="text-xs font-medium">Soma dos Vendedores</p>
              <p className="text-sm font-bold">
                {formatCurrency(payload.totals.sumSellersRevenue)} / {formatCurrency(payload.totals.reportedTotalRevenue)}
              </p>
              {payload.totals.sellersDiff >= 0.05 && (
                <span className="text-[11px] font-semibold text-red-600">
                  Divergência: {formatCurrency(payload.totals.sellersDiff)}
                </span>
              )}
            </div>
          </div>

          <div
            className={`p-3.5 rounded-xl border flex items-center gap-3 ${
              payload.totals.paymentsDiff < 0.05
                ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300'
            }`}
          >
            {payload.totals.paymentsDiff < 0.05 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <div>
              <p className="text-xs font-medium">Soma dos Meios de Pagamento</p>
              <p className="text-sm font-bold">
                {formatCurrency(payload.totals.sumAllPayments)}
              </p>
              {payload.totals.paymentsDiff >= 0.05 && (
                <span className="text-[11px] font-semibold text-amber-600">
                  Diferença: {formatCurrency(payload.totals.paymentsDiff)}
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total de Vendedores</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {payload.sellers.length} vendedoras
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Faturado</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {formatCurrency(payload.totals.reportedTotalRevenue)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sellers Extracted Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Vendedores e Detalhamento de Faturamento
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mapeie os nomes lidos com os vendedores cadastrados no sistema. Novos vendedores serão criados automaticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddSellerRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Vendedor
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Nome no Relatório</th>
                <th className="py-3 px-4">Vendedor no Sistema</th>
                <th className="py-3 px-4 text-center">Qtd. Vendas</th>
                <th className="py-3 px-4 text-right">Subtotal Faturado</th>
                <th className="py-3 px-4 text-center">Pagamentos</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {payload.sellers.map((sellerRow, idx) => {
                const isExpanded = expandedSellerIdx === idx;
                const paySum = sellerRow.calculatedPaymentsTotal;
                const isRowConsistent = sellerRow.isValid;

                return (
                  <React.Fragment key={sellerRow.id || idx}>
                    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-400">
                        {idx + 1}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        <input
                          type="text"
                          value={sellerRow.originalName}
                          onChange={(e) => updateSellerRow(idx, { originalName: e.target.value })}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 w-36"
                        />
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={sellerRow.matchedSellerId || 'new'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'new') {
                              updateSellerRow(idx, {
                                matchedSellerId: null,
                                matchedSellerName: undefined,
                              });
                            } else {
                              const found = selectedCompanySellers.find((s) => s.id === val);
                              updateSellerRow(idx, {
                                matchedSellerId: val,
                                matchedSellerName: found?.name || undefined,
                              });
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100"
                        >
                          <option value="new">✨ Cadastrar como novo ({sellerRow.originalName})</option>
                          {selectedCompanySellers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.role})
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="number"
                          min="0"
                          value={sellerRow.salesCount}
                          onChange={(e) =>
                            updateSellerRow(idx, { salesCount: parseInt(e.target.value, 10) || 0 })
                          }
                          className="w-16 px-2 py-1 text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100"
                        />
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                        <input
                          type="number"
                          step="0.01"
                          value={sellerRow.revenue}
                          onChange={(e) =>
                            updateSellerRow(idx, { revenue: parseFloat(e.target.value) || 0 })
                          }
                          className="w-28 px-2 py-1 text-right rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100"
                        />
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setExpandedSellerIdx(isExpanded ? null : idx)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                          <span>Detalhes</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isRowConsistent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" /> OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="w-3 h-3" /> Dif: {formatCurrency(Math.abs(paySum - sellerRow.revenue))}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveSellerRow(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="Remover linha"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Payment Breakdown Row */}
                    {isExpanded && (
                      <tr className="bg-slate-50/90 dark:bg-slate-800/40">
                        <td colSpan={8} className="p-4">
                          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700/80 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Meios de Pagamento de {sellerRow.originalName}
                              </span>
                              <span className="text-xs text-slate-500">
                                Soma dos Pagamentos: <strong>{formatCurrency(paySum)}</strong> / Subtotal: <strong>{formatCurrency(sellerRow.revenue)}</strong>
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                              {(
                                [
                                  ['money', 'Dinheiro'],
                                  ['check', 'Cheque'],
                                  ['card', 'Cartão'],
                                  ['billet', 'Boleto'],
                                  ['installment', 'Carnê'],
                                  ['digital', 'Digital / PIX'],
                                  ['partialPayment', 'Parcial'],
                                ] as const
                              ).map(([key, label]) => (
                                <div key={key}>
                                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                                    {label}
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={sellerRow.payments?.[key] || 0}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      updateSellerRow(idx, {
                                        payments: {
                                          ...sellerRow.payments,
                                          [key]: val,
                                        },
                                      });
                                    }}
                                    className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Totals Breakdown Card */}
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          Consolidação dos Meios de Pagamento do Relatório
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 text-center">
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] text-slate-400 block truncate">Dinheiro</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {formatCurrency(payload.totals.totalMoney)}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] text-slate-400 block truncate">Cheque</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {formatCurrency(payload.totals.totalCheck)}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] text-slate-400 block truncate">Cartão</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {formatCurrency(payload.totals.totalCard)}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] text-slate-400 block truncate">Boleto</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {formatCurrency(payload.totals.totalBillet)}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] text-slate-400 block truncate">Carnê</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {formatCurrency(payload.totals.totalInstallment)}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] text-slate-400 block truncate">Digital / PIX</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {formatCurrency(payload.totals.totalDigital)}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] text-slate-400 block truncate">Parcial</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {formatCurrency(payload.totals.totalPartialPayment)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Action Buttons Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Cancelar / Voltar
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            disabled={isConfirming}
            onClick={handleConfirm}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Validar & Gravar no Banco de Dados</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
