import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Sliders,
  DollarSign,
  Percent,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  Save,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GoalLevel, GoalScenarioType, PeriodType } from '../../types';
import { formatCurrency } from '../../services/financialEngine';

export const CompanySettings: React.FC = () => {
  const {
    activeCompany,
    companyBranches,
    updateCompany,
    addBranch,
    updateBranch,
    deleteBranch,
    setCurrentView,
    applyMonthlyTargetToAllBranches,
    activeBranchId,
    setActiveBranchId,
    currentUser,
    activeUserRole,
  } = useApp();

  const isConsultant = (currentUser?.role || activeUserRole) === 'consultant';

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Form local state initialized with activeCompany values
  const [formData, setFormData] = useState({
    name: activeCompany.name,
    tradeName: activeCompany.tradeName,
    document: activeCompany.document || '',
    segment: activeCompany.segment,
    defaultPeriod: activeCompany.defaultPeriod,
    numberOfLevels: activeCompany.numberOfLevels,
    goalScenario: activeCompany.goalScenario,
    notes: activeCompany.notes || '',
    financialSettings: { ...activeCompany.financialSettings },
  });

  const [levels, setLevels] = useState<GoalLevel[]>([...activeCompany.levels]);

  // Sync state if activeCompany changes
  useEffect(() => {
    setFormData({
      name: activeCompany.name,
      tradeName: activeCompany.tradeName,
      document: activeCompany.document || '',
      segment: activeCompany.segment,
      defaultPeriod: activeCompany.defaultPeriod,
      numberOfLevels: activeCompany.numberOfLevels,
      goalScenario: activeCompany.goalScenario,
      notes: activeCompany.notes || '',
      financialSettings: { ...activeCompany.financialSettings },
    });
    setLevels([...activeCompany.levels]);
  }, [activeCompany]);

  // Branch management modal or quick add state
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchType, setNewBranchType] = useState<'headquarters' | 'branch'>('branch');
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editingBranchName, setEditingBranchName] = useState('');
  const [editingBranchType, setEditingBranchType] = useState<'headquarters' | 'branch'>('branch');

  const handleLevelChange = (
    index: number,
    field: 'name' | 'revenueTarget' | 'commissionPercentage',
    value: string | number
  ) => {
    setLevels((prev) =>
      prev.map((lvl, i) => (i === index ? { ...lvl, [field]: value } : lvl))
    );
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: 1..4 levels targets order
    for (let i = 1; i < formData.numberOfLevels; i++) {
      if (levels[i] && levels[i - 1] && levels[i].revenueTarget <= levels[i - 1].revenueTarget) {
        alert(
          `Erro de validação: ${levels[i].name} (R$ ${levels[i].revenueTarget.toLocaleString()}) deve ser maior que ${levels[i - 1].name} (R$ ${levels[i - 1].revenueTarget.toLocaleString()}).`
        );
        return;
      }
    }

    updateCompany(activeCompany.id, {
      name: formData.name,
      tradeName: formData.tradeName,
      document: formData.document,
      segment: formData.segment,
      defaultPeriod: formData.defaultPeriod,
      numberOfLevels: formData.numberOfLevels,
      goalScenario: formData.goalScenario,
      notes: formData.notes,
      financialSettings: formData.financialSettings,
      levels: levels.slice(0, formData.numberOfLevels),
    });

    // Sincroniza a meta base para masterGoals em todas as filiais
    if (levels[0] && levels[0].revenueTarget > 0) {
      applyMonthlyTargetToAllBranches(levels[0].revenueTarget, 9, 2026);
    }

    setSavedSuccess(true);
    showToast('Configurações salvas e aplicadas a todas as abas!');
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) {
      alert('Por favor, informe o nome da unidade / filial.');
      return;
    }

    addBranch({
      companyId: activeCompany.id,
      name: newBranchName.trim(),
      type: newBranchType,
      active: true,
    });
    showToast(`Unidade "${newBranchName}" adicionada com sucesso!`);
    setNewBranchName('');
  };

  const handleStartEditBranch = (branch: { id: string; name: string; type: 'headquarters' | 'branch' }) => {
    setEditingBranchId(branch.id);
    setEditingBranchName(branch.name);
    setEditingBranchType(branch.type);
  };

  const handleSaveEditBranch = (id: string) => {
    if (!editingBranchName.trim()) return;
    updateBranch(id, {
      name: editingBranchName.trim(),
      type: editingBranchType,
    });
    setEditingBranchId(null);
    showToast('Unidade atualizada com sucesso!');
  };

  return (
    <div id="company-settings-view" className="space-y-6 pb-12">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Settings className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Configurações da Empresa & Parâmetros Financeiros
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Personalize dados cadastrais, unidades matriz/filiais, percentuais de custos variáveis e
            regras de níveis de meta de {activeCompany.tradeName}.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveCompany}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 transition cursor-pointer"
        >
          <Save className="w-4 h-4" />
          Salvar Todas as Configurações
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          As configurações da empresa foram salvas e aplicadas com sucesso a todos os módulos!
        </div>
      )}

      <form onSubmit={handleSaveCompany} className="space-y-6">
        {/* Section 1: Dados Gerais da Empresa */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-slate-700" />
            <h3 className="font-bold text-slate-900 text-sm">Dados Cadastrais da Empresa</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Razão Social</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Nome Fantasia</label>
              <input
                type="text"
                required
                value={formData.tradeName}
                onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">CNPJ (Opcional)</label>
              <input
                type="text"
                value={formData.document}
                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                placeholder="00.000.000/0001-00"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Segmento de Atuação</label>
              <input
                type="text"
                value={formData.segment}
                onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                placeholder="Ex: Ótica e Varejo, Calçados..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Configuração dos Níveis de Meta (1 a 4 Níveis) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                Configuração dos Níveis de Meta & Escala de Comissões
              </h3>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-700">Número de Níveis:</span>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setFormData({ ...formData, numberOfLevels: num })}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                      formData.numberOfLevels === num
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {num} {num === 1 ? 'Nível' : 'Níveis'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dica & Atalho para Planejamento Mês a Mês */}
          <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                <span>📅 Metas Mensais Customizadas para Cada Mês do Ano?</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Os campos abaixo definem a <strong>base de referência da empresa</strong>. Para definir a <strong>meta individual de cada mês</strong> e distribuir entre semanas e consultoras, use o Gerador FP&A.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentView('goals_generator')}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors whitespace-nowrap shadow-sm text-xs flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer"
            >
              <span>Abrir Gerador de Metas Mês a Mês</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {levels.slice(0, formData.numberOfLevels).map((lvl, index) => (
              <div
                key={lvl.level}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={lvl.name}
                    onChange={(e) => handleLevelChange(index, 'name', e.target.value)}
                    placeholder={`Nome da Meta ${index + 1}`}
                    className="bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs px-2.5 py-1 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                  />
                  <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">Faixa {index + 1}</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Meta de Faturamento (R$)
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={lvl.revenueTarget}
                    onChange={(e) =>
                      handleLevelChange(index, 'revenueTarget', Number(e.target.value))
                    }
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Comissão Oficial %
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      value={lvl.commissionPercentage}
                      onChange={(e) =>
                        handleLevelChange(index, 'commissionPercentage', Number(e.target.value))
                      }
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="font-bold text-slate-600 text-xs">%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Parâmetros Financeiros e Custos Variáveis */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Percent className="w-4 h-4 text-slate-700" />
            <h3 className="font-bold text-slate-900 text-sm">
              Custos Variáveis e Estrutura Financeira
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                CMV Médio (Custo da Mercadoria Vendida) %
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={formData.financialSettings.cmvPercentage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      financialSettings: {
                        ...formData.financialSettings,
                        cmvPercentage: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-sm"
                />
                <span className="font-bold text-slate-600">%</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Alíquota Média de Impostos (Simples/ICMS) %
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={formData.financialSettings.taxPercentage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      financialSettings: {
                        ...formData.financialSettings,
                        taxPercentage: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-sm"
                />
                <span className="font-bold text-slate-600">%</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Taxas Médias de Cartão / Meios de Pagamento %
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={formData.financialSettings.cardFeePercentage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      financialSettings: {
                        ...formData.financialSettings,
                        cardFeePercentage: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-sm"
                />
                <span className="font-bold text-slate-600">%</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Outros Custos Variáveis % (Embalagens, Fretes)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={formData.financialSettings.otherVariableCostsPercentage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      financialSettings: {
                        ...formData.financialSettings,
                        otherVariableCostsPercentage: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-sm"
                />
                <span className="font-bold text-slate-600">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Unidades (Matriz & Filiais) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-700" />
              <h3 className="font-bold text-slate-900 text-sm">
                Unidades de Negócio & Lojas da Empresa ({companyBranches.length})
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Vincule vendedores e metas a cada unidade cadastrada
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* List of Branches */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block mb-1">Unidades Cadastradas:</span>
              {companyBranches.map((branch) => {
                const isEditing = editingBranchId === branch.id;
                const isSelectedInTop = activeBranchId === branch.id;

                return (
                  <div
                    key={branch.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      isSelectedInTop
                        ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editingBranchName}
                          onChange={(e) => setEditingBranchName(e.target.value)}
                          className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold outline-none"
                        />
                        <select
                          value={editingBranchType}
                          onChange={(e) => setEditingBranchType(e.target.value as any)}
                          className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-medium outline-none"
                        >
                          <option value="headquarters">Matriz</option>
                          <option value="branch">Filial</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleSaveEditBranch(branch.id)}
                          className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingBranchId(null)}
                          className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div
                          className="cursor-pointer flex-1"
                          onClick={() => {
                            setActiveBranchId(branch.id);
                            showToast(`Filial "${branch.name}" selecionada como unidade ativa no topo.`);
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{branch.name}</span>
                            {isSelectedInTop && (
                              <span className="px-1.5 py-0.2 bg-emerald-600 text-white text-[9px] font-bold rounded-full">
                                Ativa
                              </span>
                            )}
                          </div>
                          <span className="block text-[10px] text-slate-500">
                            {branch.type === 'headquarters' ? '🏢 Unidade Matriz' : '🏬 Filial'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEditBranch(branch)}
                            title="Editar Unidade"
                            className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {companyBranches.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Tem certeza que deseja excluir a unidade "${branch.name}"?`)) {
                                  deleteBranch(branch.id);
                                  showToast(`Unidade "${branch.name}" excluída com sucesso.`);
                                }
                              }}
                              title="Excluir Unidade"
                              className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Branch Inline Form */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3 text-xs flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-800 mb-2">Adicionar Nova Unidade / Filial</h4>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Nome da Unidade / Loja *</label>
                  <input
                    type="text"
                    placeholder="Ex: Filial Shopping Barra, Loja Centro..."
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <select
                  value={newBranchType}
                  onChange={(e) => setNewBranchType(e.target.value as any)}
                  className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="branch">Tipo: Filial</option>
                  <option value="headquarters">Tipo: Matriz</option>
                </select>

                <button
                  type="button"
                  onClick={handleAddBranch}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1 shadow-sm transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Unidade
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
