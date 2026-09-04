import React, { useState } from 'react';
import {
  X,
  Printer,
  Phone,
  Calendar,
  AlertTriangle,
  FileCheck,
  Award,
  Palmtree,
  Clock,
  Eye,
  EyeOff,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Seller, CommercialWeekPeriod, Company, GoalLevel } from '../../types';
import { formatCurrency } from '../../services/financialEngine';
import { getSellerIntervalAvailability } from '../../services/availabilityEngine';
import { useApp } from '../../context/AppContext';

interface SellerGoalCardProps {
  seller: {
    sellerId: string;
    sellerName: string;
    officialSharePercentage: number;
    seniorityLevel?: string;
  };
  sellerEntity?: Seller;
  company: Company;
  branchName: string;
  monthName: string;
  year: number;
  monthlyTarget: number;
  weeks: CommercialWeekPeriod[];
  isOpen: boolean;
  onClose: () => void;
  monthNumber?: number;
  activeLevels?: GoalLevel[];
  allSellers?: {
    sellerId: string;
    sellerName: string;
    officialSharePercentage: number;
    seniorityLevel?: string;
  }[];
  onSelectSeller?: (sellerId: string) => void;
}

export const SellerGoalCardModal: React.FC<SellerGoalCardProps> = ({
  seller,
  sellerEntity,
  company,
  branchName,
  monthName,
  year,
  monthlyTarget,
  weeks,
  isOpen,
  onClose,
  monthNumber = 9,
  activeLevels,
  allSellers = [],
  onSelectSeller,
}) => {
  const { availabilities, workingDaysSettings } = useApp();
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(true);

  if (!isOpen || !seller) return null;

  // Calcula cada semana considerando férias e dias úteis trabalhados
  const weekDetails = weeks.map((w) => {
    const mStr = String(monthNumber).padStart(2, '0');
    const startDateStr =
      w.startDate ||
      `${year}-${mStr}-${String(w.startDay || 1).padStart(2, '0')}`;
    const endDateStr =
      w.endDate ||
      `${year}-${mStr}-${String(w.endDay || 7).padStart(2, '0')}`;

    const avail = getSellerIntervalAvailability(
      seller.sellerId,
      startDateStr,
      endDateStr,
      availabilities || [],
      workingDaysSettings
    );

    const baseWeekTarget = Math.round(
      monthlyTarget * (w.weightPercentage / 100) * ((seller.officialSharePercentage || 0) / 100)
    );
    const adjustedWeekTarget = Math.round(baseWeekTarget * avail.factor);
    const workedDays = avail.daysAvailable;
    const expectedDays = avail.daysExpected;
    const daily = workedDays > 0 ? Math.round(adjustedWeekTarget / workedDays) : 0;
    const isFullAbsence = avail.factor === 0 && expectedDays > 0;
    const isPartialAbsence = avail.factor > 0 && avail.factor < 1;

    return {
      week: w,
      avail,
      baseWeekTarget,
      adjustedWeekTarget,
      workedDays,
      expectedDays,
      daily,
      isFullAbsence,
      isPartialAbsence,
    };
  });

  const sellerMonthlyTarget = weekDetails.reduce((acc, wd) => acc + wd.adjustedWeekTarget, 0);
  const baseMonthlyTarget = Math.round(monthlyTarget * ((seller.officialSharePercentage || 0) / 100));
  const hasAbsences = weekDetails.some((wd) => wd.isFullAbsence || wd.isPartialAbsence);
  const avgTicket = sellerEntity?.averageTicket || 0;
  const hasTicket = avgTicket > 0;
  
  // Total de clientes/vendas necessárias no mês
  const monthlyClientsTarget = hasTicket ? Math.ceil(sellerMonthlyTarget / avgTicket) : null;
  const sellerLevels = (activeLevels && activeLevels.length > 0)
    ? activeLevels
    : (company?.levels?.slice(0, company.numberOfLevels) || []);

  // Formatação da mensagem para WhatsApp
  const handleShareWhatsApp = () => {
    let text = `🎯 *PLANO DE METAS OFICIAL - ${monthName.toUpperCase()}/${year}*\n`;
    text += `🏢 *Empresa:* ${company.tradeName} | *Loja:* ${branchName}\n`;
    text += `👤 *Consultor(a):* ${seller.sellerName}\n`;
    if (!isPrivacyMode) {
      text += `📊 *Participação na Meta da Loja:* ${seller.officialSharePercentage.toFixed(1)}%\n`;
    }
    text += `\n💰 *SUA META MENSAL:* ${formatCurrency(sellerMonthlyTarget)}\n`;
    if (hasAbsences) {
      text += `🌴 *(Ajustada proporcionalmente às suas férias/dias trabalhados no mês)*\n`;
    }
    if (hasTicket) {
      text += `🎯 *Ticket Médio Estimado:* ${formatCurrency(avgTicket)}\n`;
      text += `🛍️ *Meta de Clientes/Atendimentos no Mês:* ~${monthlyClientsTarget} vendas\n`;
    } else {
      text += `⚠️ *Atenção:* Ticket médio ainda não definido (atualize no cadastro).\n`;
    }
    text += `\n📅 *DESDOBRAMENTO POR SEMANA COMERCIAL:*\n`;

    weekDetails.forEach((wd) => {
      const w = wd.week;
      text += `• *Semana ${w.weekNumber}* (${w.label || w.dateRangeLabel || `Semana ${w.weekNumber}`}):\n`;
      if (wd.isFullAbsence) {
        text += `   - 🌴 *FÉRIAS / AFASTAMENTO* (R$ 0,00)\n`;
      } else if (wd.isPartialAbsence) {
        text += `   - Meta: ${formatCurrency(wd.adjustedWeekTarget)} (Férias parciais: ${wd.workedDays}/${wd.expectedDays} dias úteis)\n`;
        text += `   - Média Diária: ~${formatCurrency(wd.daily)}/dia trabalhado\n`;
      } else {
        text += `   - Meta: ${formatCurrency(wd.adjustedWeekTarget)} (Peso ${w.weightPercentage}%)\n`;
        text += `   - Média Diária: ~${formatCurrency(wd.daily)}/dia\n`;
      }
      if (hasTicket && !wd.isFullAbsence) {
        const wClients = Math.ceil(wd.adjustedWeekTarget / avgTicket);
        text += `   - Atendimentos: ~${wClients} clientes\n`;
      }
    });

    if (sellerLevels.length > 0) {
      text += `\n🏆 *ESCALA DE COMISSIONAMENTO:*\n`;
      sellerLevels.forEach((lvl, idx) => {
        const baseLevel1 = sellerLevels[0]?.revenueTarget || 1;
        const ratio = baseLevel1 > 0 ? lvl.revenueTarget / baseLevel1 : 1;
        const lvlTarget = Math.round(
          sellerMonthlyTarget * (idx === 0 ? 1 : (ratio > 0 ? ratio : (1 + idx * 0.15)))
        );
        const comm = Math.round(lvlTarget * (lvl.commissionPercentage / 100));
        text += `• ${lvl.name || `Nível ${idx + 1}`}: ${formatCurrency(lvlTarget)} ➔ ${lvl.commissionPercentage}% comissão (~${formatCurrency(comm)})\n`;
      });
    }

    text += `\n🚀 *Vamos com tudo bater essa meta! Sucesso nas vendas!*`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full my-6 overflow-hidden border border-slate-200 print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-full">
        {/* Header - Ações */}
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Relatório Visual & Acordo de Metas</h3>
              <p className="text-[11px] text-slate-300">
                Visualização formatada para WhatsApp e Impressão em PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {allSellers && allSellers.length > 1 && onSelectSeller && (
              <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-700">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={seller.sellerId}
                  onChange={(e) => onSelectSeller(e.target.value)}
                  className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
                  title="Trocar de vendedora para emitir o relatório de outra consultora"
                >
                  {allSellers.map((s) => (
                    <option key={s.sellerId} value={s.sellerId} className="bg-slate-900 text-white">
                      {s.sellerName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Botão de Alternar Modo Privacidade */}
            <button
              type="button"
              onClick={() => setIsPrivacyMode(!isPrivacyMode)}
              title={isPrivacyMode ? 'Participação da loja está borrada/oculta. Clique para exibir.' : 'Clique para borrar a participação da loja e manter confidencialidade.'}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                isPrivacyMode
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 hover:bg-amber-500/30'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5 text-amber-300" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
              <span>{isPrivacyMode ? 'Participação Borrada' : 'Participação Visível'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5" /> Enviar no WhatsApp
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir / Salvar PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo do Relatório Formatado / Documento Imprimível */}
        <div id="seller-goal-print-area" className="p-6 md:p-8 space-y-6 text-slate-900 bg-white">
          {/* Topo do Documento */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-900 pb-5 gap-4">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-emerald-700 uppercase bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                ACORDO INDIVIDUAL DE METAS & PERFORMANCE
              </span>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-2">
                {seller.sellerName}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                <strong>Empresa:</strong> {company.tradeName} • <strong>Loja:</strong> {branchName} • <strong>Período:</strong> {monthName}/{year}
              </p>
            </div>

            <div className="sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-2xl border sm:border-none border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Meta Mensal Oficial</span>
              <span className="text-2xl font-black font-mono text-emerald-700 block">
                {formatCurrency(sellerMonthlyTarget)}
              </span>
              {isPrivacyMode ? (
                <div className="mt-1 flex flex-col sm:items-end gap-1">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-900 shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Meta Individual Protegida</span>
                  </div>
                  <span
                    className="text-[11px] font-bold text-slate-400 font-mono filter blur-[3.5px] select-none pointer-events-none print:hidden"
                    title="Participação da loja borrada para manter o sigilo entre as vendedoras"
                  >
                    {seller.officialSharePercentage.toFixed(1)}% da Meta da Loja ({formatCurrency(monthlyTarget)})
                  </span>
                </div>
              ) : (
                <span className="text-[11px] font-bold text-indigo-700 font-mono">
                  {seller.officialSharePercentage.toFixed(1)}% da Meta da Loja ({formatCurrency(monthlyTarget)})
                </span>
              )}
            </div>
          </div>

          {/* Alerta de Ticket Médio se não cadastrado */}
          {!hasTicket ? (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Ticket Médio Não Cadastrado:</strong>
                <span>
                  O ticket médio desta vendedora ainda não foi informado no cadastro. Para calcular a quantidade exata de atendimentos e clientes necessários por dia, informe o Ticket Médio na aba "Equipe Comercial".
                </span>
              </div>
            </div>
          ) : (
            /* Cards de Indicadores Operacionais */
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl">
                <span className="text-[10px] font-bold text-indigo-800 uppercase block">Meta Mensal</span>
                <span className="text-base font-black font-mono text-indigo-950 mt-0.5 block">
                  {formatCurrency(sellerMonthlyTarget)}
                </span>
                <span className="text-[10px] text-indigo-700">100% da cota</span>
              </div>

              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl">
                <span className="text-[10px] font-bold text-purple-800 uppercase block">Ticket Médio</span>
                <span className="text-base font-black font-mono text-purple-950 mt-0.5 block">
                  {formatCurrency(avgTicket)}
                </span>
                <span className="text-[10px] text-purple-700">Por venda realizada</span>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Clientes no Mês</span>
                <span className="text-base font-black font-mono text-emerald-950 mt-0.5 block">
                  ~{monthlyClientsTarget} vendas
                </span>
                <span className="text-[10px] text-emerald-700">Atendimentos fechados</span>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">Média Diária</span>
                <span className="text-base font-black font-mono text-amber-950 mt-0.5 block">
                  ~{formatCurrency(Math.round(sellerMonthlyTarget / 30))}
                </span>
                <span className="text-[10px] text-amber-700">~{Math.ceil((monthlyClientsTarget || 30) / 30)} vendas/dia</span>
              </div>
            </div>
          )}

          {/* Desdobramento Semanal Detalhado */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Desdobramento por Semanas Comerciais
            </h3>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="p-3">Semana</th>
                    <th className="p-3 text-center">Peso</th>
                    <th className="p-3 text-right">Meta da Semana</th>
                    <th className="p-3 text-right">Meta / Dia</th>
                    {hasTicket && <th className="p-3 text-right">Clientes / Semana</th>}
                    {hasTicket && <th className="p-3 text-right">Clientes / Dia</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {weekDetails.map((wd) => {
                    const w = wd.week;
                    const wClients = hasTicket ? Math.ceil(wd.adjustedWeekTarget / avgTicket) : 0;
                    const dailyClients = hasTicket && wd.workedDays > 0 ? Math.ceil(wClients / wd.workedDays) : 0;

                    return (
                      <tr key={w.weekNumber} className={`hover:bg-slate-50 ${wd.isFullAbsence ? 'bg-amber-50/40' : ''}`}>
                        <td className="p-3 font-bold text-slate-900">
                          <div>Semana {w.weekNumber} ({w.label || w.dateRangeLabel || `Dias S${w.weekNumber}`})</div>
                          {wd.isFullAbsence && (
                            <div className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                              <Palmtree className="w-3 h-3 text-amber-700" />
                              <span>Férias / Afastada (0 dias)</span>
                            </div>
                          )}
                          {wd.isPartialAbsence && (
                            <div className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                              <Clock className="w-2.5 h-2.5 text-amber-700" />
                              <span>Férias parciais ({wd.workedDays}/{wd.expectedDays} dias)</span>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-indigo-700 bg-indigo-50/30">
                          {w.weightPercentage}%
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                          {wd.isFullAbsence ? (
                            <span className="text-amber-800 font-bold">R$ 0,00</span>
                          ) : (
                            formatCurrency(wd.adjustedWeekTarget)
                          )}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-700 font-bold">
                          {formatCurrency(wd.daily)}
                        </td>
                        {hasTicket && (
                          <td className="p-3 text-right font-mono text-slate-800">
                            {wd.isFullAbsence ? '-' : `~${wClients} atend.`}
                          </td>
                        )}
                        {hasTicket && (
                          <td className="p-3 text-right font-mono font-bold text-purple-700 bg-purple-50/30">
                            {wd.isFullAbsence ? '-' : `~${dailyClients}/dia`}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Faixas de Metas e Escala de Comissões */}
          {sellerLevels.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Escala de Superação & Comissionamento Individual
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {sellerLevels.map((lvl, idx) => {
                  const baseLevel1 = sellerLevels[0]?.revenueTarget || 1;
                  const ratio = baseLevel1 > 0 ? lvl.revenueTarget / baseLevel1 : 1;
                  const individualLevelTarget = Math.round(
                    sellerMonthlyTarget * (idx === 0 ? 1 : (ratio > 0 ? ratio : (1 + idx * 0.15)))
                  );
                  const estimatedComm = Math.round(individualLevelTarget * (lvl.commissionPercentage / 100));

                  return (
                    <div
                      key={lvl.level}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{lvl.name || `Nível ${idx + 1}`}</span>
                        <span className="font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px]">
                          {lvl.commissionPercentage}%
                        </span>
                      </div>
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(individualLevelTarget)}
                      </div>
                      <div className="text-[11px] text-slate-500 flex justify-between border-t border-slate-200 pt-1">
                        <span>Comissão Estimada:</span>
                        <strong className="text-emerald-700">{formatCurrency(estimatedComm)}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Assinatura / Aceite */}
          <div className="pt-8 border-t-2 border-slate-200 mt-8 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
            <div>
              <div className="border-b border-slate-400 pb-1 mb-1.5 font-semibold text-slate-800">
                {company.tradeName} (Diretoria / Gestão)
              </div>
              <span>Responsável Comercial</span>
            </div>
            <div>
              <div className="border-b border-slate-400 pb-1 mb-1.5 font-semibold text-slate-800">
                {seller.sellerName}
              </div>
              <span>Consultor(a) de Vendas</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
