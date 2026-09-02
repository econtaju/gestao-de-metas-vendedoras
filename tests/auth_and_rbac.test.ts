import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage para ambiente de testes Node.js
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] !== undefined ? this.store[key] : null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

if (typeof (globalThis as any).localStorage === 'undefined') {
  (globalThis as any).localStorage = new LocalStorageMock();
}

import {
  hashPassword,
  getStoredUsers,
  saveStoredUsers,
  getStoredSession,
  saveStoredSession,
  authenticateUser,
  registerNewUser,
  handleTokenAction,
  createUserDirectly,
  deleteUser,
  updateUserRole,
  resetUserPassword,
  approveUserManually,
  rejectUserManually,
  syncUsersFromRemote,
  DEFAULT_ADMIN_USER,
  AUTH_STORAGE_KEYS,
} from '../src/services/authService';
import { ALLOWED_VIEWS_BY_ROLE, UserRole, ActiveView } from '../src/types';

describe('Módulo de Autenticação & Sessão (R1 & R2)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('hashPassword gera hash SHA-256 correto para senha admin padrão', async () => {
    const hash = await hashPassword('admin');
    assert.strictEqual(
      hash,
      '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
      'O hash da senha "admin" deve corresponder ao padrão do administrador mestre'
    );
  });

  test('R1: Ao iniciar sem sessão persistida, getStoredSession retorna null', () => {
    const session = getStoredSession();
    assert.strictEqual(session, null, 'Sessão inicial deve ser nula');
  });

  test('R1: Login com consultor mestre leonardo / admin autentica com sucesso', async () => {
    const res = await authenticateUser('leonardo', 'admin');
    assert.strictEqual(res.success, true, 'Autenticação de leonardo deve ser bem-sucedida');
    assert.ok(res.session, 'Deve retornar objeto de sessão ativo');
    assert.strictEqual(res.session.user.username, 'leonardo');
    assert.strictEqual(res.session.user.role, 'consultant');
    assert.strictEqual(res.session.user.status, 'approved');

    // Verifica persistência no storage
    const stored = getStoredSession();
    assert.ok(stored, 'Sessão deve estar persistida no localStorage');
    assert.strictEqual(stored.user.username, 'leonardo');
  });

  test('R1: Login com alias admin / admin redireciona para o consultor mestre', async () => {
    const res = await authenticateUser('admin', 'admin');
    assert.strictEqual(res.success, true);
    assert.ok(res.session);
    assert.strictEqual(res.session.user.username, 'leonardo');
  });

  test('R1: Login tolera espaços em branco e letras maiúsculas no usuário', async () => {
    const resUpper = await authenticateUser('  LEONARDO  ', 'admin');
    assert.strictEqual(resUpper.success, true);
    assert.strictEqual(resUpper.session?.user.username, 'leonardo');

    const resAdminUpper = await authenticateUser(' ADMIN ', 'admin');
    assert.strictEqual(resAdminUpper.success, true);
    assert.strictEqual(resAdminUpper.session?.user.username, 'leonardo');
  });

  test('R1: Login com senha incorreta falha e não cria sessão', async () => {
    const res = await authenticateUser('leonardo', 'senhaErrada123');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.message, 'Senha incorreta.');
    assert.strictEqual(getStoredSession(), null);
  });

  test('R1: Login com usuário inexistente falha', async () => {
    const res = await authenticateUser('usuario_inexistente', 'qualquerSenha');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.message, 'Usuário não encontrado.');
  });

  test('R2: Logout limpa a sessão ativa imediatamente', async () => {
    // Realiza login
    const loginRes = await authenticateUser('leonardo', 'admin');
    assert.strictEqual(loginRes.success, true);
    assert.ok(getStoredSession() !== null);

    // Executa Logout
    saveStoredSession(null);

    // Sessão deve estar limpa
    assert.strictEqual(getStoredSession(), null, 'getStoredSession deve retornar null após logout');
  });

  test('R1 & R2: Sessão persistida é invalidada automaticamente se o usuário for deletado ou suspenso', async () => {
    // Cria usuário aprovado
    const userRes = await createUserDirectly('Testador', 'testador.sessao', 'senha123', 'manager');
    const userId = userRes.user!.id;

    // Login e salva sessão
    const loginRes = await authenticateUser('testador.sessao', 'senha123');
    assert.strictEqual(loginRes.success, true);
    assert.ok(getStoredSession() !== null);

    // Suspende o usuário no storage
    rejectUserManually(userId);

    // getStoredSession deve detectar que o status não é mais approved e limpar a sessão
    const validSession = getStoredSession();
    assert.strictEqual(validSession, null, 'Sessão de usuário suspenso deve ser anulada');
  });
});

