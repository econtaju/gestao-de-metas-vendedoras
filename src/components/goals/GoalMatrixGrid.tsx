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
} from 'lucide-react';
import { CommercialWeekPeriod, TeamParticipationSummary, Company, Seller } from '../../types';
import { formatCurrency } from '../../services/financialEngine';
import { SellerGoalCardModal } from './SellerGoalCardModal';
import { useApp } from '../../context/AppContext';

interface GoalMatrixGridProps {
  monthlyTarget: number;
  weeks: CommercialWeekPeriod[];
  teamSummary: TeamParticipationSummary;
  branchName: string;
  monthName: string;
  year: number;
}

export const GoalMatrixGrid: React.FC<GoalMatrixGridProps> = ({
  monthlyTarget = 0,
  weeks = [],
  teamSummary,
  branchName = 'Unidade',
  monthName = 'Mês',
  year = 2026,
}) => {
  const { activeCompany, companySellers } = useApp();
  const safeSellers = Array.isArray(teamSummary?.sellers) ? teamSummary.sellers : [];
  const safeWeeks = Array.isArray(weeks) ? weeks : [];

  const [selectedSellerForReport, setSelectedSellerForReport] = useState<{
    sellerId: string;
    sellerName: string;
    officialSharePercentage: number;
    seniorityLevel?: string;
  } | null>(null);

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
              Cálculo automático: <span className="font-mono font-medium text-slate-700">Meta Mensal × Peso da Semana × % do Vendedor</span> • Clique no vendedor para gerar o relatório individual (PDF / WhatsApp).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
            Unidade: {branchName}
          </span>
        </div>
      </div>

      {/* Grade da Matriz */}
      <div className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse border border-slate-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-slate-800 text-white font-semibold">
                <th className="py-3.5 px-4 min-w-[200px]">Vendedor(a)</th>
                <th className="py-3.5 px-3 text-center min-w-[80px]">Part. (%)</th>
                <th className="py-3.5 px-4 text-right min-w-[120px] bg-slate-900">Meta Mês (R$)</th>
                {safeWeeks.map((week) => (
                  <th key={week.weekNumber} className="py-3.5 px-4 text-center min-w-[130px] border-l border-slate-700">
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
                  const sellerMonthlyTarget = Math.round(monthlyTarget * (seller.officialSharePercentage / 100));

                  return (
                    <tr key={seller.sellerId} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100/60'}>
                      {/* Nome do Vendedor */}
                      <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center">
                          {seller.sellerName.charAt(0)}
                        </span>
                        <span>{seller.sellerName}</span>
                      </td>

                      {/* % de Participação */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-indigo-700 bg-indigo-50/40">
                        {seller.officialSharePercentage.toFixed(1)}%
                      </td>

                      {/* Meta Mensal Individual */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 bg-slate-100/60">
                        {formatCurrency(sellerMonthlyTarget)}
                      </td>

                      {/* Semanas Comerciais 1..4 ou 1..5 */}
                      {safeWeeks.map((week) => {
                        const weekSellerTarget = Math.round(
                          monthlyTarget * (week.weightPercentage / 100) * (seller.officialSharePercentage / 100)
                        );
                        const dayCount = (week.endDay && week.startDay)
                          ? Math.max(1, week.endDay - week.startDay + 1)
                          : 7;
                        const dailyTarget = Math.round(weekSellerTarget / dayCount);

                        return (
                          <td key={week.weekNumber} className="py-3 px-4 text-right border-l border-slate-200 font-mono">
                            <div className="font-bold text-slate-900 text-xs">
                              {formatCurrency(weekSellerTarget)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              ~{formatCurrency(dailyTarget)}/dia
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
