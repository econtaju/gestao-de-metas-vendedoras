import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  TrendingUp,
  Sliders,
  Calculator,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Users,
  Percent,
  BookmarkPlus,
  Zap,
} from 'lucide-react';
import {
  MonthlyMasterGoal,
  Seller,
  GoalSimulationScenario,
  Branch,
  FinancialSettings,
} from '../../types';
import { simulateGoalScenario } from '../../services/masterGoalEngine';
import { formatCurrency, formatPercent } from '../../services/financialEngine';

interface GoalSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterGoal: MonthlyMasterGoal;
  sellers: Seller[];
  branch?: Branch;
  financialSettings: FinancialSettings;
  onApplyAsOfficial: (sim: GoalSimulationScenario) => void;
  onSaveScenario: (sim: GoalSimulationScenario) => void;
}

export const GoalSimulatorModal: React.FC<GoalSimulatorModalProps> = ({
  isOpen,
  onClose,
  masterGoal,
  sellers,
  branch,
  financialSettings,
  onApplyAsOfficial,
  onSaveScenario,
}) => {
  if (!isOpen) return null;

  // Parâmetros de Simulação
  const [scenarioName, setScenarioName] = useState<string>(
    `Cenário de Crescimento - ${masterGoal.monthName}/${masterGoal.year}`
  );
  const [simulatedMonthlyTarget, setSimulatedMonthlyTarget] = useState<number>(
    Math.round(masterGoal.monthlyTarget * 1.1) // Default +10%
  );
  const [redistributionMode, setRedistributionMode] = useState<
    'proportional_others' | 'specific_sellers' | 'increase_total_target' | 'keep_over_100'
  >('proportional_others');
  const [compensateSellerId, setCompensateSellerId] = useState<string>(
    sellers[sellers.length - 1]?.id || ''
  );

  // Participações simuladas
  const [simulatedShares, setSimulatedShares] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    sellers.forEach((s) => {
      map[s.id] = s.officialSharePercentage ?? (100 / Math.max(1, sellers.length));
    });
    return map;
  });

  // Tickets médios simulados
  const [simulatedTickets, setSimulatedTickets] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    sellers.forEach((s) => {
      map[s.id] = s.averageTicket || 300;
    });
    return map;
  });

  // Handler para mudança de participação na simulação
  const handleShareChange = (sellerId: string, newShare: number) => {
    setSimulatedShares((prev) => {
      const copy = { ...prev, [sellerId]: newShare };

      if (redistributionMode === 'proportional_others') {
        const others = sellers.filter((s) => s.id !== sellerId);
        const remaining = Math.max(0, 100 - newShare);
        const currentOtherSum = others.reduce((acc, s) => acc + (copy[s.id] || 0), 0);

        others.forEach((o) => {
          if (currentOtherSum > 0) {
            copy[o.id] = Math.round(((copy[o.id] || 0) / currentOtherSum) * remaining * 10) / 10;
          } else {
            copy[o.id] = Math.round((remaining / others.length) * 10) / 10;
          }
        });
      } else if (redistributionMode === 'specific_sellers' && compensateSellerId && compensateSellerId !== sellerId) {
        const othersExceptComp = sellers.filter((s) => s.id !== sellerId && s.id !== compensateSellerId);
        const othersSum = othersExceptComp.reduce((acc, s) => acc + (copy[s.id] || 0), 0);
        const compShare = Math.max(0, 100 - newShare - othersSum);
        copy[compensateSellerId] = Math.round(compShare * 10) / 10;
      }

      return copy;
    });
  };

  // Executa o cálculo da simulação pelo motor puro (sem mutação de estado)
  const simulationResult = useMemo(() => {
    const res = simulateGoalScenario({
      originalMasterGoal: masterGoal,
      simulatedMonthlyTarget,
      sellers,
      customSellerShares: simulatedShares,
      customSellerTickets: simulatedTickets,
      financialSettings,
      redistributionMode,
      selectedSpecificSellerIds: compensateSellerId ? [compensateSellerId] : undefined,
    });
    return {
      ...res,
      name: scenarioName,
    };
  }, [
    scenarioName,
    masterGoal,
    sellers,
    simulatedMonthlyTarget,
    simulatedShares,
    simulatedTickets,
    financialSettings,
    redistributionMode,
    compensateSellerId,
  ]);

  const targetGrowthPct = Math.round(((simulatedMonthlyTarget - masterGoal.monthlyTarget) / masterGoal.monthlyTarget) * 1000) / 10;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header do Modal */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/30 text-indigo-400 rounded-lg border border-indigo-500/40">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Simulador de Metas e Viabilidade</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                  Ambiente Seguro de Simulação
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Teste hipóteses de metas e redistribuição sem alterar os dados oficiais.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Seção 1: Nome do Cenário e Meta Total Simulada */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nome do Cenário
              </label>
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Meta Mensal Simulada da Loja
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="1000"
                  value={simulatedMonthlyTarget}
                  onChange={(e) => setSimulatedMonthlyTarget(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span
                  className={`text-xs font-mono font-bold px-2 py-1.5 rounded-lg shrink-0 ${
                    targetGrowthPct >= 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {targetGrowthPct >= 0 ? `+${targetGrowthPct}%` : `${targetGrowthPct}%`}
                </span>
              </div>
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Modo de Redistribuição
              </label>
              <select
                value={redistributionMode}
                onChange={(e) => setRedistributionMode(e.target.value as any)}
                className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="proportional_others">1. Redistribuir proporcionalmente entre as outras</option>
                <option value="specific_sellers">2. Compensar em vendedora específica</option>
                <option value="increase_total_target">3. Aumentar meta total da loja</option>
              </select>
            </div>
          </div>

          {/* Seção 2: Tabela de Vendedoras Simulada */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              Impacto por Vendedora (Original vs Simulado)
            </h4>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-3">Vendedora</th>
                    <th className="py-2.5 px-3 text-center">Part. Original</th>
                    <th className="py-2.5 px-3 text-center">Part. Simulada</th>
                    <th className="py-2.5 px-3 text-right">Meta Original</th>
                    <th className="py-2.5 px-3 text-right">Meta Simulada</th>
                    <th className="py-2.5 px-3 text-right">Diferença (R$)</th>
                    <th className="py-2.5 px-3 text-right">Ticket Médio</th>
                    <th className="py-2.5 px-3 text-right">Vendas Exigidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(simulationResult?.simulatedSellers || []).map((seller) => (
                    <tr key={seller.sellerId} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {seller.sellerName}
                      </td>

                      {/* Part. Original */}
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                        {seller.originalShare.toFixed(1)}%
                      </td>

                      {/* Part. Simulada */}
                      <td className="py-2.5 px-3 text-center font-mono">
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          max="100"
                          value={seller.simulatedShare}
                          onChange={(e) =>
                            handleShareChange(seller.sellerId, parseFloat(e.target.value) || 0)
                          }
                          className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold text-center border border-purple-300 rounded bg-purple-50/50 text-purple-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </td>

                      {/* Meta Original */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {formatCurrency(seller.originalMonthlyTarget)}
                      </td>

                      {/* Meta Simulada */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(seller.simulatedMonthlyTarget)}
                      </td>

                      {/* Diferença */}
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        <span
                          className={
                            seller.targetDiffAmount >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }
                        >
                          {seller.targetDiffAmount >= 0 ? '+' : ''}
                          {formatCurrency(seller.targetDiffAmount)}
                        </span>
                      </td>

                      {/* Ticket Médio */}
                      <td className="py-2.5 px-3 text-right font-mono">
                        <input
                          type="number"
                          step="10"
                          value={seller.simulatedTicket}
                          onChange={(e) =>
                            setSimulatedTickets((prev) => ({
                              ...prev,
                              [seller.sellerId]: parseFloat(e.target.value) || 300,
                            }))
                          }
                          className="w-18 px-1.5 py-0.5 text-xs font-mono text-right border border-slate-300 rounded bg-white text-slate-800 focus:outline-none"
                        />
                      </td>

                      {/* Vendas Exigidas */}
                      <td className="py-2.5 px-3 text-right font-mono">
                        <span className="font-semibold text-slate-800">
                          {seller.simulatedRequiredSales}
                        </span>
                        {seller.salesDiff !== 0 && (
                          <span
                            className={`text-[10px] ml-1 ${
                              seller.salesDiff > 0 ? 'text-emerald-600' : 'text-slate-400'
                            }`}
                          >
                            ({seller.salesDiff > 0 ? `+${seller.salesDiff}` : seller.salesDiff})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Seção 3: Impacto Financeiro e DRE Simulado */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-600" />
              DRE Gerencial e Impacto Financeiro Simulado
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Faturamento Projetado
                </span>
                <span className="text-base font-mono font-bold text-slate-900 block mt-1">
                  {formatCurrency(simulationResult.financialImpact.revenue)}
                </span>
                <span className="text-[11px] font-mono text-emerald-600">
                  +{formatCurrency(simulationResult.financialImpact.revenueDiff)} no faturamento
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Custos + Impostos + Taxas
                </span>
                <span className="text-base font-mono font-bold text-slate-900 block mt-1">
                  {formatCurrency(
                    simulationResult.financialImpact.cmvAmount +
                      simulationResult.financialImpact.taxAmount +
                      simulationResult.financialImpact.cardFeeAmount
                  )}
                </span>
                <span className="text-[11px] text-slate-500">
                  CMV ({financialSettings.defaultCmvPercentage}%) + Imp ({financialSettings.defaultTaxPercentage}%) + Cartão ({financialSettings.defaultCardFeePercentage}%)
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Comissão da Equipe
                </span>
                <span className="text-base font-mono font-bold text-slate-900 block mt-1">
                  {formatCurrency(simulationResult.financialImpact.commissionAmount)}
                </span>
                <span className="text-[11px] text-slate-500">
                  Projetada pelo atingimento simulado
                </span>
              </div>

              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                <span className="text-[10px] text-emerald-800 uppercase font-bold block">
                  Margem de Contribuição
                </span>
                <span className="text-base font-mono font-bold text-emerald-900 block mt-1">
                  {formatCurrency(simulationResult.financialImpact.marginAmount)}
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-700">
                  {simulationResult.financialImpact.marginPct.toFixed(1)}% do Faturamento
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé com Ações Claras e Seguras */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Esta simulação não afeta as metas oficiais em vigor até que seja aplicada.</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => {
                onSaveScenario(simulationResult);
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <BookmarkPlus className="w-4 h-4" />
              Salvar Cenário
            </button>

            <button
              type="button"
              onClick={() => {
                onApplyAsOfficial(simulationResult);
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Aplicar como Nova Meta Oficial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