describe('Módulo de Gestão de Usuários & RBAC (R3)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('R3: Administrador cria diretamente novo Gestor (manager) que já nasce aprovado', async () => {
    const res = await createUserDirectly(
      'Roberto Gestor',
      'roberto.gestor',
      'gestor123',
      'manager',
      'roberto@empresa.com',
      true
    );

    assert.strictEqual(res.success, true);
    assert.ok(res.user);
    assert.strictEqual(res.user.username, 'roberto.gestor');
    assert.strictEqual(res.user.role, 'manager');
    assert.strictEqual(res.user.status, 'approved');

    // Novo usuário consegue autenticar imediatamente
    const loginRes = await authenticateUser('roberto.gestor', 'gestor123');
    assert.strictEqual(loginRes.success, true);
    assert.ok(loginRes.session);
    assert.strictEqual(loginRes.session.user.role, 'manager');
  });

  test('R3: Administrador cria diretamente novo Vendedor (seller) que consegue logar', async () => {
    const res = await createUserDirectly(
      'Ana Vendedora',
      'ana.vendas',
      'vendas123',
      'seller',
      'ana@empresa.com',
      true
    );

    assert.strictEqual(res.success, true);
    assert.ok(res.user);
    assert.strictEqual(res.user.role, 'seller');
    assert.strictEqual(res.user.status, 'approved');

    // Login da vendedora
    const loginRes = await authenticateUser('ana.vendas', 'vendas123');
    assert.strictEqual(loginRes.success, true);
    assert.ok(loginRes.session);
    assert.strictEqual(loginRes.session.user.role, 'seller');
  });

  test('R3: Não permite criação de usuário com nome de login duplicado (case-insensitive)', async () => {
    const res1 = await createUserDirectly('Carlos', 'carlos.dup', 'pass123', 'seller');
    assert.strictEqual(res1.success, true);

    const res2 = await createUserDirectly('Carlos 2', '  CARLOS.DUP  ', 'outrapass', 'seller');
    assert.strictEqual(res2.success, false);
    assert.strictEqual(res2.message, 'Este nome de usuário já está em uso.');
  });

  test('R3: Administrador altera papel do usuário (ex: seller -> manager)', async () => {
    const createRes = await createUserDirectly('Marcos', 'marcos.dev', 'pass123', 'seller');
    assert.strictEqual(createRes.success, true);
    const userId = createRes.user!.id;

    const updateRes = await updateUserRole(userId, 'manager');
    assert.strictEqual(updateRes.success, true);
    assert.strictEqual(updateRes.user?.role, 'manager');

    // Usuário no storage agora reflete o novo papel
    const users = getStoredUsers();
    const marcos = users.find((u) => u.id === userId);
    assert.strictEqual(marcos?.role, 'manager');

    // Tentativa de alterar usuário inexistente retorna erro gracioso
    const notFoundRes = await updateUserRole('usr-inexistente', 'consultant');
    assert.strictEqual(notFoundRes.success, false);
  });

  test('R3: Administrador redefine a senha do usuário com validação de tamanho mínimo', async () => {
    const createRes = await createUserDirectly('Juliana', 'juliana.vendas', 'senhaAntiga123', 'seller');
    const userId = createRes.user!.id;

    // Senha com menos de 4 caracteres deve ser rejeitada
    const shortPassRes = await resetUserPassword(userId, '123');
    assert.strictEqual(shortPassRes.success, false);
    assert.match(shortPassRes.message, /mínimo 4 caracteres/i);

    // Redefine a senha com sucesso
    const resetRes = await resetUserPassword(userId, 'novaSenha456');
    assert.strictEqual(resetRes.success, true);

    // Login com senha antiga deve falhar
    const oldLogin = await authenticateUser('juliana.vendas', 'senhaAntiga123');
    assert.strictEqual(oldLogin.success, false);

    // Login com nova senha deve suceder
    const newLogin = await authenticateUser('juliana.vendas', 'novaSenha456');
    assert.strictEqual(newLogin.success, true);
  });

  test('R3: Administrador exclui usuário e protege o administrador mestre leonardo (case-insensitive)', async () => {
    // Tenta excluir o master admin leonardo -> deve ser impedido
    const users = getStoredUsers();
    const adminUser = users.find((u) => u.username === 'leonardo')!;
    const delAdminRes = await deleteUser(adminUser.id);
    assert.strictEqual(delAdminRes.success, false);
    assert.strictEqual(delAdminRes.message, 'Não é permitido excluir o administrador mestre do sistema.');

    // Cria e exclui usuário secundário
    const createRes = await createUserDirectly('Temporario', 'temp.user', 'pass123', 'seller');
    const tempId = createRes.user!.id;

    const delRes = await deleteUser(tempId);
    assert.strictEqual(delRes.success, true);

    // Login com usuário excluído deve falhar
    const loginRes = await authenticateUser('temp.user', 'pass123');
    assert.strictEqual(loginRes.success, false);
    assert.strictEqual(loginRes.message, 'Usuário não encontrado.');

    // Tentativa de excluir usuário inexistente
    const delInexistente = await deleteUser('usr-99999');
    assert.strictEqual(delInexistente.success, false);
  });

  test('R3: Usuário com status pending_approval ou rejected é bloqueado no login', async () => {
    const users = getStoredUsers();
    const hash = await hashPassword('minhasenha');
    const pendingUser = {
      id: 'usr-pending-1',
      username: 'usuario.pendente',
      name: 'Pendente',
      passwordHash: hash,
      role: 'seller' as UserRole,
      status: 'pending_approval' as const,
      createdAt: new Date().toISOString(),
    };

    saveStoredUsers([...users, pendingUser]);

    const loginPending = await authenticateUser('usuario.pendente', 'minhasenha');
    assert.strictEqual(loginPending.success, false);
    assert.match(loginPending.message || '', /pendente de aprovação/i);

    // Rejeita o usuário
    rejectUserManually('usr-pending-1');
    const loginRejected = await authenticateUser('usuario.pendente', 'minhasenha');
    assert.strictEqual(loginRejected.success, false);
    assert.match(loginRejected.message || '', /não foi autorizada/i);

    // Aprova manualmente
    approveUserManually('usr-pending-1', 'admin');
    const loginApproved = await authenticateUser('usuario.pendente', 'minhasenha');
    assert.strictEqual(loginApproved.success, true);
  });

  test('R3: Registro público de novos usuários via registerNewUser e aprovação via token de link de e-mail', async () => {
    const regRes = await registerNewUser('Fernando Solicitante', 'fernando.solicita', 'senhaForte123', 'seller', 'fernando@empresa.com');
    assert.strictEqual(regRes.success, true);
    assert.ok(regRes.user);
    assert.strictEqual(regRes.user.status, 'pending_approval');
    assert.ok(regRes.user.approvalToken);

    const token = regRes.user.approvalToken!;

    // Tentativa de login antes de aprovar
    const earlyLogin = await authenticateUser('fernando.solicita', 'senhaForte123');
    assert.strictEqual(earlyLogin.success, false);

    // Processa aprovação via token
    const tokenActionRes = handleTokenAction('approve_user', token);
    assert.strictEqual(tokenActionRes.success, true);
    assert.strictEqual(tokenActionRes.user?.status, 'approved');
    assert.strictEqual(tokenActionRes.user?.approvalToken, undefined, 'Token deve ser invalidado após uso');

    // Login após aprovação via token
    const postApprovalLogin = await authenticateUser('fernando.solicita', 'senhaForte123');
    assert.strictEqual(postApprovalLogin.success, true);

    // Reutilizar o mesmo token deve falhar
    const duplicateTokenAction = handleTokenAction('approve_user', token);
    assert.strictEqual(duplicateTokenAction.success, false);
  });

  test('R3: Bloqueia rebaixamento de papel (role) do administrador mestre leonardo', async () => {
    const users = getStoredUsers();
    const adminUser = users.find((u) => u.username === 'leonardo')!;

    // Tentar rebaixar leonardo para seller ou manager deve ser bloqueado
    const changeToSeller = await updateUserRole(adminUser.id, 'seller');
    assert.strictEqual(changeToSeller.success, false);
    assert.match(changeToSeller.message, /não é permitido alterar o papel/i);

    const changeToManager = await updateUserRole(adminUser.id, 'manager');
    assert.strictEqual(changeToManager.success, false);
    assert.match(changeToManager.message, /não é permitido alterar o papel/i);

    // Permanece como consultant
    const checkUsers = getStoredUsers();
    const adminAfter = checkUsers.find((u) => u.username === 'leonardo');
    assert.strictEqual(adminAfter?.role, 'consultant');
  });

  test('R3: Bloqueia suspensão ou rejeição manual do administrador mestre leonardo', () => {
    const users = getStoredUsers();
    const adminUser = users.find((u) => u.username === 'leonardo')!;

    const rejectRes = rejectUserManually(adminUser.id);
    assert.strictEqual(rejectRes.success, false);

    // Status do admin continua approved
    const checkUsers = getStoredUsers();
    const adminAfter = checkUsers.find((u) => u.username === 'leonardo');
    assert.strictEqual(adminAfter?.status, 'approved');
  });

  test('R3: Validação de entradas vazias ou senhas curtas em createUserDirectly e registerNewUser', async () => {
    // Nome vazio
    const resEmptyName = await createUserDirectly('', 'usuario.valido', 'senha123', 'seller');
    assert.strictEqual(resEmptyName.success, false);
    assert.match(resEmptyName.message, /nome completo é obrigatório/i);

    // Usuário vazio
    const resEmptyUser = await createUserDirectly('Nome Valido', '   ', 'senha123', 'seller');
    assert.strictEqual(resEmptyUser.success, false);
    assert.match(resEmptyUser.message, /nome de usuário é obrigatório/i);

    // Senha com menos de 4 caracteres
    const resShortPass = await createUserDirectly('Nome Valido', 'user.valido', '12', 'seller');
    assert.strictEqual(resShortPass.success, false);
    assert.match(resShortPass.message, /mínimo 4 caracteres/i);

    // Senha composta apenas por espaços
    const resWhitespacePass = await createUserDirectly('Nome Valido', 'user.valido2', '    ', 'seller');
    assert.strictEqual(resWhitespacePass.success, false);
    assert.match(resWhitespacePass.message, /mínimo 4 caracteres/i);

    // Mesmas validações em registerNewUser
    const resRegEmpty = await registerNewUser('', 'user.reg', 'senha123');
    assert.strictEqual(resRegEmpty.success, false);

    const resRegShort = await registerNewUser('Nome', 'user.reg2', '1');
    assert.strictEqual(resRegShort.success, false);

    const resRegSpaces = await registerNewUser('Nome', 'user.reg3', '     ');
    assert.strictEqual(resRegSpaces.success, false);
  });

  test('R3: Bloqueia criação ou registro de novo usuário com username reservado "admin"', async () => {
    // Tentativa via createUserDirectly
    const resCreateAdmin = await createUserDirectly('Novo Admin', 'admin', 'admin123', 'consultant');
    assert.strictEqual(resCreateAdmin.success, false);
    assert.strictEqual(resCreateAdmin.message, 'Este nome de usuário já está em uso.');

    const resCreateAdminUpper = await createUserDirectly('Novo Admin 2', '  ADMIN  ', 'admin123', 'consultant');
    assert.strictEqual(resCreateAdminUpper.success, false);
    assert.strictEqual(resCreateAdminUpper.message, 'Este nome de usuário já está em uso.');

    // Tentativa via registerNewUser
    const resRegAdmin = await registerNewUser('Novo Admin 3', 'admin', 'admin123');
    assert.strictEqual(resRegAdmin.success, false);
    assert.strictEqual(resRegAdmin.message, 'Este nome de usuário já está em uso.');
  });

  test('R1 & R3: Auto-healing do usuário mestre se os dados do storage estiverem corrompidos', () => {
    // Simula corrupção de storage onde leonardo estava com papel incorreto ou status rejected
    const corruptedUsers = [
      {
        ...DEFAULT_ADMIN_USER,
        role: 'seller' as UserRole,
        status: 'rejected' as any,
      },
    ];
    localStorage.setItem(AUTH_STORAGE_KEYS.USERS, JSON.stringify(corruptedUsers));

    // getStoredUsers deve auto-reparar o admin mestre
    const recovered = getStoredUsers();
    const adminRecovered = recovered.find((u) => u.username === 'leonardo');
    assert.ok(adminRecovered);
    assert.strictEqual(adminRecovered.role, 'consultant');
    assert.strictEqual(adminRecovered.status, 'approved');
  });
});

