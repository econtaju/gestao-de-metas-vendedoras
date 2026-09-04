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
import { CommercialWeekPeriod, TeamParticipationSummary, Company, Seller, GoalLevel } from '../../types';
import { formatCurrency } from '../../services/financialEngine';
import { getSellerIntervalAvailability } from '../../services/availabilityEngine';
import { SellerGoalCardModal } from './SellerGoalCardModal';
import { BatchTeamGoalPrintModal } from './BatchTeamGoalPrintModal';
import { useApp } from '../../context/AppContext';

interface GoalMatrixGridProps {
  monthlyTarget: number;
  weeks: CommercialWeekPeriod[];
  teamSummary: TeamParticipationSummary;
  branchName: string;
  monthName: string;
  year: number;
  monthNumber?: number;
  activeLevels?: GoalLevel[];
  vacationAdditions?: Record<string, number>;
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
  activeLevels,
  vacationAdditions,
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

  const [isBatchPrintModalOpen, setIsBatchPrintModalOpen] = useState<boolean>(false);

  // Totais consolidados da matriz: Meta Inicial, Distribuído Efetivo e Falta Distribuir (Férias)
  const matrixTotals = React.useMemo(() => {
    const weekDistributed: Record<number, number> = {};
    const weekBase: Record<number, number> = {};
    const weekMissing: Record<number, number> = {};

    safeWeeks.forEach((w) => {
      weekBase[w.weekNumber] = Math.round(monthlyTarget * (w.weightPercentage / 100));
      weekDistributed[w.weekNumber] = 0;
    });

    let monthDistributed = 0;

    safeSellers.forEach((seller) => {
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
        const adjusted = Math.round(baseWeek * avail.factor);

        weekDistributed[week.weekNumber] = (weekDistributed[week.weekNumber] || 0) + adjusted;
        monthDistributed += adjusted;
      });
    });

    safeWeeks.forEach((w) => {
      const diff = weekBase[w.weekNumber] - (weekDistributed[w.weekNumber] || 0);
      weekMissing[w.weekNumber] = Math.max(0, diff);
    });

    const monthMissing = Math.max(0, monthlyTarget - monthDistributed);
    const distributedSharePercentage = monthlyTarget > 0 ? (monthDistributed / monthlyTarget) * 100 : 0;

    return {
      weekBase,
      weekDistributed,
      weekMissing,
      monthBase: monthlyTarget,
      monthDistributed,
      monthMissing,
      distributedSharePercentage,
      hasDeficit: monthMissing > 0,
    };
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

