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
  monthlyTarget: number;
}

export const TeamParticipationEditor: React.FC<TeamParticipationEditorProps> = ({
  summary,
  onSellerShareChange,
  onRedistributeProportionally,
  onSetEqualDistribution,
  onApplyHistoricalShares,
  monthlyTarget = 0,
}) => {
  const { setCurrentView } = useApp();
  const totalSharePercentage = summary?.totalSharePercentage ?? 100;
  const isValid = summary?.isValid ?? true;
  const validationMessage = summary?.validationMessage;
  const safeSellers = Array.isArray(summary?.sellers) ? summary.sellers : [];
  const diff = Math.round((100 - totalSharePercentage) * 10) / 10;

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
      <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Participação dos Vendedores na Meta da Unidade
            </h3>
            <p className="text-xs text-slate-500">
              A soma das participações dos vendedores desta filial deve compor 100% da meta mensal da loja.
            </p>
          </div>
        </div>

        {/* Ações Rápidas de Distribuição */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentView('team_availability')}
            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            Escala / Férias
          </button>
          <button
            type="button"
            onClick={onApplyHistoricalShares}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Usar Histórico Real
          </button>
          <button
            type="button"
            onClick={onSetEqualDistribution}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Divisão Igualitária
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Tabela de Vendedores */}
        <div className="overflow-x-auto">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {safeSellers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center bg-slate-50/50">
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

                  return (
                    <tr key={seller.sellerId} className="hover:bg-slate-50/60 transition-colors">
                      {/* Nome e Senioridade */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 text-sm">{seller.sellerName}</div>
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
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Alerta de Validação da Equipe */}
        <div
          className={`p-3.5 rounded-lg border flex items-center justify-between transition-all ${
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
              className="px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 rounded-lg shadow-sm transition-colors shrink-0"
            >
              Equalizar Automaticamente
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
