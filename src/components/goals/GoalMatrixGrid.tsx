import React, { useState } from 'react';
import {
  Grid,
  Calculator,
  Calendar,
  FileCheck,
  Phone,
  Printer,
  ChevronRight,
  Sparkles,
  Palmtree,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { CommercialWeekPeriod, TeamParticipationSummary, Company, Seller } from '../../types';
import { formatCurrency } from '../../services/financialEngine';
import { getSellerIntervalAvailability } from '../../services/availabilityEngine';
import { SellerGoalCardModal } from './SellerGoalCardModal';
import { useApp } from '../../context/AppContext';

interface GoalMatrixGridProps {
  monthlyTarget: number;
  weeks: CommercialWeekPeriod[];
  teamSummary: TeamParticipationSummary;
  branchName: string;
  monthName: string;
  year: number;
  monthNumber?: number;
  onOpenVacationRedistributionModal?: (sellerId?: string) => void;
}

export const GoalMatrixGrid: React.FC<GoalMatrixGridProps> = ({
  monthlyTarget = 0,
  weeks = [],
  teamSummary,
  branchName = 'Unidade',
  monthName = 'Mês',
  year = 2026,
  monthNumber = 9,
  onOpenVacationRedistributionModal,
}) => {
  const { activeCompany, companySellers, availabilities, workingDaysSettings } = useApp();
  const safeSellers = Array.isArray(teamSummary?.sellers) ? teamSummary.sellers : [];
  const safeWeeks = Array.isArray(weeks) ? weeks : [];

  const [selectedSellerForReport, setSelectedSellerForReport] = useState<{
    sellerId: string;
    sellerName: string;
    officialSharePercentage: number;
    seniorityLevel?: string;
  } | null>(null);

  // Calcula o total de cotas descobertas por férias na unidade
  const totalUncoveredVacationAmount = React.useMemo(() => {
    let totalUncovered = 0;
    safeSellers.forEach((seller) => {
      const baseMonthly = Math.round(monthlyTarget * (seller.officialSharePercentage / 100));
      let effectiveSellerMonthly = 0;
      safeWeeks.forEach((week) => {
        const mStr = String(monthNumber || 9).padStart(2, '0');
        const startDateStr =
          week.startDate || `${year}-${mStr}-${String(week.startDay || 1).padStart(2, '0')}`;
        const endDateStr =
          week.endDate || `${year}-${mStr}-${String(week.endDay || 7).padStart(2, '0')}`;
        const avail = getSellerIntervalAvailability(
          seller.sellerId,
          startDateStr,
          endDateStr,
          availabilities || [],
          workingDaysSettings
        );
        const baseWeek = Math.round(
          monthlyTarget * (week.weightPercentage / 100) * (seller.officialSharePercentage / 100)
        );
        effectiveSellerMonthly += Math.round(baseWeek * avail.factor);
      });
      totalUncovered += Math.max(0, baseMonthly - effectiveSellerMonthly);
    });
    return totalUncovered;
  }, [safeSellers, safeWeeks, monthlyTarget, monthNumber, year, availabilities, workingDaysSettings]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Matriz de Metas Desdobradas ({monthName}/{year})
            </h3>
            <p className="text-xs text-slate-500">
              Cálculo inteligente com férias: <span className="font-mono font-medium text-slate-700">Meta Semanal × Proporção de Dias Úteis Trabalhados</span> • Semanas de férias ficam zeradas (R$ 0,00).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
            Unidade: {branchName}
          </span>
        </div>
      </div>

      {/* Banner Informativo de Cota de Férias a Cobrir */}
      {totalUncoveredVacationAmount > 0 && (
        <div className="mx-5 mt-4 p-3.5 bg-amber-50 border border-amber-300/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-900 rounded-xl shrink-0">
              <Palmtree className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <span className="font-bold text-amber-950 block text-xs sm:text-sm">
                Cota de Férias a Cobrir: {formatCurrency(totalUncoveredVacationAmount)}
              </span>
              <span className="text-amber-900/80 text-[11px] block mt-0.5">
                Vendedoras da unidade estão em período de férias. Você pode repartir essa diferença entre as vendedoras presentes para manter a meta da loja em 100%.
              </span>
            </div>
          </div>

          {onOpenVacationRedistributionModal && (
            <button
              type="button"
              onClick={() => onOpenVacationRedistributionModal()}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Palmtree className="w-4 h-4" />
              <span>Redistribuir Cota de Férias ➔</span>
            </button>
          )}
        </div>
      )}

      {/* Grade da Matriz */}
      <div className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse border border-slate-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-slate-800 text-white font-semibold">
                <th className="py-3.5 px-4 min-w-[200px]">Vendedor(a)</th>
                <th className="py-3.5 px-3 text-center min-w-[80px]">Part. (%)</th>
                <th className="py-3.5 px-4 text-right min-w-[130px] bg-slate-900">Meta Mês (R$)</th>
                {safeWeeks.map((week) => (
                  <th key={week.weekNumber} className="py-3.5 px-4 text-center min-w-[140px] border-l border-slate-700">
                    <div>Semana {week.weekNumber}</div>
                    <div className="text-[10px] font-normal text-slate-300">
                      Peso: <span className="font-bold text-amber-300">{week.weightPercentage}%</span> ({week.label || week.dateRangeLabel || `Semana ${week.weekNumber}`})
                    </div>
                  </th>
                ))}
                <th className="py-3.5 px-3 text-center min-w-[110px] border-l border-slate-700 bg-slate-900">
                  Ações / PDF
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {safeSellers.length === 0 ? (
                <tr>
                  <td colSpan={4 + safeWeeks.length} className="py-8 text-center bg-slate-50/50">
                    <p className="text-xs font-semibold text-slate-500">
                      Nenhum vendedor cadastrado nesta empresa/unidade para compor a matriz.
                    </p>
                  </td>
                </tr>
              ) : (
                safeSellers.map((seller, idx) => {
                  const baseMonthlyTarget = Math.round(monthlyTarget * (seller.officialSharePercentage / 100));

                  // Calcula os dados semana a semana levando em conta férias e dias úteis
                  const weekCalcs = safeWeeks.map((week) => {
                    const mStr = String(monthNumber || 9).padStart(2, '0');
                    const startDateStr =
                      week.startDate ||
                      `${year}-${mStr}-${String(week.startDay || 1).padStart(2, '0')}`;
                    const endDateStr =
                      week.endDate ||
                      `${year}-${mStr}-${String(week.endDay || 7).padStart(2, '0')}`;

                    const avail = getSellerIntervalAvailability(
                      seller.sellerId,
                      startDateStr,
                      endDateStr,
                      availabilities || [],
                      workingDaysSettings
                    );

                    const baseWeekTarget = Math.round(
                      monthlyTarget * (week.weightPercentage / 100) * (seller.officialSharePercentage / 100)
                    );

                    // Ajuste proporcional por dias úteis
                    const adjustedWeekTarget = Math.round(baseWeekTarget * avail.factor);
                    const workedDays = avail.daysAvailable;
                    const expectedDays = avail.daysExpected;
                    const isFullAbsence = avail.factor === 0 && expectedDays > 0;
                    const isPartialAbsence = avail.factor > 0 && avail.factor < 1;
                    const dailyTarget = workedDays > 0 ? Math.round(adjustedWeekTarget / workedDays) : 0;

                    return {
                      week,
                      avail,
                      baseWeekTarget,
                      adjustedWeekTarget,
                      workedDays,
                      expectedDays,
                      isFullAbsence,
                      isPartialAbsence,
                      dailyTarget,
                    };
                  });

                  // Meta Mensal Efetiva: soma das semanas ativas trabalhadas
                  const hasAbsences = weekCalcs.some((wc) => wc.isFullAbsence || wc.isPartialAbsence);
                  const effectiveSellerMonthlyTarget = weekCalcs.reduce((acc, wc) => acc + wc.adjustedWeekTarget, 0);
                  const totalWorkedDaysInMonth = weekCalcs.reduce((acc, wc) => acc + wc.workedDays, 0);
                  const totalExpectedDaysInMonth = weekCalcs.reduce((acc, wc) => acc + wc.expectedDays, 0);

                  return (
                    <tr key={seller.sellerId} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100/60'}>
                      {/* Nome do Vendedor */}
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                            {seller.sellerName.charAt(0)}
                          </span>
                          <span className="truncate">{seller.sellerName}</span>
                        </div>
                        {hasAbsences && (
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                              <Palmtree className="w-3 h-3 text-amber-700" />
                              <span>Férias ({totalWorkedDaysInMonth}/{totalExpectedDaysInMonth} dias trab.)</span>
                            </span>
                            {onOpenVacationRedistributionModal && (
                              <button
                                type="button"
                                onClick={() => onOpenVacationRedistributionModal(seller.sellerId)}
                                title="Repartir a cota desta vendedora para outras"
                                className="px-1.5 py-0.2 bg-amber-200/90 hover:bg-amber-300 text-amber-950 rounded text-[9px] font-bold transition cursor-pointer"
                              >
                                Repartir cota ➔
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* % de Participação */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-indigo-700 bg-indigo-50/40">
                        {seller.officialSharePercentage.toFixed(1)}%
                      </td>

                      {/* Meta Mensal Individual */}
                      <td className="py-3 px-4 text-right font-mono font-bold bg-slate-100/60">
                        <div className="text-slate-900 text-sm">
                          {formatCurrency(effectiveSellerMonthlyTarget)}
                        </div>
                        {hasAbsences && (
                          <div className="text-[10px] text-slate-400 font-normal line-through">
                            Base: {formatCurrency(baseMonthlyTarget)}
                          </div>
                        )}
                      </td>

                      {/* Semanas Comerciais 1..4 ou 1..5 com Proporção de Férias */}
                      {weekCalcs.map((wc) => {
                        if (wc.isFullAbsence) {
                          return (
                            <td
                              key={wc.week.weekNumber}
                              className="py-3 px-3 text-center border-l border-slate-200 bg-amber-50/40 font-mono"
                            >
                              <div className="font-bold text-amber-800 text-xs">
                                R$ 0,00
                              </div>
                              <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100/90 border border-amber-300 text-[10px] font-bold text-amber-900 shadow-2xs">
                                <Palmtree className="w-3 h-3 text-amber-700" />
                                <span>Férias (0 dias)</span>
                              </div>
                            </td>
                          );
                        }

                        if (wc.isPartialAbsence) {
                          return (
                            <td
                              key={wc.week.weekNumber}
                              className="py-3 px-3 text-right border-l border-slate-200 bg-amber-50/20 font-mono"
                            >
                              <div className="font-bold text-slate-900 text-xs">
                                {formatCurrency(wc.adjustedWeekTarget)}
                              </div>
                              <div className="text-[10px] text-slate-500 font-normal">
                                ~{formatCurrency(wc.dailyTarget)}/dia
                              </div>
                              <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-100/80 border border-amber-300 text-[9px] font-bold text-amber-900">
                                <Clock className="w-2.5 h-2.5 text-amber-700" />
                                <span>{wc.workedDays}/{wc.expectedDays} dias úteis</span>
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={wc.week.weekNumber} className="py-3 px-4 text-right border-l border-slate-200 font-mono">
                            <div className="font-bold text-slate-900 text-xs">
                              {formatCurrency(wc.adjustedWeekTarget)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              ~{formatCurrency(wc.dailyTarget)}/dia
                            </div>
                          </td>
                        );
                      })}

                      {/* Botão de Relatório Individual / WhatsApp / PDF */}
                      <td className="py-3 px-3 text-center border-l border-slate-200">
                        <button
                          type="button"
                          onClick={() => setSelectedSellerForReport(seller)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 mx-auto shadow-2xs cursor-pointer"
                          title="Ver Relatório, Baixar PDF e Enviar WhatsApp"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>Relatório</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              {/* Linha de Totais da Semana */}
              <tr className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-700">
                <td className="py-3.5 px-4 uppercase tracking-wider">Total da Unidade</td>
                <td className="py-3.5 px-3 text-center font-mono text-emerald-400 bg-slate-950">
                  {(teamSummary?.totalSharePercentage || 100).toFixed(1)}%
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-amber-300 text-sm bg-slate-950">
                  {formatCurrency(monthlyTarget)}
                </td>
                {safeWeeks.map((week) => {
                  const weekTotalTarget = Math.round(monthlyTarget * (week.weightPercentage / 100));
                  return (
                    <td key={week.weekNumber} className="py-3.5 px-4 text-right font-mono border-l border-slate-800">
                      <div className="text-emerald-400 font-bold text-xs">
                        {formatCurrency(weekTotalTarget)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        ({week.weightPercentage}% da loja)
                      </div>
                    </td>
                  );
                })}
                <td className="py-3.5 px-3 text-center border-l border-slate-800 bg-slate-950 text-slate-400">
                  -
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Rodapé explicativo da arquitetura */}
        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Arquitetura de Cálculo:</strong> A meta mensal (R$ {monthlyTarget.toLocaleString('pt-BR')}) é a fonte mestra da verdade. Clique no botão <strong>"Relatório"</strong> para emitir o plano de metas com envio no WhatsApp e PDF.
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 font-semibold shrink-0">
            {safeWeeks.length} Semanas Comerciais • {safeSellers.length} Vendedoras
          </span>
        </div>
      </div>

      {/* Modal de Relatório e Contrato Individual de Metas */}
      {selectedSellerForReport && (
        <SellerGoalCardModal
          isOpen={true}
          onClose={() => setSelectedSellerForReport(null)}
          seller={selectedSellerForReport}
          sellerEntity={companySellers.find((s) => s.id === selectedSellerForReport.sellerId)}
          company={activeCompany}
          branchName={branchName}
          monthName={monthName}
          year={year}
          monthlyTarget={monthlyTarget}
          weeks={safeWeeks}
        />
      )}
    </div>
  );
};