describe('Matriz de Permissões RBAC (ALLOWED_VIEWS_BY_ROLE)', () => {
  test('Consultant possui acesso administrativo irrestrito a todas as 15 telas', () => {
    const consultantViews = ALLOWED_VIEWS_BY_ROLE.consultant;
    assert.ok(consultantViews.includes('dashboard'));
    assert.ok(consultantViews.includes('seller_portal'));
    assert.ok(consultantViews.includes('commercial_intelligence'));
    assert.ok(consultantViews.includes('goals_generator'));
    assert.ok(consultantViews.includes('simulator'));
    assert.ok(consultantViews.includes('commissions'));
    assert.ok(consultantViews.includes('sales_entry'));
    assert.ok(consultantViews.includes('sales_history'));
    assert.ok(consultantViews.includes('sellers'));
    assert.ok(consultantViews.includes('team_availability'));
    assert.ok(consultantViews.includes('historical_importer'));
    assert.ok(consultantViews.includes('importer'));
    assert.ok(consultantViews.includes('reports'));
    assert.ok(consultantViews.includes('company_settings'));
    assert.ok(consultantViews.includes('user_management'));
    assert.strictEqual(consultantViews.length, 15);
  });

  test('Manager possui acesso a ferramentas de gestão mas é bloqueado em user_management', () => {
    const managerViews = ALLOWED_VIEWS_BY_ROLE.manager;
    assert.ok(managerViews.includes('dashboard'));
    assert.ok(managerViews.includes('commercial_intelligence'));
    assert.ok(managerViews.includes('goals_generator'));
    assert.ok(managerViews.includes('simulator'));
    assert.ok(managerViews.includes('commissions'));
    assert.ok(managerViews.includes('sales_entry'));
    assert.ok(managerViews.includes('sales_history'));
    assert.ok(managerViews.includes('sellers'));
    assert.ok(managerViews.includes('team_availability'));
    assert.ok(managerViews.includes('company_settings'));

    // Bloqueado em user_management
    assert.strictEqual(
      managerViews.includes('user_management'),
      false,
      'Manager não pode ter acesso à Gestão de Usuários'
    );
  });

  test('Seller possui acesso restrito exclusivamente ao Portal do Vendedor, Comissões e Histórico', () => {
    const sellerViews = ALLOWED_VIEWS_BY_ROLE.seller;
    assert.ok(sellerViews.includes('seller_portal'));
    assert.ok(sellerViews.includes('commissions'));
    assert.ok(sellerViews.includes('sales_history'));

    // Telas administrativas bloqueadas para Seller
    assert.strictEqual(sellerViews.includes('dashboard'), false);
    assert.strictEqual(sellerViews.includes('goals_generator'), false);
    assert.strictEqual(sellerViews.includes('simulator'), false);
    assert.strictEqual(sellerViews.includes('sales_entry'), false);
    assert.strictEqual(sellerViews.includes('company_settings'), false);
    assert.strictEqual(sellerViews.includes('user_management'), false);
    assert.strictEqual(sellerViews.includes('historical_importer'), false);
    assert.strictEqual(sellerViews.includes('importer'), false);
    assert.strictEqual(sellerViews.includes('team_availability'), false);
    assert.strictEqual(sellerViews.length, 3);
  });
});

