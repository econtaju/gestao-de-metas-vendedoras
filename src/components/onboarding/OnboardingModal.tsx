import React, { useState } from 'react';
import {
  Sparkles,
  Building2,
  Users,
  Layers,
  Percent,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Target,
  FileSpreadsheet,
  Rocket,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Company, GoalLevel, PeriodType } from '../../types';
import { formatCurrency } from '../../services/financialEngine';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { addCompany, addBranch, updateBranch, addSeller, setActiveCompanyId, setCurrentView } = useApp();

  const [step, setStep] = useState<number>(1);

  // Form State for new company
  const [tradeName, setTradeName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [segment, setSegment] = useState('Varejo e Comércio');
  const [branches, setBranches] = useState<string[]>(['Matriz']);
  const [newBranchInput, setNewBranchInput] = useState('');
  const [sellers, setSellers] = useState<string[]>([]);
  const [newSellerInput, setNewSellerInput] = useState('');
  const [bulkSellersInput, setBulkSellersInput] = useState('');
  const [defaultPeriod, setDefaultPeriod] = useState<PeriodType>('weekly');
  const [numberOfLevels, setNumberOfLevels] = useState<number>(4);

  // Pergunta se já sabe a meta mensal ou prefere definir depois
  const [knowsMonthlyTarget, setKnowsMonthlyTarget] = useState<boolean | null>(null);
  const [monthlyRevenueTarget, setMonthlyRevenueTarget] = useState<number>(0);

  // Levels configuration
  const [levels, setLevels] = useState<GoalLevel[]>([
    { level: 1, name: 'Meta 1 (Mínima)', revenueTarget: 0, commissionPercentage: 2.0 },
    { level: 2, name: 'Meta 2 (Esperada)', revenueTarget: 0, commissionPercentage: 2.5 },
    { level: 3, name: 'Meta 3 (Superação)', revenueTarget: 0, commissionPercentage: 3.0 },
    { level: 4, name: 'Meta 4 (Excepcional)', revenueTarget: 0, commissionPercentage: 3.5 },
  ]);

  // Financial settings
  const [cmv, setCmv] = useState<number>(38);
  const [tax, setTax] = useState<number>(6.5);
  const [cardFee, setCardFee] = useState<number>(2.8);
  const [otherCosts, setOtherCosts] = useState<number>(1.5);

  if (!isOpen) return null;

  const handleLevelChange = (index: number, field: 'revenueTarget' | 'commissionPercentage', val: number) => {
    setLevels((prev) => prev.map((lvl, i) => (i === index ? { ...lvl, [field]: val } : lvl)));
  };

  const handleFinishOnboarding = () => {
    if (!tradeName.trim()) {
      alert('Informe o nome da empresa.');
      setStep(1);
      return;
    }

    const companyId = `comp-${Date.now()}`;
    const calculatedLevels = levels.slice(0, numberOfLevels).map((lvl, idx) => {
      if (knowsMonthlyTarget && monthlyRevenueTarget > 0) {
        const weeklyBase = Math.round(monthlyRevenueTarget / 4);
        const multipliers = [1.0, 1.15, 1.3, 1.5];
        return {
          ...lvl,
          revenueTarget: Math.round(weeklyBase * (multipliers[idx] || 1.0)),
        };
      }
      return lvl;
    });

    const newCompany: Company = {
      id: companyId,
      name: legalName || tradeName,
      tradeName: tradeName.trim(),
      segment: segment.trim() || 'Comércio / Varejo',
      currency: 'BRL',
      defaultPeriod,
      weekStartDay: 1,
      numberOfLevels,
      goalScenario: 'individual',
      active: true,
      financialSettings: {
        cmvPercentage: cmv,
        taxPercentage: tax,
        cardFeePercentage: cardFee,
        otherVariableCostsPercentage: otherCosts,
      },
      levels: calculatedLevels,
      createdAt: new Date().toISOString(),
    };

    const finalCompanyId = addCompany(newCompany);

    // Configura a filial principal (Matriz) já gerada em addCompany e adiciona filiais adicionais se houver
    const primaryBranchId = `branch-${finalCompanyId}-matriz`;
    const validBranches = branches.length > 0 ? branches : ['Matriz'];

    // Atualiza o nome da matriz para o nome digitado pelo usuário no step 2
    updateBranch(primaryBranchId, {
      name: validBranches[0].trim() || `${newCompany.tradeName} - Matriz`,
    });

    // Se o usuário informou filiais adicionais (idx > 0), cria cada uma
    validBranches.slice(1).forEach((bName) => {
      addBranch({
        companyId: finalCompanyId,
        name: bName.trim(),
        type: 'branch',
        active: true,
      });
    });

    // Cria os vendedores informados vinculados à filial e empresa corretas
    if (sellers.length > 0) {
      const sharePerSeller = Math.round((100 / sellers.length) * 10) / 10;
      sellers.forEach((sellerName) => {
        if (sellerName.trim()) {
          addSeller({
            companyId: finalCompanyId,
            branchId: primaryBranchId,
            name: sellerName.trim(),
            role: 'Consultor de Vendas',
            active: true,
            startDate: new Date().toISOString().slice(0, 10),
            officialSharePercentage: sharePerSeller,
            weeklyTarget: knowsMonthlyTarget && monthlyRevenueTarget > 0 ? Math.round((monthlyRevenueTarget / 4) * (sharePerSeller / 100)) : 0,
            monthlyTarget: knowsMonthlyTarget && monthlyRevenueTarget > 0 ? Math.round(monthlyRevenueTarget * (sharePerSeller / 100)) : 0,
          });
        }
      });
    }

    setActiveCompanyId(finalCompanyId);
    onClose();
    // Se definiu meta ou se não definiu, direciona para o gerador de metas FP&A
    setCurrentView('goals_generator');
  };

  const totalSteps = 6;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 md:p-8 border border-slate-200 relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-800">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Assistente de Implantação de Nova Empresa Cliente
              </h3>
              <p className="text-xs text-slate-500">
                Passo {step} de {totalSteps}: Configure o ambiente em poucos minutos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 my-4 rounded-full overflow-hidden">
          <div
            className="bg-emerald-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        {/* Modal Body - Dynamic Steps */}
        <div className="flex-1 overflow-y-auto py-2 pr-1 space-y-4 text-xs">
          {/* Step 1: Dados da Empresa */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                1. Identificação da Empresa Cliente
              </h4>
              <p className="text-slate-600">
                Informe o nome comercial e segmento da empresa que você está assessorando.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nome Fantasia da Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Supermercado Estrela, Joalheria Real..."
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Razão Social (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Estrela Comércio de Alimentos Ltda"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Segmento de Mercado</label>
                  <input
                    type="text"
                    placeholder="Ex: Moda Feminina, Ótica, Varejo..."
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Matriz e Filiais */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                2. Estrutura de Lojas (Matriz & Filiais)
              </h4>
              <p className="text-slate-600">
                Cadastre as unidades físicas ou canais de venda da empresa.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome da Loja (ex: Filial Shopping Sul)"
                  value={newBranchInput}
                  onChange={(e) => setNewBranchInput(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newBranchInput.trim()) {
                      setBranches([...branches, newBranchInput.trim()]);
                      setNewBranchInput('');
                    }
                  }}
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold cursor-pointer"
                >
                  Adicionar Loja
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {branches.map((b, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                  >
                    <span className="font-bold text-slate-800">
                      {idx === 0 ? '🏢 ' : '🏬 '}
                      {b}
                    </span>
                    {branches.length > 1 && (
                      <button
                        onClick={() => setBranches(branches.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 text-[11px] cursor-pointer"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Vendedores Iniciais */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                3. Equipe Comercial (Vendedores)
              </h4>
              <p className="text-slate-600">
                Cadastre os vendedores da equipe. Você não precisa definir as metas individuais agora — após a criação, as metas serão distribuídas proporcionalmente pelo Gerador FP&A.
              </p>

              {/* Inserção Rápida em Lote */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
                <label className="block font-bold text-indigo-950 text-xs">
                  ⚡ Colar Lista de Vendedores em Lote:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: Carlos Santos, Juliana Lima, Roberto Costa, Amanda..."
                    value={bulkSellersInput}
                    onChange={(e) => setBulkSellersInput(e.target.value)}
                    className="flex-1 bg-white border border-indigo-200 rounded-xl px-3 py-2 text-slate-900 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (bulkSellersInput.trim()) {
                        const parsed = bulkSellersInput
                          .split(/[\n,;]+/)
                          .map((n) => n.trim())
                          .filter((n) => n.length > 0 && !sellers.includes(n));
                        if (parsed.length > 0) {
                          setSellers([...sellers, ...parsed]);
                          setBulkSellersInput('');
                        }
                      }
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shrink-0 cursor-pointer"
                  >
                    Adicionar Todos
                  </button>
                </div>
              </div>

              {/* Inserção Individual */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ou digite o nome de 1 vendedor..."
                  value={newSellerInput}
                  onChange={(e) => setNewSellerInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSellerInput.trim()) {
                      e.preventDefault();
                      if (!sellers.includes(newSellerInput.trim())) {
                        setSellers([...sellers, newSellerInput.trim()]);
                      }
                      setNewSellerInput('');
                    }
                  }}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newSellerInput.trim()) {
                      if (!sellers.includes(newSellerInput.trim())) {
                        setSellers([...sellers, newSellerInput.trim()]);
                      }
                      setNewSellerInput('');
                    }
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs cursor-pointer"
                >
                  + Adicionar
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {sellers.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Nenhum vendedor adicionado ainda. Adicione acima ou avance para cadastrar depois.
                  </div>
                ) : (
                  sellers.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </div>
                        <span className="font-bold text-slate-800">👤 {s}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSellers(sellers.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 text-[11px] font-semibold cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Step 4: Pergunta Estratégica de Faturamento & Níveis */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-600" />
                  4. Definição da Meta de Faturamento e Escala
                </h4>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNumberOfLevels(n)}
                      className={`px-2 py-0.5 rounded-lg font-bold text-[11px] ${
                        numberOfLevels === n
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      {n} Níveis
                    </button>
                  ))}
                </div>
              </div>

              {/* Pergunta: Você já sabe a meta mensal? */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="font-bold text-slate-800 text-xs block">
                  Você já tem definida a Meta de Faturamento Mensal da Loja?
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setKnowsMonthlyTarget(true)}
                    className={`p-3 rounded-xl border text-left transition ${
                      knowsMonthlyTarget === true
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-200'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">Sim, já sei a meta</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Informar o valor consolidado agora</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setKnowsMonthlyTarget(false);
                      setMonthlyRevenueTarget(0);
                    }}
                    className={`p-3 rounded-xl border text-left transition ${
                      knowsMonthlyTarget === false
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold ring-2 ring-indigo-200'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">Não sei ainda</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Definir e distribuir no Gerador FP&A</div>
                  </button>
                </div>

                {knowsMonthlyTarget === true && (
                  <div className="pt-2 animate-in fade-in">
                    <label className="block font-bold text-slate-700 text-xs mb-1">
                      Meta de Faturamento Mensal da Unidade (R$):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                      <input
                        type="number"
                        step="5000"
                        placeholder="Ex: 150000"
                        value={monthlyRevenueTarget || ''}
                        onChange={(e) => setMonthlyRevenueTarget(parseFloat(e.target.value) || 0)}
                        className="w-full pl-9 pr-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Escala de Comissões */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {levels.slice(0, numberOfLevels).map((lvl, index) => (
                  <div
                    key={lvl.level}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5"
                  >
                    <span className="font-bold text-slate-800 block text-xs">{lvl.name}</span>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Comissão (% sobre Vendas)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={lvl.commissionPercentage}
                        onChange={(e) =>
                          handleLevelChange(index, 'commissionPercentage', Number(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-emerald-700"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Custos Variáveis Financeiros */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Percent className="w-4 h-4 text-emerald-600" />
                5. Custos Variáveis & Parâmetros Financeiros
              </h4>
              <p className="text-slate-600">
                Estes percentuais garantem que as metas calculem a margem de contribuição real e
                impeçam que a empresa dê prejuízo ao pagar comissão.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block font-bold text-slate-700 mb-1">
                    CMV % (Custo de Mercadoria)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={cmv}
                    onChange={(e) => setCmv(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block font-bold text-slate-700 mb-1">Impostos sobre Venda %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tax}
                    onChange={(e) => setTax(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block font-bold text-slate-700 mb-1">Taxas de Cartão %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cardFee}
                    onChange={(e) => setCardFee(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block font-bold text-slate-700 mb-1">Outros Custos %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={otherCosts}
                    onChange={(e) => setOtherCosts(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Revisão Final e Publicação */}
          {step === 6 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-bold text-sm">Pronto para Ativar a Empresa!</h4>
                </div>
                <p className="text-xs text-emerald-800">
                  Tudo configurado para <strong>{tradeName || 'Nova Empresa'}</strong> com{' '}
                  {branches.length} lojas, {sellers.length} vendedores e {numberOfLevels} faixas de
                  comissionamento.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Segmento:</span>
                  <span className="font-bold text-slate-800">{segment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Meta Mensal Inicial:</span>
                  <span className="font-bold text-slate-800">
                    {monthlyRevenueTarget > 0 ? formatCurrency(monthlyRevenueTarget) : 'A definir no Gerador FP&A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Margem Bruta Estimada:</span>
                  <span className="font-bold text-emerald-700">
                    {(100 - cmv - tax - cardFee - otherCosts - levels[0].commissionPercentage).toFixed(
                      1
                    )}
                    %
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !tradeName.trim()) {
                  alert('Por favor informe o nome da empresa.');
                  return;
                }
                setStep(step + 1);
              }}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
            >
              Avançar <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  handleFinishOnboarding();
                  setCurrentView('historical_importer');
                }}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition cursor-pointer"
                title="Cadastrar e abrir importação dos 12 meses"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                Ativar & Importar 12 Meses
              </button>
              <button
                type="button"
                onClick={handleFinishOnboarding}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-700/20 flex items-center gap-2 transition cursor-pointer"
              >
                <Rocket className="w-4 h-4" /> Ativar Empresa
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
