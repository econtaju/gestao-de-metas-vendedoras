import React, { useState } from 'react';
import {
  Calendar,
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  RotateCcw,
  Clock,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { CommercialWeekPeriod, WeeklyWeightTemplate } from '../../types';
import { formatCurrency } from '../../services/financialEngine';

interface WeeklyWeightSelectorProps {
  numberOfWeeks: 4 | 5;
  onWeeksCountChange: (weeks: 4 | 5) => void;
  weeks: CommercialWeekPeriod[];
  onWeekWeightChange: (weekNumber: number, newWeight: number) => void;
  onWeekPeriodChange: (weekNumber: number, startDate: string, endDate: string) => void;
  templates: WeeklyWeightTemplate[];
  selectedTemplateId?: string;
  onApplyTemplate: (template: WeeklyWeightTemplate) => void;
  onSuggestFromHistory: () => void;
  monthlyTarget: number;
  onAutoAdjustWeights?: () => void;
  onSaveCustomTemplate?: (template: WeeklyWeightTemplate) => void;
}

export const WeeklyWeightSelector: React.FC<WeeklyWeightSelectorProps> = ({
  numberOfWeeks,
  onWeeksCountChange,
  weeks,
  onWeekWeightChange,
  onWeekPeriodChange,
  templates,
  selectedTemplateId,
  onApplyTemplate,
  onSuggestFromHistory,
  monthlyTarget,
  onAutoAdjustWeights,
  onSaveCustomTemplate,
}) => {
  const totalWeight = Math.round(weeks.reduce((acc, w) => acc + (w.weightPercentage || 0), 0) * 10) / 10;
  const isWeightValid = Math.abs(totalWeight - 100) < 0.05;
  const diffWeight = Math.round((100 - totalWeight) * 10) / 10;

  // Filtra templates compatíveis com o número de semanas selecionado
  const filteredTemplates = templates.filter((t) => t.weeksCount === numberOfWeeks);

  // Estado para edição rápida de porcentagens de um modelo
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingWeights, setEditingWeights] = useState<number[]>([]);
  const [editingName, setEditingName] = useState<string>('');

  const handleStartEditTemplate = (e: React.MouseEvent, t: WeeklyWeightTemplate) => {
    e.stopPropagation();
    setEditingTemplateId(t.id);
    setEditingWeights([...t.weights]);
    setEditingName(t.name);
  };

  const handleSaveTemplateEdit = (e: React.MouseEvent, t: WeeklyWeightTemplate) => {
    e.stopPropagation();
    const sum = editingWeights.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.1) {
      alert(`A soma dos pesos editados precisa fechar em 100% (atualmente está em ${sum}%).`);
      return;
    }

    const updatedTemplate: WeeklyWeightTemplate = {
      ...t,
      name: editingName.trim() || t.name,
      weights: editingWeights,
    };

    if (onSaveCustomTemplate) {
      onSaveCustomTemplate(updatedTemplate);
    }
    onApplyTemplate(updatedTemplate);
    setEditingTemplateId(null);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header com seletor de 4 ou 5 semanas */}
      <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Distribuição da Meta por Semanas Comerciais
            </h3>
            <p className="text-xs text-slate-500">
              Defina os períodos do mês e a intensidade esperada de vendas para cada semana.
            </p>
          </div>
        </div>

        {/* Toggle 4 vs 5 semanas */}
        <div className="flex items-center bg-slate-200/80 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => onWeeksCountChange(4)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              numberOfWeeks === 4
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            4 Semanas (Padrão)
          </button>
          <button
            type="button"
            onClick={() => onWeeksCountChange(5)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              numberOfWeeks === 5
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            5 Semanas (Fechamento)
          </button>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Templates Rápidos de Distribuição */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Modelos Rápidos de Distribuição:
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400">
                (Clique no ícone de lápis para editar as porcentagens de qualquer modelo)
              </span>
              <button
                type="button"
                onClick={onSuggestFromHistory}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Sugerir pelo Histórico
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {filteredTemplates.map((template) => {
              const isSelected = selectedTemplateId === template.id;
              const isEditing = editingTemplateId === template.id;

              if (isEditing) {
                return (
                  <div
                    key={template.id}
                    className="p-3 rounded-xl border-2 border-indigo-500 bg-indigo-50/80 shadow-md space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="font-bold text-xs bg-white border border-indigo-300 rounded px-1.5 py-0.5 w-full text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-indigo-900 block">
                        Pesos por Semana (%):
                      </span>
                      <div className="grid grid-cols-4 gap-1">
                        {editingWeights.map((w, idx) => (
                          <div key={idx} className="text-center">
                            <span className="text-[9px] text-slate-500 block">S{idx + 1}</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={w}
                              onChange={(e) => {
                                const newW = parseFloat(e.target.value) || 0;
                                const copy = [...editingWeights];
                                copy[idx] = newW;
                                setEditingWeights(copy);
                              }}
                              className="w-full text-center font-bold font-mono bg-white border border-slate-300 rounded p-1 text-xs text-indigo-900"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-indigo-200">
                      <span className="text-[10px] font-mono font-bold text-indigo-800">
                        Total: {editingWeights.reduce((a, b) => a + b, 0)}%
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingTemplateId(null)}
                          className="p-1 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 cursor-pointer"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleSaveTemplateEdit(e, template)}
                          className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded cursor-pointer"
                          title="Salvar e Aplicar"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={template.id}
                  onClick={() => onApplyTemplate(template)}
                  className={`p-3 rounded-lg text-left border transition-all cursor-pointer group relative ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-200'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800">{template.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleStartEditTemplate(e, template)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded transition"
                        title="Editar porcentagens deste modelo"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600 font-semibold mb-1">
                    {template.weights.map((w, idx) => (
                      <span key={idx} className="bg-slate-200/60 px-1 py-0.5 rounded">
                        {w}%
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-1">{template.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Linhas das Semanas Comerciais */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 border-b border-slate-100 pb-2 px-1">
            <span>Período Comercial</span>
            <div className="flex items-center gap-12">
              <span className="w-24 text-right">Peso (%)</span>
              <span className="w-28 text-right">Meta da Semana</span>
            </div>
          </div>

          {weeks.map((week) => {
            const weekTarget = Math.round(monthlyTarget * (week.weightPercentage / 100));

            return (
              <div
                key={week.weekNumber}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/40 hover:bg-slate-50 gap-3 transition-colors"
              >
                {/* Identificação e Datas */}
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                    S{week.weekNumber}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <span>Semana {week.weekNumber}</span>
                      <span className="text-[11px] font-normal text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                        {week.label || `Semana ${week.weekNumber}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>
                        Dia {week.startDay ?? (week.startDate ? parseInt(week.startDate.split('-')[2], 10) : [1, 8, 16, 24][week.weekNumber - 1] ?? 1)} ao dia {week.endDay ?? (week.endDate ? parseInt(week.endDate.split('-')[2], 10) : [7, 15, 23, 31][week.weekNumber - 1] ?? 31)} do mês
                      </span>
                    </div>
                  </div>
                </div>

                {/* Slider / Input de Peso & Valor em R$ */}
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="1"
                      value={week.weightPercentage}
                      onChange={(e) => onWeekWeightChange(week.weekNumber, parseFloat(e.target.value) || 0)}
                      className="w-24 sm:w-28 accent-indigo-600 cursor-pointer"
                    />
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={week.weightPercentage}
                        onChange={(e) => onWeekWeightChange(week.weekNumber, parseFloat(e.target.value) || 0)}
                        className="w-14 px-2 py-1 text-xs font-mono font-bold text-right text-slate-800 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                      <span className="absolute right-1 top-1 text-[10px] text-slate-400 font-mono pointer-events-none">
                        %
                      </span>
                    </div>
                  </div>

                  <div className="text-right w-28 shrink-0">
                    <span className="text-xs font-mono font-bold text-slate-900 block">
                      {formatCurrency(weekTarget)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {(weekTarget / Math.max(1, (
                        (week.endDay && week.startDay)
                          ? (week.endDay - week.startDay + 1)
                          : (week.endDate && week.startDate)
                          ? (parseInt(week.endDate.split('-')[2], 10) - parseInt(week.startDate.split('-')[2], 10) + 1)
                          : 7
                      ))).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}/dia
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Barra de Validação dos 100% */}
        <div
          className={`p-3.5 rounded-lg border flex items-center justify-between transition-all ${
            isWeightValid
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
              : 'bg-amber-50/90 border-amber-200 text-amber-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isWeightValid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <div>
              <p className="text-xs font-semibold">
                {isWeightValid
                  ? 'Distribuição Semanal Consistente (Total: 100%)'
                  : `A soma dos pesos está em ${totalWeight}%. ${
                      diffWeight > 0
                        ? `Faltam ${diffWeight} p.p. para completar 100%.`
                        : `Excede em +${Math.abs(diffWeight)} p.p.`
                    }`}
              </p>
              <p className="text-[11px] opacity-80">
                {isWeightValid
                  ? 'A meta semanal somada corresponde exatamente a 100% da meta mensal da unidade.'
                  : 'Ajuste os percentuais das semanas para que o total feche exatamente em 100%.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isWeightValid && onAutoAdjustWeights && (
              <button
                type="button"
                onClick={onAutoAdjustWeights}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 rounded-lg shadow-sm transition-colors shrink-0 cursor-pointer"
              >
                Ajustar Automaticamente
              </button>
            )}
            <span
              className={`text-sm font-mono font-bold px-2.5 py-1 rounded-md ${
                isWeightValid ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
              }`}
            >
              {totalWeight}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
