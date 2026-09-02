import React from 'react';
import {
  X,
  Printer,
  Phone,
  Calendar,
  AlertTriangle,
  FileCheck,
  Award,
} from 'lucide-react';
import { Seller, CommercialWeekPeriod, Company } from '../../types';
import { formatCurrency } from '../../services/financialEngine';

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
}) => {
  if (!isOpen || !seller) return null;

  const sellerMonthlyTarget = Math.round(monthlyTarget * ((seller.officialSharePercentage || 0) / 100));
  const avgTicket = sellerEntity?.averageTicket || 0;
  const hasTicket = avgTicket > 0;
  
  // Total de clientes/vendas necessárias no mês
  const monthlyClientsTarget = hasTicket ? Math.ceil(sellerMonthlyTarget / avgTicket) : null;
  const sellerLevels = company?.levels?.slice(0, company.numberOfLevels) || [];

  // Formatação da mensagem para WhatsApp
  const handleShareWhatsApp = () => {
    let text = `🎯 *PLANO DE METAS OFICIAL - ${monthName.toUpperCase()}/${year}*\n`;
    text += `🏢 *Empresa:* ${company.tradeName} | *Loja:* ${branchName}\n`;
    text += `👤 *Consultor(a):* ${seller.sellerName}\n`;
    text += `📊 *Participação na Meta da Loja:* ${seller.officialSharePercentage.toFixed(1)}%\n\n`;
    text += `💰 *SUA META MENSAL:* ${formatCurrency(sellerMonthlyTarget)}\n`;
    if (hasTicket) {
      text += `🎯 *Ticket Médio Estimado:* ${formatCurrency(avgTicket)}\n`;
      text += `🛍️ *Meta de Clientes/Atendimentos no Mês:* ~${monthlyClientsTarget} vendas\n`;
    } else {
      text += `⚠️ *Atenção:* Ticket médio ainda não definido (atualize no cadastro).\n`;
    }
    text += `\n📅 *DESDOBRAMENTO POR SEMANA COMERCIAL:*\n`;

    weeks.forEach((w) => {
      const wTarget = Math.round(monthlyTarget * (w.weightPercentage / 100) * (seller.officialSharePercentage / 100));
      const days = (w.endDay && w.startDay) ? (w.endDay - w.startDay + 1) : 7;
      const daily = Math.round(wTarget / days);
      const wClients = hasTicket ? Math.ceil(wTarget / avgTicket) : null;

      text += `• *Semana ${w.weekNumber}* (${w.label || w.dateRangeLabel || `Semana ${w.weekNumber}`}):\n`;
      text += `   - Meta: ${formatCurrency(wTarget)} (Peso ${w.weightPercentage}%)\n`;
      text += `   - Média Diária: ~${formatCurrency(daily)}/dia\n`;
      if (wClients) {
        text += `   - Atendimentos: ~${wClients} clientes (~${Math.ceil(wClients / days)}/dia)\n`;
      }
    });

    if (sellerLevels.length > 0) {
      text += `\n🏆 *ESCALA DE COMISSIONAMENTO:*\n`;
      sellerLevels.forEach((lvl) => {
        const lvlTarget = Math.round(sellerMonthlyTarget * (lvl.revenueTarget / (sellerLevels[0]?.revenueTarget || 1)));
        const comm = Math.round(lvlTarget * (lvl.commissionPercentage / 100));
        text += `• ${lvl.name}: ${formatCurrency(lvlTarget)} ➔ ${lvl.commissionPercentage}% comissão (~${formatCurrency(comm)})\n`;
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
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
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

          <div className="flex items-center gap-2">
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
              <span className="text-[11px] font-bold text-indigo-700 font-mono">
                {seller.officialSharePercentage.toFixed(1)}% da Meta da Loja ({formatCurrency(monthlyTarget)})
              </span>
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
                  {weeks.map((w) => {
                    const weekTarget = Math.round(
                      monthlyTarget * (w.weightPercentage / 100) * (seller.officialSharePercentage / 100)
                    );
                    const days = (w.endDay && w.startDay) ? (w.endDay - w.startDay + 1) : 7;
                    const dailyTarget = Math.round(weekTarget / days);
                    const wClients = hasTicket ? Math.ceil(weekTarget / avgTicket) : 0;
                    const dailyClients = hasTicket ? Math.ceil(wClients / days) : 0;

                    return (
                      <tr key={w.weekNumber} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">
                          Semana {w.weekNumber} ({w.label || w.dateRangeLabel || `Dias S${w.weekNumber}`})
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-indigo-700 bg-indigo-50/30">
                          {w.weightPercentage}%
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                          {formatCurrency(weekTarget)}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-700 font-bold">
                          {formatCurrency(dailyTarget)}
                        </td>
                        {hasTicket && (
                          <td className="p-3 text-right font-mono text-slate-800">
                            ~{wClients} atend.
                          </td>
                        )}
                        {hasTicket && (
                          <td className="p-3 text-right font-mono font-bold text-purple-700 bg-purple-50/30">
                            ~{dailyClients}/dia
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
                  const ratio = lvl.revenueTarget / baseLevel1;
                  const individualLevelTarget = Math.round(sellerMonthlyTarget * (idx === 0 ? 1 : ratio));
                  const estimatedComm = Math.round(individualLevelTarget * (lvl.commissionPercentage / 100));

                  return (
                    <div
                      key={lvl.level}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{lvl.name}</span>
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