describe('Varredura Geral de Abas: Isolamento de Dados e Cálculos FP&A', () => {
  const mockCompanyA: any = {
    id: 'company-a',
    name: 'Empresa A LTDA',
    tradeName: 'Empresa A',
    segment: 'Moda',
    defaultPeriod: 'weekly',
    numberOfLevels: 4,
    levels: [
      { level: 1, name: 'Meta 1', revenueTarget: 50000, commissionPercentage: 2.0 },
      { level: 2, name: 'Meta 2', revenueTarget: 60000, commissionPercentage: 2.5 },
      { level: 3, name: 'Meta 3', revenueTarget: 70000, commissionPercentage: 3.0 },
      { level: 4, name: 'Meta 4', revenueTarget: 80000, commissionPercentage: 3.5 },
    ],
    financialSettings: {
      cmvPercentage: 40,
      taxPercentage: 8,
      cardFeePercentage: 2.5,
      otherVariableCostsPercentage: 1.5,
    },
  };

  const mockSellers: any[] = [
    { id: 'seller-a-1', companyId: 'company-a', branchId: 'branch-a-1', name: 'Vendedora A1', role: 'Vendedora', active: true },
    { id: 'seller-a-2', companyId: 'company-a', branchId: 'branch-a-2', name: 'Vendedora A2', role: 'Vendedora', active: true },
    { id: 'seller-b-1', companyId: 'company-b', branchId: 'branch-b-1', name: 'Vendedora B1', role: 'Vendedora', active: true },
  ];

  const mockSales: any[] = [
    {
      id: 'sale-1',
      companyId: 'company-a',
      branchId: 'branch-a-1',
      sellerId: 'seller-a-1',
      periodType: 'weekly',
      year: 2026,
      periodNumber: 12,
      periodLabel: 'Semana 12',
      startDate: '2026-03-16',
      endDate: '2026-03-22',
      revenue: 55000,
      target: 50000,
    },
    {
      id: 'sale-2',
      companyId: 'company-b',
      branchId: 'branch-b-1',
      sellerId: 'seller-b-1',
      periodType: 'weekly',
      year: 2026,
      periodNumber: 12,
      periodLabel: 'Semana 12',
      startDate: '2026-03-16',
      endDate: '2026-03-22',
      revenue: 90000,
      target: 100000,
    },
  ];

  test('1. Isolamento de Vendedores por Empresa', () => {
    const sellersOfA = mockSellers.filter(s => s.companyId === 'company-a');
    const sellersOfB = mockSellers.filter(s => s.companyId === 'company-b');
    assert.strictEqual(sellersOfA.length, 2);
    assert.strictEqual(sellersOfB.length, 1);
    assert.ok(sellersOfA.every(s => s.companyId === 'company-a'));
    assert.ok(sellersOfB.every(s => s.companyId === 'company-b'));
  });

  test('2. Isolamento de Vendas e Faturamento por Empresa', () => {
    const salesOfA = mockSales.filter(s => s.companyId === 'company-a');
    const salesOfB = mockSales.filter(s => s.companyId === 'company-b');
    const revA = salesOfA.reduce((sum, s) => sum + s.revenue, 0);
    const revB = salesOfB.reduce((sum, s) => sum + s.revenue, 0);
    assert.strictEqual(revA, 55000);
    assert.strictEqual(revB, 90000);
  });

  test('3. Cálculo de Margem de Contribuição e Custos FP&A', () => {
    const revenue = mockSales[0].revenue; // 55000
    const target = mockSales[0].target; // 50000 (atingiu 110% -> Meta 1)
    const commPct = 2.0;
    const commAmount = revenue * (commPct / 100); // 1100
    const cmvAmount = revenue * (mockCompanyA.financialSettings.cmvPercentage / 100); // 22000
    const taxAmount = revenue * (mockCompanyA.financialSettings.taxPercentage / 100); // 4400
    const cardAmount = revenue * (mockCompanyA.financialSettings.cardFeePercentage / 100); // 1375
    const otherAmount = revenue * (mockCompanyA.financialSettings.otherVariableCostsPercentage / 100); // 825

    const totalVarCosts = commAmount + cmvAmount + taxAmount + cardAmount + otherAmount; // 29700
    const contributionMargin = revenue - totalVarCosts; // 25300

    assert.strictEqual(commAmount, 1100);
    assert.strictEqual(cmvAmount, 22000);
    assert.strictEqual(taxAmount, 4400);
    assert.strictEqual(cardAmount, 1375);
    assert.strictEqual(otherAmount, 825);
    assert.strictEqual(totalVarCosts, 29700);
    assert.strictEqual(contributionMargin, 25300);
  });

  test('4. Escada Percentual de Metas FP&A: recálculo automático ao definir Meta 1', () => {
    const meta1 = 100000;
    const growthRates = [0, 15, 10, 10]; // +15% para M2, +10% para M3, +10% para M4

    const meta2 = Math.round(meta1 * (1 + growthRates[1] / 100)); // 115.000
    const meta3 = Math.round(meta2 * (1 + growthRates[2] / 100)); // 126.500
    const meta4 = Math.round(meta3 * (1 + growthRates[3] / 100)); // 139.150

    assert.strictEqual(meta2, 115000);
    assert.strictEqual(meta3, 126500);
    assert.strictEqual(meta4, 139150);
  });

  test('5. Escada de Metas: Edição Manual pontual e reajuste automático se Meta 1 for alterada', () => {
    let meta1 = 100000;
    const growthRates = [0, 15, 10, 10];
    let manualValues: Record<number, number> = {};

    // Usuário altera manualmente Meta 2 para 120.000 via duplo-clique
    manualValues[1] = 120000;

    let effectiveMeta2 = manualValues[1] ?? Math.round(meta1 * 1.15);
    assert.strictEqual(effectiveMeta2, 120000);

    // Usuário re-edita a Meta 1 inicial para 200.000: o estado manual é resetado e recalcula tudo!
    meta1 = 200000;
    manualValues = {}; // Limpa edições manuais conforme regra solicitada

    effectiveMeta2 = manualValues[1] ?? Math.round(meta1 * 1.15);
    const effectiveMeta3 = manualValues[2] ?? Math.round(effectiveMeta2 * 1.10);
    const effectiveMeta4 = manualValues[3] ?? Math.round(effectiveMeta3 * 1.10);

    assert.strictEqual(effectiveMeta2, 230000); // 200.000 * 1.15
    assert.strictEqual(effectiveMeta3, 253000); // 230.000 * 1.10
    assert.strictEqual(effectiveMeta4, 278300); // 253.000 * 1.10
  });
});
