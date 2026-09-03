import React, { useState } from 'react';
import {
  Layers,
  Award,
  Sparkles,
  Sliders,
  ChevronDown,
  CheckCircle2,
  Building2,
  Palmtree,
  Clock,
} from 'lucide-react';
import { CommercialWeekPeriod, Seller, GoalLevel } from '../../types';
import { formatCurrency } from '../../services/financialEngine';
import { getSellerIntervalAvailability } from '../../services/availabilityEngine';
import { useApp } from '../../context/AppContext';

interface WeeklySellerLevelsMatrixProps {
  monthlyTarget: number;
  weeks: CommercialWeekPeriod[];
  sellers: Seller[];
  activeLevels: GoalLevel[];
  branchName: string;
  monthNumber?: number;
  year?: number;
}

export const WeeklySellerLevelsMatrix: React.FC<WeeklySellerLevelsMatrixProps> = ({
  monthlyTarget,
  weeks,
  sellers,
  activeLevels,
  branchName,
  monthNumber = 9,
  year = 2026,
}) => {
  const { activeCompany, updateCompany, availabilities, workingDaysSettings } = useApp();
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(1);
  const [editingLevelNames, setEditingLevelNames] = useState<boolean>(false);
  const [levelNames, setLevelNames] = useState<string[]>(() =>
    activeLevels.map((l, i) => l.name || `Nível ${i + 1}`)
  );

  const selectedWeek = weeks.find((w) => w.weekNumber === selectedWeekNumber) || weeks[0];
  const weekWeightPct = selectedWeek ? selectedWeek.weightPercentage : 25;
  const weekUnitTarget = Math.round(monthlyTarget * (weekWeightPct / 100));

  // Calcula a razão de cada nível em relação ao Nível 1
  const baseCompanyLevelTarget = activeLevels[0]?.revenueTarget || 30000;
  const levelRatios = activeLevels.map((lvl) => {
    return baseCompanyLevelTarget > 0 ? lvl.revenueTarget / baseCompanyLevelTarget : 1;
  });

  const handleSaveLevelNames = () => {
    const updatedLevels = activeCompany.levels.map((lvl, index) => {
      if (levelNames[index]) {
        return { ...lvl, name: levelNames[index] };
      }
      return lvl;
    });

    updateCompany(activeCompany.id, { levels: updatedLevels });
    setEditingLevelNames(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
      {/* Header com Título e Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-indigo-600 text-white rounded-xl shadow-xs">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">
                Níveis da Semana por Vendedora (Roteiro Semanal)
              </h3>
              <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {activeLevels.length} Níveis
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Meta da semana desdobrada por vendedora para atingimento de cada faixa de comissão.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEditingLevelNames(!editingLevelNames)}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
        >
          <Sliders className="w-3.5 h-3.5 text-slate-500" />
          {editingLevelNames ? 'Concluir Edição de Nomes' : 'Renomear Níveis'}
        </button>
      </div>

      {/* Editor de Nomes de Nível se ativado */}
      {editingLevelNames && (
        <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Personalizar Nomes dos Níveis da Empresa:
            </span>
            <button
              type="button"
              onClick={handleSaveLevelNames}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition"
            >
              Salvar Novos Nomes
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {activeLevels.map((lvl, index) => (
              <div key={lvl.level} className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Faixa {index + 1}
                </label>
                <input
                  type="text"
                  value={levelNames[index] || ''}
                  onChange={(e) => {
                    const newArr = [...levelNames];
                    newArr[index] = e.target.value;
                    setLevelNames(newArr);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seletor de Semanas */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {weeks.map((w) => {
            const isSelected = w.weekNumber === selectedWeekNumber;
            const wTarget = Math.round(monthlyTarget * (w.weightPercentage / 100));
            return (
              <button
                key={w.weekNumber}
                type="button"
                onClick={() => setSelectedWeekNumber(w.weekNumber)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <span>Semana {w.weekNumber}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isSelected ? 'bg-slate-700 text-amber-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {w.weightPercentage}% ({formatCurrency(wTarget).replace(',00', '')})
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-600 font-semibold px-2 flex items-center gap-2">
          <span>Meta Semanal da Loja ({weekWeightPct}%):</span>
          <strong className="text-indigo-900 font-mono font-bold text-sm bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
            {formatCurrency(weekUnitTarget)}
          </strong>
        </div>
      </div>

      {/* Tabela de Níveis por Vendedora */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white font-bold border-b border-slate-700">
              <th className="p-3">Vendedora / Consultora</th>
              <th className="p-3 text-center">Part. %</th>
              {activeLevels.map((lvl, idx) => {
                const ratio = levelRatios[idx] || 1;
                const ratioPct = Math.round(ratio * 100);
                return (
                  <th key={lvl.level} className="p-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-white font-bold">{lvl.name || `Nível ${idx + 1}`}</span>
                      <span className="text-[10px] text-amber-300 font-medium">
                        {lvl.commissionPercentage}% comissão {ratioPct !== 100 ? `(${ratioPct}%)` : ''}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sellers.length === 0 ? (
              <tr>
                <td colSpan={2 + activeLevels.length} className="p-6 text-center text-slate-400">
                  Nenhuma vendedora ativa cadastrada nesta unidade.
                </td>
              </tr>
            ) : (
              sellers.map((seller) => {
                const sharePct = seller.officialSharePercentage ?? (100 / sellers.length);
                const sellerBaseWeekTarget = Math.round(weekUnitTarget * (sharePct / 100));

                const mStr = String(monthNumber || 9).padStart(2, '0');
                const yr = year || 2026;
                const startDateStr =
                  selectedWeek?.startDate ||
                  `${yr}-${mStr}-${String(selectedWeek?.startDay || 1).padStart(2, '0')}`;
                const endDateStr =
                  selectedWeek?.endDate ||
                  `${yr}-${mStr}-${String(selectedWeek?.endDay || 7).padStart(2, '0')}`;

                const avail = getSellerIntervalAvailability(
                  seller.id,
                  startDateStr,
                  endDateStr,
                  availabilities || [],
                  workingDaysSettings
                );

                const isFullAbsence = avail.factor === 0 && avail.daysExpected > 0;
                const isPartialAbsence = avail.factor > 0 && avail.factor < 1;
                const sellerAdjustedWeekTarget = Math.round(sellerBaseWeekTarget * avail.factor);

                return (
                  <tr key={seller.id} className={`hover:bg-slate-50/80 transition-colors ${isFullAbsence ? 'bg-amber-50/30' : ''}`}>
                    <td className="p-3 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-black text-[10px] shrink-0">
                          {seller.name.charAt(0)}
                        </div>
                        <span className="truncate">{seller.name}</span>
                      </div>
                      {isFullAbsence && (
                        <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                          <Palmtree className="w-3 h-3 text-amber-700" />
                          <span>De Férias nesta semana (0 dias)</span>
                        </div>
                      )}
                      {isPartialAbsence && (
                        <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-bold">
                          <Clock className="w-2.5 h-2.5 text-amber-700" />
                          <span>Férias parciais ({avail.daysAvailable}/{avail.daysExpected} dias)</span>
                        </div>
                      )}
                    </td>

                    <td className="p-3 text-center font-mono font-bold text-indigo-700 bg-indigo-50/30">
                      {sharePct.toFixed(1)}%
                    </td>

                    {activeLevels.map((lvl, idx) => {
                      const ratio = levelRatios[idx] || 1;
                      const levelTarget = Math.round(sellerAdjustedWeekTarget * ratio);
                      return (
                        <td key={lvl.level} className="p-3 text-right font-mono font-bold">
                          {isFullAbsence ? (
                            <span className="text-amber-800 font-bold text-xs">R$ 0,00</span>
                          ) : (
                            <span
                              className={`px-2 py-1 rounded-lg ${
                                idx === 0
                                  ? 'bg-slate-100 text-slate-800'
                                  : idx === 1
                                  ? 'bg-blue-50 text-blue-800'
                                  : idx === 2
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : 'bg-purple-50 text-purple-800'
                              }`}
                            >
                              {formatCurrency(levelTarget)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Nota Explicativa do Cálculo */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
        <span className="font-bold text-slate-800">💡 Como o valor da vendedora é calculado:</span>
        <span className="font-mono text-slate-700">
          Meta Mensal (R$ {monthlyTarget.toLocaleString('pt-BR')}) × Peso da Semana ({weekWeightPct}%) × Participação da Vendedora (%) × Fator do Nível
        </span>
      </div>
    </div>
  );
};
