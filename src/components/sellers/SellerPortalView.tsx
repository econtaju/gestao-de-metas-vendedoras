import React, { useMemo, useState } from 'react';
import {
  DollarSign,
  Award,
  Sparkles,
  ChevronRight,
  Users,
  BarChart3,
  Calendar,
  ArrowUpRight,
  Clock,
  Zap,
  Trophy,
  Flame,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  Sliders,
  TrendingUp,
  Target,
  MessageCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  formatCurrency,
  getActiveLevels,
} from '../../services/financialEngine';

export const SellerPortalView: React.FC = () => {
  const {
    activeCompany,
    companySellers,
    companySales,
    activeSellerId,
    setActiveSellerId,
    activePeriodNumber,
    activePeriodType,
    getSellerCalculation,
    getSellerGoalDetail,
    setCurrentView,
    activeUserRole,
    currentUser,
  } = useApp();

  const effectiveRole = currentUser?.role === 'consultant' ? activeUserRole : (currentUser?.role || 'consultant');

  const defaultMonthFromPeriod = useMemo(() => {
    if (typeof activePeriodNumber === 'number') {
      return activePeriodType === 'weekly'
        ? Math.min(12, Math.ceil(activePeriodNumber / 4))
        : activePeriodNumber;
    }
    return 9;
  }, [activePeriodNumber, activePeriodType]);

  const [selectedMonth, setSelectedMonth] = useState<number>(defaultMonthFromPeriod);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // Estado do Mini-Simulador de Próximo Nível
  const [simulatedTicket, setSimulatedTicket] = useState<number | null>(null);

  React.useEffect(() => {
    setSelectedMonth(defaultMonthFromPeriod);
  }, [defaultMonthFromPeriod]);

  const [selectedYear] = useState(2026);

  const activeLevels = useMemo(
    () => getActiveLevels(activeCompany.levels, activeCompany.numberOfLevels),
    [activeCompany]
  );

  const activeSeller = useMemo(() => {
    // Se o perfil efetivo for vendedor, prioriza o vendedor cujo nome ou login corresponda ao usuário logado
    if (effectiveRole === 'seller' && currentUser) {
      const matched = companySellers.find(
        (s) =>
          s.name.toLowerCase() === currentUser.name.toLowerCase() ||
          currentUser.name.toLowerCase().includes(s.name.toLowerCase()) ||
          s.name.toLowerCase().includes(currentUser.username.toLowerCase())
      );
      if (matched) return matched;
    }
    if (activeSellerId !== 'all') {
      return companySellers.find((s) => s.id === activeSellerId) || companySellers[0];
    }
    return companySellers[0];
  }, [companySellers, activeSellerId, effectiveRole, currentUser]);

  const goalDetail = useMemo(() => {
    if (!activeSeller) return null;
    return getSellerGoalDetail(activeSeller.id, selectedMonth, selectedYear);
  }, [activeSeller, selectedMonth, selectedYear, getSellerGoalDetail]);

  const recentSales = useMemo(() => {
    if (!activeSeller) return [];
    return companySales
      .filter((s) => s.sellerId === activeSeller.id)
      .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
      .slice(0, 6);
  }, [companySales, activeSeller]);

  const teamRanking = useMemo(() => {
    const branchSellers = companySellers.filter(
      (s) => !activeSeller || s.branchId === activeSeller.branchId
    );
    const map: Record<string, { name: string; revenue: number; level: number }> = {};
    
    branchSellers.forEach((s) => {
      map[s.id] = { name: s.name, revenue: 0, level: 0 };
    });

    companySales.forEach((s) => {
      if (!map[s.sellerId]) return;
      const saleMonth = s.periodType === 'weekly' ? Math.min(12, Math.ceil(s.periodNumber / 4)) : s.periodNumber;
      if (saleMonth === selectedMonth) {
        map[s.sellerId].revenue += s.revenue;
      }
    });

    return Object.entries(map)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [companySales, companySellers, activeSeller, selectedMonth]);

  const myRankPosition = useMemo(() => {
    const pos = teamRanking.findIndex((r) => r.id === activeSeller?.id);
    return pos === -1 ? null : pos + 1;
  }, [teamRanking, activeSeller]);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  const getLevelColor = (level: number) => {
    if (level >= 4) return 'text-purple-700 bg-purple-100 border-purple-300';
    if (level >= 3) return 'text-emerald-700 bg-emerald-100 border-emerald-300';
    if (level >= 2) return 'text-blue-700 bg-blue-100 border-blue-300';
    if (level >= 1) return 'text-teal-700 bg-teal-100 border-teal-300';
    return 'text-slate-600 bg-slate-100 border-slate-300';
  };

  const getLevelName = (level: number) => activeLevels[level - 1]?.name || `Meta ${level}`;

  if (!activeSeller) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Nenhum vendedor cadastrado nesta empresa.
      </div>
    );
  }

  const achievement = goalDetail?.achievementPercentage ?? 0;
  const realized = goalDetail?.realizedRevenue ?? 0;
  const monthlyTarget = goalDetail?.monthlyTarget ?? 0;
  const commission = goalDetail?.estimatedCommissionAmount ?? 0;
  const remaining = Math.max(0, monthlyTarget - realized);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(1, achievement / 100));
  const progressColor = achievement >= 100 ? '#10b981' : achievement >= 70 ? '#3b82f6' : '#f59e0b';

  // --- SUGESTÃO 1: SIMULADOR QUANTO FALTA PARA O PRÓXIMO NÍVEL ---
  const currentTicket = goalDetail?.currentAverageTicket || 350;
  const activeTicketToUse = simulatedTicket ?? currentTicket;
  const requiredSalesNextLevel = activeTicketToUse > 0 ? Math.ceil(remaining / activeTicketToUse) : 0;
  
  // Próximo nível da empresa
  const currentLevelIndex = activeLevels.findIndex(
    (lvl) => realized >= (monthlyTarget * (lvl.revenueTarget / (activeLevels[0]?.revenueTarget || 1)))
  );
  const nextLevelObj = activeLevels[currentLevelIndex + 1] || activeLevels[activeLevels.length - 1];
  const nextLevelRatio = nextLevelObj ? nextLevelObj.revenueTarget / (activeLevels[0]?.revenueTarget || 1) : 1;
  const nextLevelTargetAmount = Math.round(monthlyTarget * nextLevelRatio);
  const gapToNextLevel = Math.max(0, nextLevelTargetAmount - realized);
  const requiredSalesForNextLevelTarget = activeTicketToUse > 0 ? Math.ceil(gapToNextLevel / activeTicketToUse) : 0;
  const potentialCommissionGain = (nextLevelTargetAmount * (nextLevelObj?.commissionPercentage || 2.5) / 100) - commission;

  // --- SUGESTÃO 2: MEDALHAS DE CONQUISTA COMERCIAL ---
  const achievements = [
    {
      id: 'rank_leader',
      title: 'Top 1 do Ranking',
      description: 'Liderando a equipe comercial',
      icon: Trophy,
      color: 'bg-amber-100 text-amber-700 border-amber-300',
      unlocked: myRankPosition === 1,
    },
    {
      id: 'target_hit',
      title: 'Meta 100% Batida',
      description: 'Atingiu 100% da meta do mês',
      icon: Target,
      color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      unlocked: achievement >= 100,
    },
    {
      id: 'superation',
      title: 'Superação de Meta',
      description: 'Ultrapassou 115% de atingimento',
      icon: Flame,
      color: 'bg-purple-100 text-purple-700 border-purple-300',
      unlocked: achievement >= 115,
    },
    {
      id: 'high_ticket',
      title: 'Ticket de Elite',
      description: 'Ticket médio acima de R$ 400',
      icon: Zap,
      color: 'bg-blue-100 text-blue-700 border-blue-300',
      unlocked: currentTicket >= 400,
    },
  ];

  // --- SUGESTÃO 3: WHATSAPP SHARE GENERATOR ---
  const generateWhatsAppMessage = () => {
    const monthName = monthNames[selectedMonth - 1];
    return `🎯 *RESUMO DE DESEMPENHO - ${activeSeller.name.toUpperCase()}*\n🏢 ${activeCompany.tradeName} · ${monthName}/${selectedYear}\n\n📊 *Faturamento Realizado:* ${formatCurrency(realized)} (${achievement.toFixed(0)}% da meta)\n🎯 *Meta do Mês:* ${formatCurrency(monthlyTarget)}\n💰 *Comissão Estimada:* ${formatCurrency(commission)}\n🏆 *Posição no Ranking:* ${myRankPosition ? `${myRankPosition}º lugar` : 'Em andamento'}\n\n${
      remaining > 0
        ? `⚡ *Faltam apenas ${formatCurrency(remaining)} (${requiredSalesNextLevel} vendas com Ticket de ${formatCurrency(activeTicketToUse)}) para bater a meta!*`
        : `✅ *Meta 100% superada! Parabéns pelo excelente resultado! 🎉*`
    }\n\n🚀 _Enviado via Antigravity Metas_`;
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  const handleOpenWhatsAppDirect = () => {
    const text = encodeURIComponent(generateWhatsAppMessage());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div id="seller-portal-view" className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 rounded-2xl text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                Portal do Vendedor
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Olá, {activeSeller.name.split(' ')[0]}! 👋
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              {activeSeller.role} · {activeCompany.tradeName}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {effectiveRole !== 'seller' && (
              <select
                value={activeSeller.id}
                onChange={(e) => setActiveSellerId(e.target.value)}
                className="bg-slate-800/80 border border-slate-600 text-slate-100 text-xs rounded-xl px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {companySellers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-800/80 border border-slate-600 text-slate-100 text-xs rounded-xl px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {monthNames.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m} {selectedYear}</option>
              ))}
            </select>

            {/* BOTÃO COMPARTILHAR NO WHATSAPP */}
            <div className="flex items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={handleCopyWhatsApp}
                title="Copiar Resumo Formatado"
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-sm transition flex items-center gap-1.5"
              >
                {copiedSuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSuccess ? 'Copiado!' : 'Copiar Resumo'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenWhatsAppDirect}
                title="Enviar no WhatsApp"
                className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 rounded-xl font-bold text-xs transition flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SUGESTÃO 2: MEDALHAS DE CONQUISTA COMERCIAL */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Conquistas & Medalhas Comerciais
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-semibold">
            {achievements.filter((a) => a.unlocked).length} de {achievements.length} desbloqueadas
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {achievements.map((ach) => {
            const Icon = ach.icon;
            return (
              <div
                key={ach.id}
                className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
                  ach.unlocked
                    ? ach.color + ' shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    ach.unlocked ? 'bg-white/80 shadow-xs' : 'bg-slate-200/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">{ach.title}</div>
                  <div className="text-[10px] truncate">{ach.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda */}
        <div className="lg:col-span-1 space-y-4">
          {/* Gauge */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              Atingimento — {monthNames[selectedMonth - 1]}
            </p>
            <div className="relative inline-flex items-center justify-center">
              <svg width="140" height="140" className="-rotate-90">
                <circle cx="70" cy="70" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
                <circle
                  cx="70" cy="70" r={radius} fill="none"
                  stroke={progressColor} strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div className="absolute text-center">
                <div className="text-2xl font-black" style={{ color: progressColor }}>
                  {achievement.toFixed(0)}%
                </div>
                <div className="text-[10px] text-slate-500 font-medium">atingido</div>
              </div>
            </div>
            <div className="mt-4 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Realizado</span>
                <span className="font-bold text-slate-900">{formatCurrency(realized)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Meta Mensal</span>
                <span className="font-bold text-blue-700">{formatCurrency(monthlyTarget)}</span>
              </div>
              {remaining > 0 && (
                <div className="flex justify-between text-amber-700 bg-amber-50 rounded-lg px-2 py-1">
                  <span className="font-semibold">Falta</span>
                  <span className="font-bold">{formatCurrency(remaining)}</span>
                </div>
              )}
              {remaining === 0 && monthlyTarget > 0 && (
                <div className="text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1 text-center font-bold">
                  ✅ Meta atingida!
                </div>
              )}
            </div>
          </div>

          {/* Comissão */}
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Comissão Estimada</span>
            </div>
            <div className="text-2xl font-black text-amber-800">{formatCurrency(commission)}</div>
            <p className="text-[11px] text-amber-700 mt-1">
              Participação oficial: {goalDetail?.officialSharePercentage ?? activeSeller.officialSharePercentage ?? 25}%
            </p>
          </div>

          {/* Ranking */}
          {myRankPosition && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Posição no Ranking</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-indigo-700">{myRankPosition}º</span>
                <span className="text-xs text-slate-500 pb-1">de {teamRanking.length}</span>
              </div>
              {myRankPosition === 1 && (
                <p className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Liderando a equipe!
                </p>
              )}
            </div>
          )}
        </div>

        {/* Coluna direita */}
        <div className="lg:col-span-2 space-y-4">
          {/* SUGESTÃO 1: SIMULADOR QUANTO FALTA PARA O PRÓXIMO NÍVEL */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-indigo-700/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-400/30">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Simulador "Quanto Falta para o Próximo Nível"
                  </h3>
                  <p className="text-[11px] text-indigo-200">
                    Projeção inteligente de vendas e ganho de comissão
                  </p>
                </div>
              </div>

              <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                {nextLevelObj?.name || 'Próxima Meta'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Gap Faltante</span>
                <span className="text-lg font-extrabold text-amber-400">
                  {formatCurrency(remaining > 0 ? remaining : gapToNextLevel)}
                </span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Ticket Médio Simulado</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs text-slate-400 font-bold">R$</span>
                  <input
                    type="number"
                    step="20"
                    value={activeTicketToUse}
                    onChange={(e) => setSimulatedTicket(Number(e.target.value))}
                    className="w-20 bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 text-xs text-emerald-400 font-bold font-mono outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Vendas Necessárias</span>
                <span className="text-lg font-extrabold text-indigo-300">
                  {requiredSalesNextLevel} vendas
                </span>
              </div>
            </div>

            {/* Banner de Incentivo com Ganho Estimado */}
            <div className="p-3 bg-indigo-950/80 rounded-xl border border-indigo-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>
                  Faça mais <strong className="text-amber-300">{requiredSalesNextLevel} vendas</strong> de{' '}
                  <strong className="text-emerald-300">{formatCurrency(activeTicketToUse)}</strong> para desbloquear{' '}
                  <strong className="text-white">{nextLevelObj?.name || 'o próximo nível'}</strong>!
                </span>
              </div>

              {potentialCommissionGain > 0 && (
                <span className="text-[11px] font-extrabold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-lg shrink-0 ml-2">
                  +{formatCurrency(potentialCommissionGain)} comissão!
                </span>
              )}
            </div>
          </div>

          {/* Semanas */}
          {goalDetail && goalDetail.weeklyBreakdown && goalDetail.weeklyBreakdown.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <h3 className="font-bold text-slate-800 text-sm">
                  Detalhamento Semanal — {monthNames[selectedMonth - 1]}
                </h3>
              </div>
              <div className="divide-y divide-slate-50">
                {goalDetail.weeklyBreakdown.map((week) => {
                  const pct = week.weeklyTarget > 0
                    ? Math.min(100, (week.realizedRevenue / week.weeklyTarget) * 100) : 0;
                  const barColor = pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-blue-500' : 'bg-amber-400';
                  return (
                    <div key={week.weekNumber} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <span className="text-xs font-bold text-slate-800">
                            {week.label || week.periodLabel}
                          </span>
                          {week.dateRangeLabel && (
                            <span className="ml-2 text-[10px] text-slate-400">({week.dateRangeLabel})</span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-900">{formatCurrency(week.realizedRevenue)}</div>
                          <div className="text-[10px] text-slate-500">Meta: {formatCurrency(week.weeklyTarget)}</div>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-slate-400">
                          {week.salesCount} venda{week.salesCount !== 1 ? 's' : ''}
                          {week.averageTicket > 0 ? ` · TM ${formatCurrency(week.averageTicket)}` : ''}
                        </span>
                        <span className={`text-[10px] font-bold ${pct >= 100 ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ranking equipe */}
          {teamRanking.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  <h3 className="font-bold text-slate-800 text-sm">Ranking da Equipe</h3>
                </div>
                {effectiveRole !== 'seller' && (
                  <button
                    onClick={() => setCurrentView('sellers')}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    Ver detalhes <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-50">
                {teamRanking.slice(0, 6).map((entry, idx) => {
                  const isMe = entry.id === activeSeller.id;
                  return (
                    <div key={entry.id} className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-emerald-50/50' : ''}`}>
                      <span className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center flex-shrink-0 ${
                        idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-100 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-500'
                      }`}>{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold truncate ${isMe ? 'text-emerald-800' : 'text-slate-800'}`}>{entry.name}</span>
                          {isMe && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full border border-emerald-200 flex-shrink-0">você</span>
                          )}
                        </div>
                        {entry.level > 0 && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${getLevelColor(entry.level)}`}>
                            {getLevelName(entry.level)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-900 flex-shrink-0">{formatCurrency(entry.revenue)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Histórico recente */}
          {recentSales.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <h3 className="font-bold text-slate-800 text-sm">Histórico Recente</h3>
                </div>
                <button onClick={() => setCurrentView('sales_history')}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1">
                  Ver tudo <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="divide-y divide-slate-50">
                {recentSales.map((sale) => {
                  const calc = getSellerCalculation(sale);
                  return (
                    <div key={sale.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <div className="text-xs font-semibold text-slate-800">{sale.periodLabel}</div>
                        <div className="text-[10px] text-slate-500">
                          {calc.achievedLevelName} · Comissão {formatCurrency(calc.commissionAmount)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-900">{formatCurrency(sale.revenue)}</div>
                        <div className={`text-[10px] font-semibold ${calc.achievementPercentage >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {calc.achievementPercentage.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!goalDetail && recentSales.length === 0 && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 text-center">
              <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500">Nenhuma venda registrada no período.</p>
              {effectiveRole !== 'seller' ? (
                <>
                  <p className="text-xs text-slate-400 mt-1">Lance um resultado para ver seu painel completo.</p>
                  <button
                    onClick={() => setCurrentView('sales_entry')}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" /> Lançar Venda
                  </button>
                </>
              ) : (
                <p className="text-xs text-slate-400 mt-1">Consulte seu gestor para o lançamento de vendas do período.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
