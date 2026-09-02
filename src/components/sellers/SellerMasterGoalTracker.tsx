import React, { useState } from 'react';
import {
  Target,
  Calendar,
  DollarSign,
  TrendingUp,
  Award,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Calculator,
  Percent,
  Clock,
  ArrowUpRight,
  Phone,
  Printer,
  FileCheck,
} from 'lucide-react';
import { Seller, SellerGoalDetail } from '../../types';
import { formatCurrency, formatPercent } from '../../services/financialEngine';
import { SellerGoalCardModal } from '../goals/SellerGoalCardModal';
import { useApp } from '../../context/AppContext';

interface SellerMasterGoalTrackerProps {
  seller: Seller;
  goalDetail: SellerGoalDetail | null;
}

export const SellerMasterGoalTracker: React.FC<SellerMasterGoalTrackerProps> = ({
  seller,
  goalDetail,
}) => {
  const { activeCompany, companyBranches } = useApp();
  // Simulador local do vendedor
  const [simulatedExtraSales, setSimulatedExtraSales] = useState<number>(0);
  const [simulatedTicket, setSimulatedTicket] = useState<number>(seller.averageTicket || 300);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  if (!goalDetail) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-slate-500">
        Nenhuma meta oficial configurada para esta filial no período.
      </div>
    );
  }

  const weeklyList = goalDetail.weeklyGoals || goalDetail.weeklyBreakdown || [];
  const monthlyTarget = goalDetail.monthlyTarget || 0;
  const realizedRevenue = goalDetail.realizedRevenue || 0;
  const achievementPercentage = goalDetail.achievementPercentage || 0;
  const officialShare = goalDetail.officialSharePercentage ?? 25;
  const unitTarget = goalDetail.unitMonthlyTarget || monthlyTarget;
  const projectedRevenue = goalDetail.projectedRevenue || realizedRevenue;
  const estimatedCommission = goalDetail.estimatedCommissionAmount || 0;
  const requiredSales = goalDetail.requiredSalesCount ?? goalDetail.requiredSalesTotal ?? 0;
  const salesCount = goalDetail.salesCount ?? goalDetail.totalSalesCount ?? 0;
  const branchObj = companyBranches.find((b) => b.id === seller.branchId);

  const extraRevenue = simulatedExtraSales * simulatedTicket;
  const simulatedTotalRev = realizedRevenue + extraRevenue;
  const simulatedAchievement =
    monthlyTarget > 0 ? (simulatedTotalRev / monthlyTarget) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* 1. Card Principal de Metas da Vendedora */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 text-xs font-bold bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-400/30">
                Participação na Unidade: {officialShare.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">
                (Meta da Loja: {formatCurrency(unitTarget)})
              </span>
            </div>
            <h3 className="text-2xl font-bold text-white mt-2">
              {formatCurrency(monthlyTarget)}
            </h3>
            <p className="text-xs text-slate-400">
              Meta Mensal Individual Oficial • {goalDetail.monthName || 'Setembro'}/{goalDetail.year || 2026}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-md cursor-pointer shrink-0"
            >
              <FileCheck className="w-4 h-4" />
              <span>Gerar Relatório (PDF / WhatsApp)</span>
            </button>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 backdrop-blur-sm">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Realizado</span>
                <span className="text-sm font-mono font-bold text-emerald-400">
                  {formatCurrency(realizedRevenue)}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">
                  {achievementPercentage.toFixed(1)}% atingido
                </span>
              </div>

              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 backdrop-blur-sm">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Projeção</span>
                <span className="text-sm font-mono font-bold text-indigo-300">
                  {formatCurrency(projectedRevenue)}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">
                  {((projectedRevenue / Math.max(1, monthlyTarget)) * 100).toFixed(1)}% projetado
                </span>
              </div>

              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 backdrop-blur-sm col-span-2 sm:col-span-1">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Comissão Est.</span>
                <span className="text-sm font-mono font-bold text-amber-300">
                  {formatCurrency(estimatedCommission)}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">
                  Regra: {goalDetail.commissionRuleType === 'weekly' ? 'Semanal' : 'Mensal'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Progresso Mensal */}
        <div className="mt-6 pt-5 border-t border-white/10">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-300 font-semibold">Progresso da Meta Mensal:</span>
            <span className="font-mono font-bold text-emerald-400">
              {achievementPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, achievementPercentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Semanas Comerciais da Vendedora */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-800">
              Desdobramento Semanal Individual
            </h4>
          </div>
          <span className="text-xs text-slate-500">
            Fórmula: Meta Mensal (R$ {monthlyTarget.toLocaleString('pt-BR')}) × Peso da Semana (%)
          </span>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {weeklyList.map((week) => {
              const weekTarget = week.revenueTarget || 0;
              const weekRealized = week.realizedRevenue || 0;
              const weekPct = week.achievementPercentage || 0;
              const isHit = weekPct >= 100;

              return (
                <div
                  key={week.weekNumber}
                  className={`p-4 rounded-xl border transition-all ${
                    isHit
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                        S{week.weekNumber}
                      </span>
                      <span>Semana {week.weekNumber}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">
                      Peso {week.weightPercentage}%
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 font-medium mb-1">
                    Meta: <strong className="text-slate-900 font-mono">{formatCurrency(weekTarget)}</strong>
                  </div>

                  <div className="text-xs text-slate-500 font-medium mb-2">
                    Realizado: <strong className="text-emerald-700 font-mono">{formatCurrency(weekRealized)}</strong>
                  </div>

                  {/* Barra Semanal */}
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isHit ? 'bg-emerald-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${Math.min(100, weekPct)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Atingimento:</span>
                    <span className={`font-bold ${isHit ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {weekPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Métricas Operacionais e Simulador */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Painel Operacional: Ticket Médio e Vendas Necessárias */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Calculator className="w-4 h-4 text-purple-600" />
            <h4 className="text-sm font-bold text-slate-800">Métricas Operacionais para a Meta</h4>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
              <span className="text-[10px] uppercase font-bold text-purple-800 block">
                Ticket Médio Cadastrado
              </span>
              <span className="text-lg font-mono font-bold text-purple-900 mt-1 block">
                {formatCurrency(goalDetail.averageTicket || seller.averageTicket || 0)}
              </span>
              <span className="text-[10px] text-purple-700">Média individual</span>
            </div>

            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
              <span className="text-[10px] uppercase font-bold text-indigo-800 block">
                Total de Vendas Exigido
              </span>
              <span className="text-lg font-mono font-bold text-indigo-900 mt-1 block">
                {requiredSales} atendimentos
              </span>
              <span className="text-[10px] text-indigo-700">
                ~{Math.ceil(requiredSales / Math.max(1, weeklyList.length))} por semana
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Vendas já realizadas:</span>
              <span className="font-mono font-bold text-slate-900">
                {salesCount} vendas
              </span>
            </div>
            <div className="flex justify-between">
              <span>Vendas restantes para bater a meta:</span>
              <span className="font-mono font-bold text-indigo-700">
                {Math.max(0, requiredSales - salesCount)} vendas
              </span>
            </div>
          </div>
        </div>

        {/* Simulador Interativo Individual */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-bold text-slate-800">Simulador de Aceleração Individual</h4>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Vendas Extras Simuladas:</span>
                <span className="font-mono text-indigo-700 font-bold">+{simulatedExtraSales} vendas</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={simulatedExtraSales}
                onChange={(e) => setSimulatedExtraSales(parseInt(e.target.value, 10) || 0)}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Ticket Médio Simulado:</span>
                <span className="font-mono text-indigo-700 font-bold">{formatCurrency(simulatedTicket)}</span>
              </div>
              <input
                type="range"
                min="100"
                max="1000"
                step="20"
                value={simulatedTicket}
                onChange={(e) => setSimulatedTicket(parseInt(e.target.value, 10) || 300)}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
            <div>
              <span className="block font-bold">Faturamento Simulado:</span>
              <span className="font-mono text-sm font-extrabold text-emerald-800">
                {formatCurrency(simulatedTotalRev)}
              </span>
            </div>
            <div className="text-right">
              <span className="block font-bold">Novo Atingimento:</span>
              <span className="font-mono text-sm font-extrabold text-emerald-800">
                {simulatedAchievement.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Relatório e Contrato Individual */}
      {isReportModalOpen && (
        <SellerGoalCardModal
          isOpen={true}
          onClose={() => setIsReportModalOpen(false)}
          seller={{
            sellerId: seller.id,
            sellerName: seller.name,
            officialSharePercentage: officialShare,
            seniorityLevel: seller.seniorityLevel,
          }}
          sellerEntity={seller}
          company={activeCompany}
          branchName={branchObj?.name || 'Unidade Principal'}
          monthName={goalDetail.monthName || 'Setembro'}
          year={goalDetail.year || 2026}
          monthlyTarget={unitTarget}
          weeks={weeklyList.map((w) => ({
            weekNumber: w.weekNumber,
            label: w.label || `Semana ${w.weekNumber}`,
            startDate: w.startDate || '',
            endDate: w.endDate || '',
            startDay: w.startDay || 1,
            endDay: w.endDay || 7,
            weightPercentage: w.weightPercentage,
            revenueTarget: w.revenueTarget,
          }))}
        />
      )}
    </div>
  );
};
