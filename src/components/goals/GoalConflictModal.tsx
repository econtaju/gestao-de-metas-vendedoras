import React from 'react';
import { AlertTriangle, CheckCircle2, ArrowRight, X, Sparkles, Building2 } from 'lucide-react';
import { formatCurrency } from '../../services/financialEngine';

interface GoalConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  generatorTarget: number;
  settingsTarget: number;
  branchName: string;
  onKeepGeneratorTarget: () => void;
  onUseSettingsTarget: () => void;
  onKeepGeneratorOnly: () => void;
}

export const GoalConflictModal: React.FC<GoalConflictModalProps> = ({
  isOpen,
  onClose,
  generatorTarget,
  settingsTarget,
  branchName,
  onKeepGeneratorTarget,
  onUseSettingsTarget,
  onKeepGeneratorOnly,
}) => {
  if (!isOpen) return null;

  const diff = generatorTarget - settingsTarget;
  const diffPct = settingsTarget > 0 ? (diff / settingsTarget) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Diferença de Metas Detectada
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Unidade: <strong className="text-slate-800">{branchName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem explicativa */}
        <p className="text-xs text-slate-600 leading-relaxed">
          A meta definida no <strong>Gerador de Metas</strong> é diferente da <strong>Meta Base cadastrada nas Configurações da Empresa</strong>. Selecione qual valor deseja manter para sincronizar os relatórios:
        </p>

        {/* Quadro Comparativo das Duas Metas */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Meta nas Configurações
              </span>
              <span className="text-base font-extrabold font-mono text-slate-800">
                {formatCurrency(settingsTarget)}
              </span>
            </div>

            <div className="p-3 bg-indigo-50/80 rounded-lg border border-indigo-200">
              <span className="text-[10px] font-bold uppercase text-indigo-700 block mb-1">
                Meta no Gerador
              </span>
              <span className="text-base font-extrabold font-mono text-indigo-900">
                {formatCurrency(generatorTarget)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/80">
            <span className="text-slate-500 font-medium">Variação:</span>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded ${
                diff > 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {diff > 0 ? '+' : ''}
              {formatCurrency(diff)} ({diffPct > 0 ? '+' : ''}
              {diffPct.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Opções de Escolha */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={onKeepGeneratorTarget}
            className="w-full p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-between shadow-xs"
          >
            <span>
              Manter R$ {generatorTarget.toLocaleString('pt-BR')} no Gerador & Sincronizar Configurações
            </span>
            <CheckCircle2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onUseSettingsTarget}
            className="w-full p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition flex items-center justify-between border border-slate-200"
          >
            <span>
              Usar R$ {settingsTarget.toLocaleString('pt-BR')} das Configurações no Gerador
            </span>
            <ArrowRight className="w-4 h-4 text-slate-500" />
          </button>

          <button
            type="button"
            onClick={onKeepGeneratorOnly}
            className="w-full p-2.5 text-slate-500 hover:text-slate-700 font-semibold text-[11px] text-center transition"
          >
            Salvar no Gerador sem alterar o cadastro das Configurações
          </button>
        </div>
      </div>
    </div>
  );
};
