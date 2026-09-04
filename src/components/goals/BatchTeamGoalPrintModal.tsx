import React, { useState } from 'react';
import {
  X,
  Printer,
  Eye,
  EyeOff,
  FileCheck,
  Palmtree,
  Clock,
  Sparkles,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { CommercialWeekPeriod, Company, GoalLevel } from '../../types';
import { formatCurrency } from '../../services/financialEngine';
import { getSellerIntervalAvailability } from '../../services/availabilityEngine';
import { useApp } from '../../context/AppContext';

interface BatchTeamGoalPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellers: {
    sellerId: string;
    sellerName: string;
    officialSharePercentage: number;
    seniorityLevel?: string;
  }[];
  monthlyTarget: number;
  weeks: CommercialWeekPeriod[];
  branchName: string;
  monthName: string;
  year: number;
  monthNumber?: number;
  company: Company;
  activeLevels?: GoalLevel[];
  vacationAdditions?: Record<string, number>;
}

export const BatchTeamGoalPrintModal: React.FC<BatchTeamGoalPrintModalProps> = ({
  isOpen,
  onClose,
  sellers = [],
  monthlyTarget = 0,
  weeks = [],
  branchName,
  monthName,
  year,
  monthNumber = 9,
  company,
  activeLevels = [],
  vacationAdditions,
}) => {
  const { availabilities, workingDaysSettings, companySellers } = useApp();
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(true);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      {/* Estilo CSS para garantir quebra de página por vendedora no PDF / Impressão */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .batch-print-wrapper, .batch-print-wrapper * {
            visibility: visible;
          }
          .batch-print-wrapper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
          }
          .seller-page-card {
            page-break-after: always !important;
            break-after: page !important;
            min-height: 100vh;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 24px !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full my-6 overflow-hidden border border-slate-200 print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-full">
        {/* Barra Superior - Ações (Oculta na Impressão) */}
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Impressão em Lote • Relatórios da Equipe</h3>
              <p className="text-[11px] text-slate-300">
                {sellers.length} vendedoras prontas com quebra de página automática para PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Alternar Modo Privacidade */}
            <button
              type="button"
              onClick={() => setIsPrivacyMode(!isPrivacyMode)}
              title={
                isPrivacyMode
                  ? 'Modo Privacidade ATIVADO: % de participação da loja está oculto. Clique para mostrar.'
                  : 'Clique para ocultar a % da loja e garantir sigilo individual.'
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                isPrivacyMode
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 hover:bg-amber-500/30'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              {isPrivacyMode ? (
                <EyeOff className="w-3.5 h-3.5 text-amber-300" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{isPrivacyMode ? 'Privacidade Ativa (Ocultar % da Loja)' : 'Mostrar % da Loja'}</span>
            </button>

            {/* Botão de Impressão */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Todos (PDF)</span>
            </button>

            {/* Fechar */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo Imprimível com Todos os Relatórios em Sequência */}
        <div className="batch-print-wrapper max-h-[82vh] overflow-y-auto print:max-h-none print:overflow-visible divide-y-4 divide-dashed divide-slate-300 print:divide-none">
          {sellers.map((seller, sIdx) => {
            const sellerEntity = companySellers.find((s) => s.id === seller.sellerId);
            const sellerVacationAdd = vacationAdditions?.[seller.sellerId] || 0;

            // Calcula semanas e disponibilidade da vendedora
            const weekDetails = weeks.map((week) => {
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

              const baseWeekTarget = Math.round(
                monthlyTarget * (week.weightPercentage / 100) * (seller.officialSharePercentage / 100)
              );
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

            const sellerMonthlyTarget = weekDetails.reduce(
              (acc, wd) => acc + wd.adjustedWeekTarget,
              0
            );
            const originalBaseTarget = Math.round(
              monthlyTarget *
                (seller.officialSharePercentage / 100) -
                sellerVacationAdd
            );
            const totalWorkedDays = weekDetails.reduce((acc, wd) => acc + wd.workedDays, 0);
            const totalExpectedDays = weekDetails.reduce((acc, wd) => acc + wd.expectedDays, 0);
            const hasAbsence = weekDetails.some((wd) => wd.isFullAbsence || wd.isPartialAbsence);

            const avgTicket = sellerEntity?.averageTicket || 300;
            const hasTicket = avgTicket > 0;
            const monthlyClientsTarget = hasTicket ? Math.ceil(sellerMonthlyTarget / avgTicket) : 0;

            return (
              <div
                key={seller.sellerId}
                className="seller-page-card p-6 sm:p-8 bg-white space-y-6"
              >
                {/* Cabeçalho do Documento */}
                <div className="flex items-start justify-between border-b pb-4 border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-xs">
                      {company.tradeName ? company.tradeName.charAt(0) : 'M'}
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                        {company.tradeName || 'Empresa'}
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Unidade: <strong className="text-slate-700">{branchName}</strong> • {monthName} / {year}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-lg text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Plano Individual de Vendas
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Página {sIdx + 1} de {sellers.length} • Emissão:{' '}
                      {new Date().toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                {/* Bloco Identificação da Consultora */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-black text-base flex items-center justify-center">
                      {seller.sellerName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900">
                        {seller.sellerName}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>
                          Senioridade:{' '}
                          <strong className="text-slate-700">
                            {seller.seniorityLevel || sellerEntity?.seniorityLevel || 'Pleno'}
                          </strong>
                        </span>
                        {hasAbsence && (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[10px] bg-amber-100 px-1.5 py-0.5 rounded">
                            <Palmtree className="w-3 h-3 text-amber-700" />
                            <span>{totalWorkedDays}/{totalExpectedDays} dias úteis</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right sm:border-l sm:pl-4 border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">
                      Participação na Unidade
                    </span>
                    {isPrivacyMode ? (
                      <span className="text-xs font-mono font-bold text-slate-400 bg-slate-200/80 px-2 py-0.5 rounded inline-block">
                        [CONFIDENCIAL]
                      </span>
                    ) : (
                      <span className="text-sm font-mono font-black text-indigo-700">
                        {seller.officialSharePercentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Banner de Cota de Férias se houver */}
                {sellerVacationAdd > 0 && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 flex items-center gap-2.5">
                    <Palmtree className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div>
                      <span className="font-bold">Acréscimo de Cobertura de Férias: </span>
                      <span>
                        Sua meta inclui <strong>+{formatCurrency(sellerVacationAdd)}</strong> assumidos temporariamente durante o período de férias de colega da equipe.
                      </span>
                    </div>
                  </div>
                )}

                {/* Meta Mensal Oficial em Destaque */}
                <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider block">
                      Meta Mensal Oficial ({monthName}/{year})
                    </span>
                    <div className="text-3xl font-black font-mono mt-1 text-white tracking-tight">
                      {formatCurrency(sellerMonthlyTarget)}
                    </div>
                    {sellerVacationAdd > 0 && (
                      <p className="text-[11px] text-emerald-300 font-medium mt-1">
                        Meta Regular: {formatCurrency(Math.max(0, originalBaseTarget))} • Acréscimo Férias: +{formatCurrency(sellerVacationAdd)}
                      </p>
                    )}
                  </div>

                  {hasTicket && (
                    <div className="grid grid-cols-2 gap-3 text-right">
                      <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-xs">
                        <span className="text-[9px] uppercase font-bold text-slate-300 block">Ticket Médio</span>
                        <span className="text-sm font-mono font-bold text-amber-300">{formatCurrency(avgTicket)}</span>
                      </div>
                      <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-xs">
                        <span className="text-[9px] uppercase font-bold text-slate-300 block">Vendas Exigidas</span>
                        <span className="text-sm font-mono font-bold text-emerald-300">~{monthlyClientsTarget} vendas</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tabela das Semanas Comerciais */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Desdobramento Semanal de Vendas
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Semana</th>
                          <th className="py-2.5 px-3 text-center">Peso (%)</th>
                          <th className="py-2.5 px-3 text-right">Meta da Semana</th>
                          <th className="py-2.5 px-3 text-center">Dias Úteis</th>
                          <th className="py-2.5 px-3 text-right">Média Diária</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono">
                        {weekDetails.map((wd) => {
                          if (wd.isFullAbsence) {
                            return (
                              <tr key={wd.week.weekNumber} className="bg-amber-50/50">
                                <td className="py-2.5 px-3 font-sans font-bold text-amber-900 flex items-center gap-1.5">
                                  <span>Semana {wd.week.weekNumber}</span>
                                  <span className="text-[10px] text-amber-700 font-normal">({wd.week.dateRangeLabel})</span>
                                </td>
                                <td className="py-2.5 px-3 text-center text-amber-900 font-semibold">
                                  {wd.week.weightPercentage}%
                                </td>
                                <td className="py-2.5 px-3 text-right text-amber-800 font-bold">
                                  R$ 0,00
                                </td>
                                <td className="py-2.5 px-3 text-center text-amber-900">
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                                    🌴 Férias
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-400">-</td>
                              </tr>
                            );
                          }

                          return (
                            <tr key={wd.week.weekNumber} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">
                                Semana {wd.week.weekNumber}{' '}
                                <span className="text-[10px] text-slate-400 font-normal font-sans">
                                  ({wd.week.dateRangeLabel})
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-600 font-semibold">
                                {wd.week.weightPercentage}%
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-900 font-bold text-xs">
                                {formatCurrency(wd.adjustedWeekTarget)}
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-600">
                                {wd.workedDays} dias
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-500">
                                ~{formatCurrency(wd.dailyTarget)}/dia
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Níveis da Vendedora (se houver) */}
                {activeLevels && activeLevels.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                      🏆 Escada de Metas & Comissões
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {activeLevels.map((lvl, lIdx) => {
                        const baseLevel1 = activeLevels[0]?.revenueTarget || 1;
                        const ratio = baseLevel1 > 0 ? lvl.revenueTarget / baseLevel1 : 1;
                        const lvlTarget = Math.round(
                          sellerMonthlyTarget * (lIdx === 0 ? 1 : (ratio > 0 ? ratio : (1 + lIdx * 0.15)))
                        );
                        return (
                          <div key={lvl.id || lIdx} className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                            <span className="text-[10px] font-bold text-slate-600 block">{lvl.name || `Nível ${lIdx + 1}`}</span>
                            <span className="text-xs font-mono font-bold text-indigo-700 block mt-0.5">{formatCurrency(lvlTarget)}</span>
                            <span className="text-[10px] text-emerald-600 font-bold block">{lvl.commissionPercentage}% comissão</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Termo de Compromisso e Assinaturas */}
                <div className="pt-4 border-t border-slate-200 space-y-6">
                  <p className="text-[11px] text-slate-500 leading-relaxed italic text-center">
                    "Declaro ter recebido e compreendido as diretrizes, desdobramento semanal e níveis de premiação estipulados para o período de {monthName} de {year}."
                  </p>
                  <div className="grid grid-cols-2 gap-8 pt-4">
                    <div className="text-center border-t border-slate-400 pt-1.5">
                      <div className="text-xs font-bold text-slate-800">{seller.sellerName}</div>
                      <div className="text-[10px] text-slate-400 uppercase">Consultora Comercial</div>
                    </div>
                    <div className="text-center border-t border-slate-400 pt-1.5">
                      <div className="text-xs font-bold text-slate-800">Gestão Comercial / FP&A</div>
                      <div className="text-[10px] text-slate-400 uppercase">{branchName}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