        <div className="flex items-center gap-2 flex-wrap">
          {safeSellers.length > 0 && (
            <button
              type="button"
              onClick={() => setIsBatchPrintModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Imprimir todos os relatórios individuais da equipe com quebra de página automática em 1 clique"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Relatórios da Equipe (Lote)</span>
            </button>
          )}
          <span className="text-xs font-mono font-semibold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
            Unidade: {branchName}
          </span>
        </div>
      </div>

      {/* Banner Informativo de Cota de Férias a Cobrir */}
      {matrixTotals.hasDeficit && (
        <div className="mx-5 mt-4 p-3.5 bg-amber-50 border border-amber-300/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-900 rounded-xl shrink-0">
              <Palmtree className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <span className="font-bold text-amber-950 block text-xs sm:text-sm">
                Cota de Férias a Cobrir: {formatCurrency(matrixTotals.monthMissing)}
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
                  const sellerVacationAdd = vacationAdditions?.[seller.sellerId] || 0;

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
                        {sellerVacationAdd > 0 && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold" title="Acréscimo incorporado por cobertura de férias">
                              <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                              <span>+{formatCurrency(sellerVacationAdd)} (Cota Férias)</span>
                            </span>
                          </div>
                        )}
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
                        {sellerVacationAdd > 0 && (
                          <div className="text-[10px] text-emerald-700 font-semibold" title={`Meta base regular: ${formatCurrency(Math.max(0, effectiveSellerMonthlyTarget - sellerVacationAdd))}`}>
                            +{formatCurrency(sellerVacationAdd)} férias
                          </div>
                        )}
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
              {!matrixTotals.hasDeficit ? (
                /* Linha de Totais da Semana (Sem Déficit de Férias) */
                <tr className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-700">
                  <td className="py-3.5 px-4 uppercase tracking-wider">Total da Unidade</td>
                  <td className="py-3.5 px-3 text-center font-mono text-emerald-400 bg-slate-950">
                    {(teamSummary?.totalSharePercentage || 100).toFixed(1)}%
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-amber-300 text-sm bg-slate-950">
                    {formatCurrency(monthlyTarget)}
                  </td>
                  {safeWeeks.map((week) => {
                    const weekTotalTarget = matrixTotals.weekBase[week.weekNumber] || 0;
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
              ) : (
                /* 3 Linhas Discriminadas: Meta Inicial, Total Atual Distribuído e Falta Distribuir */
                <>
                  {/* 1. Meta Inicial Planejada */}
                  <tr className="bg-slate-900 text-slate-300 font-medium text-xs border-t-2 border-slate-700">
                    <td className="py-3 px-4 uppercase tracking-wider text-slate-200 font-bold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
                      <span>🎯 Meta Inicial Planejada</span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-300 bg-slate-950">
                      100.0%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-white font-bold text-sm bg-slate-950">
                      {formatCurrency(matrixTotals.monthBase)}
                    </td>
                    {safeWeeks.map((week) => (
                      <td key={week.weekNumber} className="py-3 px-4 text-right font-mono border-l border-slate-800 text-slate-300">
                        <div className="font-semibold text-xs text-slate-200">
                          {formatCurrency(matrixTotals.weekBase[week.weekNumber] || 0)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ({week.weightPercentage}% da loja)
                        </div>
                      </td>
                    ))}
                    <td className="py-3 px-3 text-center border-l border-slate-800 bg-slate-950 text-slate-500">
                      -
                    </td>
                  </tr>

                  {/* 2. Total Atual Distribuído (com Férias) */}
                  <tr className="bg-slate-800 text-white font-semibold text-xs border-t border-slate-700">
                    <td className="py-3 px-4 uppercase tracking-wider text-emerald-300 font-bold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                      <span>👥 Total Atual Distribuído</span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-400 bg-slate-950 font-bold">
                      {matrixTotals.distributedSharePercentage.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400 font-bold text-sm bg-slate-950">
                      {formatCurrency(matrixTotals.monthDistributed)}
                    </td>
                    {safeWeeks.map((week) => (
                      <td key={week.weekNumber} className="py-3 px-4 text-right font-mono border-l border-slate-800">
                        <div className="text-emerald-400 font-bold text-xs">
                          {formatCurrency(matrixTotals.weekDistributed[week.weekNumber] || 0)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {matrixTotals.weekBase[week.weekNumber] > 0
                            ? `${(((matrixTotals.weekDistributed[week.weekNumber] || 0) / matrixTotals.weekBase[week.weekNumber]) * 100).toFixed(0)}% da semana`
                            : '100%'}
                        </div>
                      </td>
                    ))}
                    <td className="py-3 px-3 text-center border-l border-slate-800 bg-slate-950 text-slate-400">
                      -
                    </td>
                  </tr>

                  {/* 3. Falta Distribuir (Diferença de Férias) */}
                  <tr className="bg-amber-950/90 text-amber-200 font-bold text-xs border-t-2 border-amber-600/70 shadow-inner">
                    <td className="py-3 px-4 uppercase tracking-wider text-amber-300 flex items-center gap-2">
                      <Palmtree className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>🌴 Falta Distribuir (Diferença de Férias)</span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-amber-300 bg-amber-950">
                      -{(100 - matrixTotals.distributedSharePercentage).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-amber-300 text-sm bg-amber-950">
                      <span className="text-[10px] text-amber-400 block font-normal uppercase tracking-wider">Diferença</span>
                      <span>Falta: {formatCurrency(matrixTotals.monthMissing)}</span>
                    </td>
                    {safeWeeks.map((week) => {
                      const weekDiff = matrixTotals.weekMissing[week.weekNumber] || 0;
                      return (
                        <td key={week.weekNumber} className="py-3 px-4 text-right font-mono border-l border-amber-900/60 bg-amber-950/80">
                          {weekDiff > 0 ? (
                            <>
                              <div className="text-amber-300 font-bold text-xs">
                                -{formatCurrency(weekDiff)}
                              </div>
                              <div className="text-[10px] text-amber-400/80 font-normal">
                                cota de férias
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-400 text-xs font-normal">0% falta</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3 px-3 text-center border-l border-amber-900/60 bg-amber-950">
                      {onOpenVacationRedistributionModal && (
                        <button
                          type="button"
                          onClick={() => onOpenVacationRedistributionModal()}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-lg text-[10px] font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1"
                          title="Redistribuir o valor que falta entre as vendedoras ativas"
                        >
                          <Palmtree className="w-3 h-3" />
                          <span>Redistribuir</span>
                        </button>
                      )}
                    </td>
                  </tr>
                </>
              )}
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
          monthNumber={monthNumber}
          monthlyTarget={monthlyTarget}
          weeks={safeWeeks}
          activeLevels={activeLevels}
          allSellers={safeSellers}
          vacationAdditions={vacationAdditions}
          onSelectSeller={(sellerId) => {
            const found = safeSellers.find((s) => s.sellerId === sellerId);
            if (found) setSelectedSellerForReport(found);
          }}
        />
      )}

      {/* Modal de Impressão em Lote dos Relatórios da Equipe (Melhoria 1) */}
      {isBatchPrintModalOpen && (
        <BatchTeamGoalPrintModal
          isOpen={true}
          onClose={() => setIsBatchPrintModalOpen(false)}
          sellers={safeSellers}
          monthlyTarget={monthlyTarget}
          weeks={safeWeeks}
          branchName={branchName}
          monthName={monthName}
          year={year}
          monthNumber={monthNumber}
          company={activeCompany}
          activeLevels={activeLevels}
          vacationAdditions={vacationAdditions}
        />
      )}
    </div>
  );
};
