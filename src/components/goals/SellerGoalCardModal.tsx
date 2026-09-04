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
  Sparkles,
  LayoutGrid,
  CheckCircle2,
  Copy,
  Check,
  TrendingUp,
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
  vacationAdditions?: Record<string, number>;
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
  vacationAdditions,
  onSelectSeller,
}) => {
  const { availabilities, workingDaysSettings } = useApp();
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'detailed' | 'compact_card'>('detailed');
  const [isCopied, setIsCopied] = useState<boolean>(false);

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

  // Acréscimo por cobertura de férias da equipe
  const sellerVacationAdd = vacationAdditions?.[seller.sellerId] || 0;
  const originalBaseTarget = Math.max(0, sellerMonthlyTarget - sellerVacationAdd);
  
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
    if (sellerVacationAdd > 0) {
      text += `🌴 *Composição da Meta:*\n`;
      text += `   - Meta Regular: ${formatCurrency(originalBaseTarget)}\n`;
      text += `   - Cobertura de Férias: +${formatCurrency(sellerVacationAdd)}\n`;
    }
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

  const handleCopyCardText = () => {
    let summary = `✨ *CARD DE METAS • ${seller.sellerName}*\n`;
    summary += `🏢 ${company.tradeName} (${branchName}) • ${monthName}/${year}\n\n`;
    summary += `🎯 *Meta Mensal Oficial:* ${formatCurrency(sellerMonthlyTarget)}\n`;
    if (sellerVacationAdd > 0) {
      summary += `🌴 *Cota de Férias Incluída:* +${formatCurrency(sellerVacationAdd)} (Regular: ${formatCurrency(originalBaseTarget)})\n`;
    }
    if (hasTicket) {
      summary += `🛍️ *Ticket Médio:* ${formatCurrency(avgTicket)} | ~${monthlyClientsTarget} vendas no mês\n`;
    }
    summary += `\n📅 *Semanas Comerciais:*\n`;
    weekDetails.forEach((wd) => {
      summary += `• S${wd.week.weekNumber} (${wd.week.weightPercentage}%): ${wd.isFullAbsence ? '🌴 FÉRIAS' : formatCurrency(wd.adjustedWeekTarget)}\n`;
    });
    if (sellerLevels.length > 0) {
      summary += `\n🏆 *Níveis & Comissões:*\n`;
      sellerLevels.forEach((lvl, idx) => {
        const baseLevel1 = sellerLevels[0]?.revenueTarget || 1;
        const ratio = baseLevel1 > 0 ? lvl.revenueTarget / baseLevel1 : 1;
        const lvlTarget = Math.round(
          sellerMonthlyTarget * (idx === 0 ? 1 : (ratio > 0 ? ratio : (1 + idx * 0.15)))
        );
        summary += `• ${lvl.name || `Nível ${idx + 1}`}: ${formatCurrency(lvlTarget)} (${lvl.commissionPercentage}%)\n`;
      });
    }
    navigator.clipboard.writeText(summary);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
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
            {/* Seletor de Modo: Relatório Detalhado vs Cartão Compacto (Melhoria 2) */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('detailed')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'detailed'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Visualizar documento completo e imprimível para assinatura"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Relatório</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('compact_card')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'compact_card'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Visualizar cartão compacto estilizado de alta conversão para WhatsApp"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Cartão Visual</span>
              </button>
            </div>

            {allSellers && allSellers.length > 1 && onSelectSeller && (
              <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-xl border border-slate-700">
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
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs ${
                isPrivacyMode
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 hover:bg-amber-500/30'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5 text-amber-300" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
              <span>{isPrivacyMode ? 'Borrado' : 'Visível'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition shadow-sm cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5" /> WhatsApp
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition border border-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir
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

        {/* 1. MODO CARTÃO VISUAL COMPACTO (MELHORIA 2) */}
        {viewMode === 'compact_card' ? (
          <div className="p-6 bg-slate-950 text-white space-y-5 animate-in fade-in duration-150">
            {/* Cartão Estilizado Executivo */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-5">
              {/* Efeito sutil de iluminação */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Cabeçalho do Card */}
              <div className="flex items-center justify-between border-b border-indigo-500/20 pb-4">
                <div>
                  <span className="text-[10px] font-extrabold tracking-widest text-indigo-400 uppercase">
                    CARD OFICIAL DE PERFORMANCE
                  </span>
                  <h2 className="text-xl font-black text-white mt-0.5 flex items-center gap-2">
                    <span>{seller.sellerName}</span>
                    {seller.seniorityLevel && (
                      <span className="text-[10px] bg-white/10 text-slate-300 px-2 py-0.5 rounded-full font-semibold uppercase">
                        {seller.seniorityLevel}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {company.tradeName} • {branchName} • {monthName}/{year}
                  </p>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center font-black text-lg shadow-inner">
                  {seller.sellerName.charAt(0)}
                </div>
              </div>

              {/* Destaque Central da Meta */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Sua Meta Mensal Oficial
                  </span>
                  <div className="text-3xl font-black font-mono text-emerald-400 mt-0.5">
                    {formatCurrency(sellerMonthlyTarget)}
                  </div>
                  {sellerVacationAdd > 0 && (
                    <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold">
                      <Palmtree className="w-3 h-3 text-emerald-400" />
                      <span>Inclui +{formatCurrency(sellerVacationAdd)} de férias da equipe</span>
                    </div>
                  )}
                </div>

                {hasTicket && (
                  <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-white/10 pt-2 sm:pt-0 sm:pl-4">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Ticket & Vendas
                    </span>
                    <span className="text-sm font-bold text-white font-mono block mt-0.5">
                      {formatCurrency(avgTicket)} / venda
                    </span>
                    <span className="text-[11px] text-indigo-300 font-semibold">
                      ~{monthlyClientsTarget} vendas no mês
                    </span>
                  </div>
                )}
              </div>

              {/* Semanas em Grid Compacto */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Desdobramento por Semanas Comerciais
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {weekDetails.map((wd) => {
                    const w = wd.week;
                    return (
                      <div
                        key={w.weekNumber}
                        className={`p-2.5 rounded-xl border ${
                          wd.isFullAbsence
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                            : 'bg-white/5 border-white/10 text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mb-1">
                          <span>Semana {w.weekNumber}</span>
                          <span className="text-indigo-300 font-mono">{w.weightPercentage}%</span>
                        </div>
                        <div className="font-mono font-bold text-xs">
                          {wd.isFullAbsence ? '🌴 Férias' : formatCurrency(wd.adjustedWeekTarget)}
                        </div>
                        {!wd.isFullAbsence && (
                          <div className="text-[9px] text-slate-400 mt-0.5">
                            ~{formatCurrency(wd.daily)}/dia
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Escada de Níveis Compacta */}
              {sellerLevels.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-indigo-500/20">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    Escala de Comissionamento Individual
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {sellerLevels.map((lvl, idx) => {
                      const baseLevel1 = sellerLevels[0]?.revenueTarget || 1;
                      const ratio = baseLevel1 > 0 ? lvl.revenueTarget / baseLevel1 : 1;
                      const individualLevelTarget = Math.round(
                        sellerMonthlyTarget * (idx === 0 ? 1 : (ratio > 0 ? ratio : (1 + idx * 0.15)))
                      );
                      return (
                        <div
                          key={lvl.level}
                          className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between font-bold text-slate-300">
                            <span>{lvl.name || `N${idx + 1}`}</span>
                            <span className="text-emerald-400 font-mono">{lvl.commissionPercentage}%</span>
                          </div>
                          <div className="font-mono font-bold text-white text-xs mt-1">
                            {formatCurrency(individualLevelTarget)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Ações do Card Compacto */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyCardText}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
                <span>{isCopied ? 'Copiado para Área de Transferência!' : 'Copiar Texto Formatado'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Phone className="w-4 h-4" />
                <span>Enviar Card no WhatsApp</span>
              </button>
            </div>
          </div>
        ) : (
          /* 2. MODO RELATÓRIO DETALHADO TRADICIONAL / IMPRIMÍVEL */
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

            {/* Destaque do Acréscimo por Férias da Equipe */}
            {sellerVacationAdd > 0 && (
              <div className="p-4 bg-emerald-50/90 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                    <Palmtree className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <strong className="text-xs font-bold text-emerald-950 block">
                      Acréscimo por Cobertura de Férias: +{formatCurrency(sellerVacationAdd)}
                    </strong>
                    <span className="text-[11px] text-emerald-800 block mt-0.5">
                      Sua meta mensal foi ajustada para incluir a cobertura de colegas em férias. Meta regular: <strong>{formatCurrency(originalBaseTarget)}</strong> + Cota adicional: <strong>{formatCurrency(sellerVacationAdd)}</strong>.
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-600 text-white font-mono font-bold text-xs rounded-xl self-start sm:self-auto shrink-0 shadow-xs">
                  +{formatCurrency(sellerVacationAdd)}
                </span>
              </div>
            )}

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
                                <span>Férias parciais ({wd.workedDays}/${wd.expectedDays} dias)</span>
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

            {/* TERMÔMETRO DINÂMICO DE SUPERAÇÃO DE NÍVEIS (MELHORIA 3) */}
            {sellerLevels.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-indigo-500/5 to-emerald-500/10 border border-indigo-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    Termômetro de Superação & Escalada de Comissões:
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {sellerLevels.length} Níveis Configuráveis
                  </span>
                </div>

                {/* Régua Visual de Níveis */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  {sellerLevels.map((lvl, idx) => {
                    const baseLevel1 = sellerLevels[0]?.revenueTarget || 1;
                    const ratio = baseLevel1 > 0 ? lvl.revenueTarget / baseLevel1 : 1;
                    const individualLevelTarget = Math.round(
                      sellerMonthlyTarget * (idx === 0 ? 1 : (ratio > 0 ? ratio : (1 + idx * 0.15)))
                    );
                    const prevLvlTarget = idx > 0
                      ? Math.round(sellerMonthlyTarget * (sellerLevels[idx - 1].revenueTarget / baseLevel1))
                      : 0;
                    const stepDiff = idx > 0 ? individualLevelTarget - prevLvlTarget : 0;

                    return (
                      <div
                        key={lvl.level}
                        className={`p-3 rounded-xl border transition relative overflow-hidden ${
                          idx === 0
                            ? 'bg-indigo-50/80 border-indigo-300 shadow-2xs'
                            : idx === sellerLevels.length - 1
                            ? 'bg-amber-50/80 border-amber-300'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <span className="text-slate-900">{lvl.name || `Nível ${idx + 1}`}</span>
                          <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-mono text-[10px]">
                            {lvl.commissionPercentage}%
                          </span>
                        </div>
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          {formatCurrency(individualLevelTarget)}
                        </div>
                        {idx > 0 && (
                          <div className="text-[10px] text-slate-500 mt-1 font-semibold">
                            +{formatCurrency(stepDiff)} p/ virar
                          </div>
                        )}
                        {idx === 0 && (
                          <div className="text-[10px] text-indigo-700 mt-1 font-semibold">
                            Cota Mínima Inicial
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Faixas de Metas e Escala de Comissões */}
            {sellerLevels.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  Tabela Completa de Comissionamento Individual
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
        )}
      </div>
    </div>
  );
};

