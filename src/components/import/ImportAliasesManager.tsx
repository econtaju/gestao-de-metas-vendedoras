import React, { useState } from 'react';
import {
  Users,
  Building2,
  Bookmark,
  Plus,
  Trash2,
  Sparkles,
  Search,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SellerAlias, CompanyAlias, ImportTemplate } from '../../types';

export const ImportAliasesManager: React.FC = () => {
  const {
    companies,
    branches,
    sellers,
    sellerAliases,
    companyAliases,
    importTemplates,
    saveSellerAlias,
    deleteSellerAlias,
    saveCompanyAlias,
    deleteCompanyAlias,
    saveImportTemplate,
    deleteImportTemplate,
    activeCompanyId,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'sellers' | 'companies' | 'templates'>('sellers');
  const [searchTerm, setSearchTerm] = useState('');

  // Form states for new seller alias
  const [newSellerCompId, setNewSellerCompId] = useState(activeCompanyId);
  const [newSellerId, setNewSellerId] = useState('');
  const [newSellerSourceName, setNewSellerSourceName] = useState('');

  // Form states for new company alias
  const [newCompId, setNewCompId] = useState(activeCompanyId);
  const [newBranchId, setNewBranchId] = useState('');
  const [newCompSourceName, setNewCompSourceName] = useState('');

  const companySellers = sellers.filter((s) => s.companyId === newSellerCompId);
  const companyBranches = branches.filter((b) => b.companyId === newCompId);

  const handleAddSellerAlias = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSellerCompId || !newSellerId || !newSellerSourceName.trim()) return;
    saveSellerAlias(newSellerCompId, newSellerId, newSellerSourceName.trim());
    setNewSellerSourceName('');
  };

  const handleAddCompanyAlias = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompId || !newBranchId || !newCompSourceName.trim()) return;
    saveCompanyAlias(newCompId, newBranchId, newCompSourceName.trim());
    setNewCompSourceName('');
  };

  const filteredSellerAliases = sellerAliases.filter(
    (a) =>
      a.sourceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.normalizedName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCompanyAliases = companyAliases.filter(
    (a) =>
      a.sourceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.normalizedName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Tab Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('sellers')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'sellers'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Aliases de Vendedores ({sellerAliases.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('companies')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'companies'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Aliases de Empresas ({companyAliases.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'templates'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Templates de Layout ({importTemplates.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar aliases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Tab 1: Sellers Aliases */}
      {activeTab === 'sellers' && (
        <div className="space-y-6">
          {/* Add Seller Alias Form */}
          <form
            onSubmit={handleAddSellerAlias}
            className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Empresa
              </label>
              <select
                value={newSellerCompId}
                onChange={(e) => {
                  setNewSellerCompId(e.target.value);
                  setNewSellerId('');
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.tradeName || c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Vendedor do Sistema
              </label>
              <select
                value={newSellerId}
                onChange={(e) => setNewSellerId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                required
              >
                <option value="">Selecione o vendedor...</option>
                {companySellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Nome no Relatório / Arquivo
              </label>
              <input
                type="text"
                placeholder="Ex: HELEN, DHEINIELYY"
                value={newSellerSourceName}
                onChange={(e) => setNewSellerSourceName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" /> Vincular Alias
              </button>
            </div>
          </form>

          {/* Aliases Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Nome Original no Relatório</th>
                  <th className="py-3 px-4">Nome Normalizado</th>
                  <th className="py-3 px-4">Vendedor Associado</th>
                  <th className="py-3 px-4">Empresa</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSellerAliases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
                      Nenhum alias de vendedor encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredSellerAliases.map((alias) => {
                    const seller = sellers.find((s) => s.id === alias.sellerId);
                    const company = companies.find((c) => c.id === alias.companyId);

                    return (
                      <tr key={alias.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                          {alias.sourceName}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-500">
                          {alias.normalizedName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            {seller?.name || alias.sellerId}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                          {company?.tradeName || company?.name || alias.companyId}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => deleteSellerAlias(alias.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Companies Aliases */}
      {activeTab === 'companies' && (
        <div className="space-y-6">
          {/* Add Company Alias Form */}
          <form
            onSubmit={handleAddCompanyAlias}
            className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Empresa Cliente
              </label>
              <select
                value={newCompId}
                onChange={(e) => {
                  setNewCompId(e.target.value);
                  setNewBranchId('');
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.tradeName || c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Filial / Unidade
              </label>
              <select
                value={newBranchId}
                onChange={(e) => setNewBranchId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                required
              >
                <option value="">Selecione a unidade...</option>
                {companyBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.type === 'headquarters' ? 'Matriz' : 'Filial'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Texto / Razão no Cabeçalho
              </label>
              <input
                type="text"
                placeholder="Ex: OW'ZAADIA BISS"
                value={newCompSourceName}
                onChange={(e) => setNewCompSourceName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" /> Vincular Alias
              </button>
            </div>
          </form>

          {/* Companies Aliases Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Texto Identificado no Arquivo</th>
                  <th className="py-3 px-4">Texto Normalizado</th>
                  <th className="py-3 px-4">Empresa Mapeada</th>
                  <th className="py-3 px-4">Unidade / Filial</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCompanyAliases.map((alias) => {
                  const company = companies.find((c) => c.id === alias.companyId);
                  const branch = branches.find((b) => b.id === alias.branchId);

                  return (
                    <tr key={alias.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                        {alias.sourceName}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">
                        {alias.normalizedName}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {company?.tradeName || company?.name || alias.companyId}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                          {branch?.name || alias.branchId}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => deleteCompanyAlias(alias.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Templates */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {importTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{tpl.name}</h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {tpl.format.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Padrão semântico para relatórios gerenciais estruturados em blocos por vendedor com quebras de pagamento.
              </p>
              <div className="text-[11px] font-mono p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 space-y-1">
                <div>Marcador de Vendedor: <code>{tpl.sellerMarker}</code></div>
                <div>Marcador de Total: <code>{tpl.totalMarker}</code></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
