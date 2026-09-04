import React from 'react';
import {
  Users,
  Award,
  TrendingUp,
  Percent,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Info,
  Calendar,
  Copy,
  Star,
  Zap,
  Palmtree,
  Save,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TeamParticipationSummary, Seller } from '../../types';
import { formatCurrency } from '../../services/financialEngine';

interface TeamParticipationEditorProps {
  summary: TeamParticipationSummary;
  onSellerShareChange: (sellerId: string, newShare: number) => void;
  onRedistributeProportionally: (sellerId: string, newShare: number) => void;
  onSetEqualDistribution: () => void;
  onApplyHistoricalShares: () => void;
  onSaveAsTeamDefault?: () => void;
  onLoadTeamDefault?: () => void;
  onOpenReplicateModal?: () => void;
  onOpenVacationRedistributionModal?: (sellerId?: string) => void;
  onSaveSellerShare?: (sellerId: string) => void;
  onSaveAllSellerShares?: () => void;
  hasSavedTeamDefault?: boolean;
  monthlyTarget: number;
  monthNumber?: number;
  year?: number;
}

export const TeamParticipationEditor: React.FC<TeamParticipationEditorProps> = ({
  summary,
  onSellerShareChange,
  onRedistributeProportionally,
  onSetEqualDistribution,
  onApplyHistoricalShares,
  onSaveAsTeamDefault,
  onLoadTeamDefault,
  onOpenReplicateModal,
  onOpenVacationRedistributionModal,
  onSaveSellerShare,
  onSaveAllSellerShares,
  hasSavedTeamDefault = false,
  monthlyTarget = 0,
  monthNumber = 9,
  year = 2026,
}) => {
  const { setCurrentView, availabilities } = useApp();
  const totalSharePercentage = summary?.totalSharePercentage ?? 100;
  const isValid = summary?.isValid ?? true;
  const validationMessage = summary?.validationMessage;
  const safeSellers = Array.isArray(summary?.sellers) ? summary.sellers : [];
  const diff = Math.round((100 - totalSharePercentage) * 10) / 10;

  const [savedSellers, setSavedSellers] = React.useState<Record<string, boolean>>({});
  const [allSaved, setAllSaved] = React.useState<boolean>(false);

  const handleSaveSingle = (sellerId: string) => {
    if (onSaveSellerShare) {
      onSaveSellerShare(sellerId);
    }
    setSavedSellers((prev) => ({ ...prev, [sellerId]: true }));
    setTimeout(() => {
      setSavedSellers((prev) => ({ ...prev, [sellerId]: false }));
    }, 2500);
  };

  const handleSaveAll = () => {
    if (onSaveAllSellerShares) {
      onSaveAllSellerShares();
    }
    setAllSaved(true);
    setTimeout(() => {
      setAllSaved(false);
    }, 2500);
  };

  const mStr = String(monthNumber || 9).padStart(2, '0');
  const yr = year || 2026;
  const monthStart = `${yr}-${mStr}-01`;
  const monthEnd = `${yr}-${mStr}-31`;

  const vacationSellersCount = safeSellers.filter((s) => {
    return (availabilities || []).some(
      (a) => a.sellerId === s.sellerId && a.startDate <= monthEnd && a.endDate >= monthStart
    );
  }).length;

  // Seniority badge renderer
  const renderSeniorityBadge = (level?: string) => {
    switch (level) {
      case 'senior':
      case 'A':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
            Sênior (Nível A)
          </span>
        );
      case 'pleno':
      case 'B':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-full border border-blue-200">
            Pleno (Nível B)
          </span>
        );
      case 'junior':
      case 'C':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-full border border-slate-200">
            Júnior (Nível C)
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded-full">
            Consultor
          </span>
        );
    }
  };

  const renderOriginBadge = (origin?: 'historical' | 'manual' | 'adjusted') => {
    switch (origin) {
      case 'historical':
        return (
          <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
            Histórico Real
          </span>
        );
      case 'manual':
        return (
          <span className="text-[10px] font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
            Definido Manual
          </span>
        );
      case 'adjusted':
      default:
        return (
          <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
            Meta Ajustada
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 text-purple-700 rounded-lg shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-slate-800">
              Participação dos Vendedores na Meta da Unidade
            </h3>
            <p className="text-xs text-slate-500">
              A soma das participações dos vendedores desta filial deve compor 100% da meta mensal da loja.
            </p>
          </div>
        </div>

        {/* Ações Rápidas de Distribuição */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setCurrentView('team_availability')}
            className="flex-1 sm:flex-none px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>Escala / Férias</span>
          </button>
          <button
            type="button"
            onClick={onApplyHistoricalShares}
            className="flex-1 sm:flex-none px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Histórico</span>
          </button>
          <button
            type="button"
            onClick={onSetEqualDistribution}
            className="flex-1 sm:flex-none px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Divisão Igual</span>
          </button>

          {onSaveAsTeamDefault && (
            <button
              type="button"
              onClick={onSaveAsTeamDefault}
              title="Salva as porcentagens atuais como o padrão oficial pré-configurado da equipe"
              className="flex-1 sm:flex-none px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Star className="w-3.5 h-3.5 text-amber-600" />
              <span>Salvar Padrão</span>
            </button>
          )}

          {hasSavedTeamDefault && onLoadTeamDefault && (
            <button
              type="button"
              onClick={onLoadTeamDefault}
              title="Carrega as porcentagens do padrão pré-configurado da equipe"
              className="flex-1 sm:flex-none px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Usar Padrão</span>
            </button>
          )}

          {onOpenVacationRedistributionModal && (
            <button
              type="button"
              onClick={() => onOpenVacationRedistributionModal()}
              title="Repartir / cobrir a cota de vendedoras em férias para outras da equipe"
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                vacationSellersCount > 0
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              <Palmtree className="w-3.5 h-3.5" />
              <span>Cobrir Férias</span>
              {vacationSellersCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-white text-amber-900 rounded-full text-[10px] font-black">
                  {vacationSellersCount}
                </span>
              )}
            </button>
          )}

          {onOpenReplicateModal && (
            <button
              type="button"
              onClick={onOpenReplicateModal}
              title="Replicar esta distribuição de porcentagens para outros meses de 2026"
              className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Replicar p/ Meses</span>
            </button>
          )}

          {onSaveAllSellerShares && (
            <button
              type="button"
              onClick={handleSaveAll}
              title="Salvar imediatamente todas as porcentagens de participação da equipe"
              className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                allSaved
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              {allSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{allSaved ? 'Salvo ✓' : 'Salvar Participações'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {/* Tabela de Vendedores (Visível em Tablets e Desktops) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                <th className="py-3 px-3">Vendedor & Nível</th>
                <th className="py-3 px-3 text-center">Origem</th>
                <th className="py-3 px-3 text-right">Histórico Médio</th>
                <th className="py-3 px-4 text-center">Participação Oficial (%)</th>
                <th className="py-3 px-3 text-right">Meta Mensal (R$)</th>
                <th className="py-3 px-3 text-right">Ticket Médio</th>
                <th className="py-3 px-3 text-right">Vendas Necessárias</th>
                <th className="py-3 px-3 text-center">Auto-Ajuste</th>
                <th className="py-3 px-3 text-center bg-indigo-50/60 text-indigo-900 font-bold">Salvar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {safeSellers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center bg-slate-50/50">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-2.5 bg-purple-50 text-purple-600 rounded-full">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        Nenhum vendedor cadastrado nesta empresa / filial.
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-sm">
                        Cadastre os vendedores da sua equipe comercial para desdobrar a meta mensal e emitir os relatórios.
                      </p>
                      <button
                        type="button"
                        onClick={() => setCurrentView('sellers')}
                        className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                      >
                        + Cadastrar Vendedores na Equipe
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                safeSellers.map((seller) => {
                  const officialShare = seller.officialSharePercentage ?? 25;
                  const historicalShare = seller.historicalSharePercentage ?? 25;
                  const sellerTarget = Math.round(monthlyTarget * (officialShare / 100));
                  const requiredSales = Math.ceil(sellerTarget / Math.max(1, seller.averageTicket || 300));

                  const mStr = String(monthNumber || 9).padStart(2, '0');
                  const yr = year || 2026;
                  const monthStart = `${yr}-${mStr}-01`;
                  const monthEnd = `${yr}-${mStr}-31`;

                  const sellerAbsences = (availabilities || []).filter((a) => {
                    if (a.sellerId !== seller.sellerId) return false;
                    return a.startDate <= monthEnd && a.endDate >= monthStart;
                  });

                  return (
                    <tr key={seller.sellerId} className="hover:bg-slate-50/60 transition-colors">
                      {/* Nome e Senioridade */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-900 text-sm">{seller.sellerName}</span>
                          {sellerAbsences.length > 0 && (
                            <div className="inline-flex items-center gap-1 mt-0.5">
                              <span
                                title={`Férias/afastamento cadastrado neste mês (${sellerAbsences[0].startDate} a ${sellerAbsences[0].endDate})`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold shadow-2xs"
                              >
                                <Palmtree className="w-3 h-3 text-amber-700" />
                                <span>Férias agendadas</span>
                              </span>
                              {onOpenVacationRedistributionModal && (
                                <button
                                  type="button"
                                  onClick={() => onOpenVacationRedistributionModal(seller.sellerId)}
                                  title="Repartir a cota restante desta vendedora"
                                  className="px-1.5 py-0.2 bg-amber-200/90 hover:bg-amber-300 text-amber-950 rounded text-[9px] font-bold transition cursor-pointer"
                                >
                                  Repartir cota ➔
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="mt-0.5">{renderSeniorityBadge(seller.seniorityLevel)}</div>
                      </td>

                      {/* Origem */}
                      <td className="py-3 px-3 text-center">
                        {renderOriginBadge(seller.shareOriginType)}
                      </td>

                      {/* Histórico Médio */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {historicalShare.toFixed(1)}%
                      </td>

                      {/* Participação Oficial e Slider */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2 max-w-[200px] mx-auto">
                          <input
                            type="range"
                            min="5"
                            max="60"
                            step="0.5"
                            value={officialShare}
                            onChange={(e) => onSellerShareChange(seller.sellerId, parseFloat(e.target.value) || 0)}
                            className="w-20 sm:w-24 accent-purple-600 cursor-pointer"
                          />
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              step="0.5"
                              value={officialShare}
                              onChange={(e) => onSellerShareChange(seller.sellerId, parseFloat(e.target.value) || 0)}
                              className="w-16 px-2 py-1 text-xs font-mono font-bold text-right text-slate-900 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-purple-500 focus:outline-none"
                            />
                            <span className="absolute right-1 top-1 text-[10px] text-slate-400 font-mono pointer-events-none">
                              %
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Meta Mensal Individual */}
                      <td className="py-3 px-3 text-right">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {formatCurrency(sellerTarget)}
                        </span>
                      </td>

                      {/* Ticket Médio */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {formatCurrency(seller.averageTicket)}
                      </td>

                      {/* Vendas Necessárias */}
                      <td className="py-3 px-3 text-right">
                        <span className="font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {requiredSales} vendas
                        </span>
                      </td>

                      {/* Botão de Auto-Redistribuição */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onRedistributeProportionally(seller.sellerId, seller.officialSharePercentage)}
                          title="Fixa a porcentagem deste vendedor e recalcula os outros para fechar em 100%"
                          className="px-2 py-1 text-[11px] font-medium text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded border border-purple-200 transition-colors"
                        >
                          Compensar
                        </button>
                      </td>

                      {/* Botão de Salvar Individual */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleSaveSingle(seller.sellerId)}
                          title={`Salvar imediatamente a participação de ${seller.sellerName}`}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer shadow-2xs ${
                            savedSellers[seller.sellerId]
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                              : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-300 hover:border-emerald-300'
                          }`}
                        >
                          {savedSellers[seller.sellerId] ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Salvo</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Salvar</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50/90 font-bold text-slate-900">
                <td className="py-3 px-3">Total da Equipe ({safeSellers.length} Vendedoras)</td>
                <td className="py-3 px-3 text-center">-</td>
                <td className="py-3 px-3 text-right font-mono">
                  {safeSellers.reduce((acc, s) => acc + (s.historicalSharePercentage || 0), 0).toFixed(1)}%
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={`font-mono text-sm px-2.5 py-1 rounded-md ${
                      isValid ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {totalSharePercentage.toFixed(1)}%
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-mono text-sm">
                  {formatCurrency(monthlyTarget)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-600">
                  {formatCurrency(
                    safeSellers.length > 0
                      ? safeSellers.reduce((acc, s) => acc + (s.averageTicket || 0), 0) / safeSellers.length
                      : 0
                  )}
                </td>
                <td className="py-3 px-3 text-right font-mono text-indigo-800">
                  {safeSellers.reduce(
                    (acc, s) =>
                      acc + Math.ceil((monthlyTarget * ((s.officialSharePercentage || 25) / 100)) / Math.max(1, s.averageTicket || 300)),
                    0
                  )}{' '}
                  vendas
                </td>
                <td className="py-3 px-3 text-center">-</td>
                <td className="py-3 px-3 text-center">-</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile Card List View (Exclusivo para Smartphones) */}
        <div className="md:hidden space-y-3">
          {safeSellers.length === 0 ? (
            <div className="p-6 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Users className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">Nenhum vendedor cadastrado</p>
              <button
                type="button"
                onClick={() => setCurrentView('sellers')}
                className="mt-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold"
              >
                + Cadastrar Vendedores
              </button>
            </div>
          ) : (
            safeSellers.map((seller) => {
              const officialShare = seller.officialSharePercentage ?? 25;
              const historicalShare = seller.historicalSharePercentage ?? 25;
              const sellerTarget = Math.round(monthlyTarget * (officialShare / 100));
              const requiredSales = Math.ceil(sellerTarget / Math.max(1, seller.averageTicket || 300));

              const mStr = String(monthNumber || 9).padStart(2, '0');
              const yr = year || 2026;
              const monthStart = `${yr}-${mStr}-01`;
              const monthEnd = `${yr}-${mStr}-31`;

              const sellerAbsences = (availabilities || []).filter((a) => {
                if (a.sellerId !== seller.sellerId) return false;
                return a.startDate <= monthEnd && a.endDate >= monthStart;
              });

              return (
                <div
                  key={seller.sellerId}
                  className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{seller.sellerName}</span>
                        {sellerAbsences.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span
                              title={`Férias/afastamento cadastrado neste mês (${sellerAbsences[0].startDate} a ${sellerAbsences[0].endDate})`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold shadow-2xs"
                            >
                              <Palmtree className="w-3 h-3 text-amber-700" />
                              <span>Férias agendadas</span>
                            </span>
                            {onOpenVacationRedistributionModal && (
                              <button
                                type="button"
                                onClick={() => onOpenVacationRedistributionModal(seller.sellerId)}
                                title="Repartir a cota restante desta vendedora"
                                className="px-1.5 py-0.5 bg-amber-200/90 hover:bg-amber-300 text-amber-950 rounded text-[9px] font-bold transition cursor-pointer"
                              >
                                Repartir cota ➔
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {renderSeniorityBadge(seller.seniorityLevel)}
                        {renderOriginBadge(seller.shareOriginType)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSaveSingle(seller.sellerId)}
                        title={`Salvar imediatamente a participação de ${seller.sellerName}`}
                        className={`px-2 py-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs ${
                          savedSellers[seller.sellerId]
                            ? 'bg-emerald-600 text-white ring-1 ring-emerald-300'
                            : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-300'
                        }`}
                      >
                        {savedSellers[seller.sellerId] ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Salvo</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Salvar</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRedistributeProportionally(seller.sellerId, seller.officialSharePercentage)}
                        title="Compensar participação"
                        className="px-2 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition cursor-pointer"
                      >
                        Compensar
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/70">
                    <span className="text-slate-500">Meta Mensal:</span>
                    <strong className="text-slate-900 font-mono text-sm">{formatCurrency(sellerTarget)}</strong>
                  </div>

                  {/* Slider de toque fluido e input de % */}
                  <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Participação na Meta:</span>
                      <span className="font-bold text-indigo-700 font-mono text-sm">{officialShare.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.5"
                        value={officialShare}
                        onChange={(e) => onSellerShareChange(seller.sellerId, parseFloat(e.target.value) || 0)}
                        className="flex-1 accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                      />
                      <div className="relative shrink-0">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={officialShare}
                          onChange={(e) => onSellerShareChange(seller.sellerId, parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-xs font-mono font-bold text-right text-slate-900 bg-slate-50 border border-slate-300 rounded focus:outline-none"
                        />
                        <span className="absolute right-1 top-1 text-[10px] text-slate-400 font-mono pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Ticket Médio: <strong className="text-slate-700">{formatCurrency(seller.averageTicket)}</strong></span>
                    <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {requiredSales} vendas
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {/* Resumo Mobile do Total da Equipe */}
          {safeSellers.length > 0 && (
            <div className="p-3 bg-slate-100/90 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900">
              <span>Total da Equipe ({safeSellers.length} vendedoras):</span>
              <span
                className={`font-mono px-2 py-0.5 rounded-md ${
                  isValid ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                }`}
              >
                {totalSharePercentage.toFixed(1)}% / 100%
              </span>
            </div>
          )}
        </div>

        {/* Alerta de Validação da Equipe */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
            isValid
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
              : 'bg-amber-50/90 border-amber-200 text-amber-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isValid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <div>
              <p className="text-xs font-semibold">
                {isValid
                  ? 'Participação Total da Equipe Validada (100.0%)'
                  : validationMessage || `A soma das participações está em ${totalSharePercentage}%.`}
              </p>
              <p className="text-[11px] opacity-80">
                {isValid
                  ? 'A soma das metas individuais coincide perfeitamente com a meta mensal da unidade.'
                  : 'Clique no botão "Compensar" em um vendedor ou ajuste os valores manualmente para fechar em 100%.'}
              </p>
            </div>
          </div>

          {!isValid && (
            <button
              type="button"
              onClick={onSetEqualDistribution}
              className="w-full sm:w-auto px-3 py-2 text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 rounded-lg shadow-2xs transition-colors shrink-0 text-center"
            >
              Equalizar Automaticamente
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
