import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Plus,
  Building2,
  Calendar,
  DollarSign,
  Target,
  Award,
  TrendingUp,
  Sparkles,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Layers,
  Percent,
  UserPlus,
  FileSpreadsheet,
  FileCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Seller } from '../../types';
import {
  formatCurrency,
  formatPercent,
  getActiveLevels,
  calculateSalePerformance,
} from '../../services/financialEngine';
import { SellerMasterGoalTracker } from './SellerMasterGoalTracker';
import { SellerGoalCardModal } from '../goals/SellerGoalCardModal';

export const SellersView: React.FC = () => {
  const {
    activeCompany,
    companyBranches,
    companySellers,
    companySales,
    addSeller,
    batchAddSellers,
    updateSeller,
    deleteSeller,
    activeBranchId,
    activePeriodNumber,
    getSellerCalculation,
    getSellerGoalDetail,
    activeMasterGoal,
  } = useApp();

  const [selectedSellerId, setSelectedSellerId] = useState<string>(
    () => companySellers[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'master_goal' | 'weekly_tiers'>('master_goal');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [batchInput, setBatchInput] = useState<string>('');
  const [batchBranchId, setBatchBranchId] = useState<string>(() => companyBranches[0]?.id || '');
  const [batchSeniority, setBatchSeniority] = useState<'senior' | 'pleno' | 'junior'>('pleno');
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(9); // Setembro
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedSellerForReport, setSelectedSellerForReport] = useState<Seller | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Re-sincroniza selectedSellerId quando a empresa muda ou vendedoras são carregadas
  useEffect(() => {
    if (!companySellers.some((s) => s.id === selectedSellerId)) {
      setSelectedSellerId(companySellers[0]?.id || '');
    }
  }, [companySellers, selectedSellerId]);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    branchId: companyBranches[0]?.id || '',
    role: 'Consultor de Vendas',
    email: '',
    active: true,
    startDate: '2026-01-05',
    weeklyTarget: 0,
    monthlyTarget: 0,
    officialSharePercentage: 25,
    seniorityLevel: 'pleno' as 'A' | 'B' | 'C' | 'senior' | 'pleno' | 'junior',
    averageTicket: 0,
    notes: '',
  });

  const activeLevels = useMemo(
    () => getActiveLevels(activeCompany.levels, activeCompany.numberOfLevels),
    [activeCompany]
  );

  const selectedSeller = useMemo(() => {
    return companySellers.find((s) => s.id === selectedSellerId) || companySellers[0];
  }, [companySellers, selectedSellerId]);

  // Master Goal Detail for active seller (Hierarquia Mensal -> Semanas)
  const masterGoalDetail = useMemo(() => {
    if (!selectedSeller) return null;
    return getSellerGoalDetail(selectedSeller.id, selectedMonth, selectedYear);
  }, [selectedSeller, getSellerGoalDetail, selectedMonth, selectedYear]);

  // Selected seller's sales in active period (e.g. Week 12)
  const currentPeriodSale = useMemo(() => {
    if (!selectedSeller) return null;
    return (
      companySales.find(
        (s) =>
          s.sellerId === selectedSeller.id &&
          s.periodNumber === activePeriodNumber &&
          s.periodType === 'weekly'
      ) || null
    );
  }, [selectedSeller, companySales, activePeriodNumber]);

  // Performance calculation for active seller
  const sellerPerf = useMemo(() => {
    if (!selectedSeller) return null;
    const rev = currentPeriodSale?.revenue || 0;
    return calculateSalePerformance(
      rev,
      activeCompany.levels,
      activeCompany.numberOfLevels,
      activeCompany.financialSettings,
      selectedSeller.weeklyTarget || 0
    );
  }, [selectedSeller, currentPeriodSale, activeCompany]);

  const handleOpenAdd = () => {
    setEditingSeller(null);
    setFormData({
      name: '',
      branchId:
        (activeBranchId !== 'all' ? activeBranchId : null) ||
        companySellers[0]?.branchId ||
        companyBranches[0]?.id ||
        `branch-${activeCompany.id}-matriz`,
      role: 'Consultor de Vendas',
      email: '',
      active: true,
      startDate: new Date().toISOString().split('T')[0],
      weeklyTarget: 0,
      monthlyTarget: 0,
      officialSharePercentage: companySellers.length > 0 ? Math.round((100 / (companySellers.length + 1)) * 10) / 10 : 100,
      seniorityLevel: 'pleno',
      averageTicket: 0,
      notes: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (s: Seller) => {
    setEditingSeller(s);
    setFormData({
      name: s.name,
      branchId: s.branchId || companyBranches[0]?.id || `branch-${activeCompany.id}-matriz`,
      role: s.role,
      email: s.email || '',
      active: s.active,
      startDate: s.startDate,
      weeklyTarget: s.weeklyTarget || 0,
      monthlyTarget: s.monthlyTarget || 0,
      officialSharePercentage: s.officialSharePercentage ?? 25,
      seniorityLevel: s.seniorityLevel || 'pleno',
      averageTicket: s.averageTicket || 0,
      notes: s.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Informe o nome do vendedor.');
      return;
    }

    const effectiveBranchId = formData.branchId || companyBranches[0]?.id || `branch-${activeCompany.id}-matriz`;

    if (editingSeller) {
      updateSeller(editingSeller.id, {
        name: formData.name,
        branchId: effectiveBranchId,
        role: formData.role,
        email: formData.email,
        active: formData.active,
        startDate: formData.startDate,
        weeklyTarget: Number(formData.weeklyTarget),
        monthlyTarget: Number(formData.monthlyTarget),
        officialSharePercentage: Number(formData.officialSharePercentage),
        seniorityLevel: formData.seniorityLevel,
        averageTicket: Number(formData.averageTicket),
        notes: formData.notes,
      });
      showToast(`Alterações do vendedor "${formData.name}" salvas com sucesso!`);
    } else {
      const newId = addSeller({
        companyId: activeCompany.id,
        branchId: effectiveBranchId,
        name: formData.name,
        role: formData.role,
        email: formData.email,
        active: formData.active,
        startDate: formData.startDate,
        weeklyTarget: Number(formData.weeklyTarget),
        monthlyTarget: Number(formData.monthlyTarget),
        officialSharePercentage: Number(formData.officialSharePercentage),
        seniorityLevel: formData.seniorityLevel,
        averageTicket: Number(formData.averageTicket),
        notes: formData.notes,
      });
      setSelectedSellerId(newId);
      showToast(`Vendedor "${formData.name}" cadastrado com sucesso!`);
    }

    setShowModal(false);
  };

  const handleDelete = (s: Seller) => {
    if (window.confirm(`Deseja realmente remover o(a) vendedor(a) "${s.name}"?`)) {
      deleteSeller(s.id);
      showToast(`Vendedor(a) "${s.name}" excluído(a) com sucesso.`);
    }
  };

  return (
    <div id="sellers-management-view" className="space-y-6 pb-12">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Equipe Comercial & Acompanhamento de Metas
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão dos vendedores da {activeCompany.tradeName}, desdobramento de metas por semanas comerciais e emissão de relatórios individuais.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setBatchInput('');
              setBatchFeedback(null);
              setBatchBranchId(
                (activeBranchId !== 'all' ? activeBranchId : null) ||
                companySellers[0]?.branchId ||
                companyBranches[0]?.id ||
                ''
              );
              setShowBatchModal(true);
            }}
            className="w-full sm:w-auto justify-center flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-indigo-600" />
            ⚡ Cadastrar em Lote
          </button>

          <button
            onClick={handleOpenAdd}
            className="w-full sm:w-auto justify-center flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Novo Vendedor
          </button>
        </div>
      </div>

      {/* Main Grid: Seller Selector List & Detailed Individual Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Sellers List */}
        <div className="lg:col-span-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Vendedores Ativos ({companySellers.length})
            </span>
          </div>

          <div className="space-y-2 max-h-[280px] lg:max-h-[650px] overflow-y-auto pr-1">
            {companySellers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                <Users className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-semibold text-slate-600">Nenhum vendedor cadastrado nesta empresa.</p>
                <p>Clique em "+ Cadastrar Novo Vendedor" ou "⚡ Cadastrar em Lote" para começar.</p>
              </div>
            ) : (
              companySellers.map((seller) => {
                const branch = companyBranches.find((b) => b.id === seller.branchId);
                const isSelected = seller.id === selectedSeller?.id;
                const sellerDetail = getSellerGoalDetail(seller.id, selectedMonth, selectedYear);

                return (
                  <div
                    key={seller.id}
                    onClick={() => setSelectedSellerId(seller.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-300 shadow-sm ring-1 ring-indigo-200'
                        : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-xs text-slate-900">{seller.name}</div>
                        <div className="text-[11px] text-slate-500">{seller.role}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{branch?.name || 'Matriz'}</div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-xs text-slate-900">
                          {sellerDetail ? formatCurrency(sellerDetail.monthlyTarget) : formatCurrency(seller.monthlyTarget || 0)}
                        </div>
                        <span className="text-[10px] font-mono font-semibold text-indigo-700 bg-indigo-100/60 px-1.5 py-0.5 rounded inline-block mt-1">
                          Part: {seller.officialSharePercentage ?? 25}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/50">
                      <span className="text-[10px] text-slate-500">
                        {seller.seniorityLevel === 'senior' ? 'Nível A (Sênior)' : seller.seniorityLevel === 'pleno' ? 'Nível B (Pleno)' : 'Nível C (Júnior)'}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSellerForReport(seller);
                          }}
                          className="text-[11px] text-emerald-600 hover:text-emerald-800 font-semibold flex items-center gap-0.5"
                          title="Ver Relatório e WhatsApp"
                        >
                          <FileCheck className="w-3 h-3" /> Relatório
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(seller);
                          }}
                          className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-0.5"
                        >
                          <Edit2 className="w-3 h-3" /> Editar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(seller);
                          }}
                          className="text-[11px] text-rose-500 hover:text-rose-700 flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3 h-3" /> Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Tracker / Performance Matrix */}
        <div className="lg:col-span-8 space-y-4">
          {selectedSeller ? (
            <>
              {/* Tab Navigation */}
              <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveTab('master_goal')}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                      activeTab === 'master_goal'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    🎯 Meta Mensal & Desdobramento Semanal
                  </button>
                  <button
                    onClick={() => setActiveTab('weekly_tiers')}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                      activeTab === 'weekly_tiers'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    🏆 Faixas de Meta (Semana {activePeriodNumber})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSellerForReport(selectedSeller)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Relatório & WhatsApp</span>
                </button>
              </div>

              {/* Conteúdo da Aba 1: Master Goal Tracker */}
              {activeTab === 'master_goal' && (
                <SellerMasterGoalTracker
                  seller={selectedSeller}
                  goalDetail={masterGoalDetail}
                />
              )}

              {/* Conteúdo da Aba 2: Faixas de Níveis da Semana Atual */}
              {activeTab === 'weekly_tiers' && sellerPerf && (
                <div className="space-y-5">
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl text-white shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold tracking-tight text-white">
                            {selectedSeller.name}
                          </h3>
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold px-2.5 py-0.5 rounded-full">
                            {selectedSeller.role}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {companyBranches.find((b) => b.id === selectedSeller.branchId)?.name || 'Matriz'} &bull; Na empresa desde{' '}
                          {new Date(selectedSeller.startDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>

                      <div className="text-left sm:text-right bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Faturamento Atual (Semana {activePeriodNumber})
                        </span>
                        <span className="text-xl font-extrabold text-emerald-400">
                          {formatCurrency(sellerPerf.revenue)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 pt-5 border-t border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-300">Progresso nas Faixas de Meta:</span>
                        <span className="text-emerald-400 font-bold">
                          {sellerPerf.achievementPercentage.toFixed(1)}% da Meta 1
                        </span>
                      </div>

                      <div className="relative w-full bg-slate-700/80 h-4 rounded-full overflow-hidden p-0.5">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-400 rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              (sellerPerf.revenue /
                                (activeLevels[activeLevels.length - 1]?.revenueTarget || 40000)) *
                                100
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-4 gap-2 pt-2 text-center text-xs">
                        {activeLevels.map((lvl) => {
                          const isReached = sellerPerf.revenue >= lvl.revenueTarget;
                          return (
                            <div
                              key={lvl.level}
                              className={`p-2 rounded-xl border ${
                                isReached
                                  ? 'bg-emerald-900/40 border-emerald-500 text-emerald-200'
                                  : 'bg-slate-800/50 border-slate-700 text-slate-400'
                              }`}
                            >
                              <div className="font-bold text-[11px]">{lvl.name}</div>
                              <div className="text-xs font-semibold">{formatCurrency(lvl.revenueTarget)}</div>
                              <div className="text-[10px] text-amber-300 font-medium">
                                {lvl.commissionPercentage}% comissão
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
              Selecione um vendedor para ver suas metas desdobradas.
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cadastro / Edição Individual */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {editingSeller ? 'Editar Vendedor' : 'Novo Vendedor'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Informe os dados da consultora para alocação e cálculo de comissões.
            </p>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Amanda Silva"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loja / Filial *</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    {companyBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nível de Senioridade</label>
                  <select
                    value={formData.seniorityLevel}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        seniorityLevel: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="senior">Nível A (Sênior)</option>
                    <option value="pleno">Nível B (Pleno)</option>
                    <option value="junior">Nível C (Júnior)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ticket Médio (R$)</label>
                  <input
                    type="number"
                    step="10"
                    placeholder="Ex: 350 (ou 0 se não souber)"
                    value={formData.averageTicket || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        averageTicket: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Usado para calcular atendimentos</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Participação na Loja (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.officialSharePercentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        officialSharePercentage: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-indigo-700"
                  />
                  <span className="text-[10px] text-slate-400">Cota da meta da unidade</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer"
                >
                  Salvar Vendedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cadastro em Lote */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 animate-in fade-in">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              ⚡ Cadastro Rápido de Vendedores em Lote
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Cole múltiplos nomes de uma vez para cadastrar toda a equipe instantaneamente.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!batchInput.trim()) {
                  setBatchFeedback('Por favor, informe ao menos um nome de vendedor.');
                  return;
                }

                const names = batchInput
                  .split(/[\n,;]+/)
                  .map((n) => n.trim())
                  .filter((n) => n.length > 0);

                if (names.length === 0) {
                  setBatchFeedback('Nenhum nome válido encontrado.');
                  return;
                }

                const sharePerSeller = Math.round((100 / Math.max(1, names.length)) * 10) / 10;
                const sellersToAdd = names.map((name) => ({
                  companyId: activeCompany.id,
                  branchId: batchBranchId || companyBranches[0]?.id || `branch-${activeCompany.id}-matriz`,
                  name,
                  role: 'Consultor de Vendas',
                  active: true,
                  startDate: new Date().toISOString().slice(0, 10),
                  officialSharePercentage: sharePerSeller,
                  seniorityLevel: batchSeniority,
                  weeklyTarget: 0,
                  monthlyTarget: 0,
                  averageTicket: 0,
                }));

                const count = batchAddSellers(sellersToAdd);
                setShowBatchModal(false);
                setBatchInput('');
                showToast(`✅ ${count} vendedores cadastrados com sucesso!`);
              }}
              className="p-1 space-y-4 text-xs"
            >
              {batchFeedback && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl">
                  {batchFeedback}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Filial de Destino *
                </label>
                <select
                  value={batchBranchId}
                  onChange={(e) => setBatchBranchId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {companyBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nível Inicial de Senioridade
                </label>
                <select
                  value={batchSeniority}
                  onChange={(e) => setBatchSeniority(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="pleno">Nível B (Pleno) - Padrão</option>
                  <option value="senior">Nível A (Sênior)</option>
                  <option value="junior">Nível C (Júnior)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">
                    Nomes dos Vendedores (1 por linha ou separados por vírgula) *
                  </label>
                  <span className="text-[10px] text-indigo-600 font-bold">
                    {batchInput.split(/[\n,;]+/).filter((n) => n.trim().length > 0).length} identificado(s)
                  </span>
                </div>
                <textarea
                  rows={5}
                  required
                  placeholder={"Exemplo:\nCarlos Eduardo Santos\nJuliana Pereira Lima\nRoberto Costa\nAmanda Oliveira\nFernanda Ribeiro"}
                  value={batchInput}
                  onChange={(e) => {
                    setBatchInput(e.target.value);
                    setBatchFeedback(null);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                />
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-indigo-900 text-[11px] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  O sistema irá distribuir automaticamente o percentual de participação inicial igualmente entre os membros cadastrados.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  Cadastrar Vendedores
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Relatório e Contrato Individual */}
      {selectedSellerForReport && (
        <SellerGoalCardModal
          isOpen={true}
          onClose={() => setSelectedSellerForReport(null)}
          seller={{
            sellerId: selectedSellerForReport.id,
            sellerName: selectedSellerForReport.name,
            officialSharePercentage: selectedSellerForReport.officialSharePercentage ?? 25,
            seniorityLevel: selectedSellerForReport.seniorityLevel,
          }}
          sellerEntity={selectedSellerForReport}
          company={activeCompany}
          branchName={companyBranches.find((b) => b.id === selectedSellerForReport.branchId)?.name || 'Matriz'}
          monthName={masterGoalDetail?.monthName || 'Setembro'}
          year={masterGoalDetail?.year || 2026}
          monthlyTarget={masterGoalDetail?.unitMonthlyTarget || activeMasterGoal?.monthlyTarget || 0}
          weeks={(masterGoalDetail?.weeklyGoals || activeMasterGoal?.weeks || []).map((w: any) => ({
            weekNumber: w.weekNumber,
            label: w.label || `Semana ${w.weekNumber}`,
            startDate: w.startDate || '',
            endDate: w.endDate || '',
            startDay: w.startDay || 1,
            endDay: w.endDay || 7,
            dateRangeLabel: w.dateRangeLabel || `${String(w.startDay || 1).padStart(2, '0')} a ${String(w.endDay || 7).padStart(2, '0')}`,
            weightPercentage: w.weightPercentage || 0,
            revenueTarget: w.targetAmount ?? w.revenueTarget ?? 0,
          }))}
        />
      )}
    </div>
  );
};
