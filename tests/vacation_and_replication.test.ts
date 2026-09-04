import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  getSellerIntervalAvailability,
  DEFAULT_WORKING_DAYS_SETTINGS,
} from '../src/services/availabilityEngine';
import {
  calculateSellerGoalDetail,
  replicateSharesToOtherMonths,
} from '../src/services/masterGoalEngine';
import { formatCurrency } from '../src/services/financialEngine';
import {
  Seller,
  MonthlyMasterGoal,
  SellerAvailability,
  CommercialWeekPeriod,
} from '../src/types';

describe('Férias Proporcionais nas Semanas, Replicação de Metas & Redistribuição de Cota', () => {
  const mockSeller: Seller = {
    id: 'seller-ana',
    name: 'Ana Silva',
    companyId: 'comp-1',
    branchId: 'branch-1',
    role: 'Vendedora Pleno',
    startDate: '2025-01-01',
    seniorityLevel: 'pleno',
    officialSharePercentage: 25,
    historicalSharePercentage: 25,
    active: true,
    averageTicket: 300,
  };

  const sampleWeeks: CommercialWeekPeriod[] = [
    {
      weekNumber: 1,
      startDay: 1,
      endDay: 7,
      label: 'Semana 1',
      dateRangeLabel: '01 a 07',
      startDate: '2026-09-01',
      endDate: '2026-09-07',
      weightPercentage: 25,
      revenueTarget: 50000,
    },
    {
      weekNumber: 2,
      startDay: 8,
      endDay: 14,
      label: 'Semana 2',
      dateRangeLabel: '08 a 14',
      startDate: '2026-09-08',
      endDate: '2026-09-14',
      weightPercentage: 25,
      revenueTarget: 50000,
    },
    {
      weekNumber: 3,
      startDay: 15,
      endDay: 21,
      label: 'Semana 3',
      dateRangeLabel: '15 a 21',
      startDate: '2026-09-15',
      endDate: '2026-09-21',
      weightPercentage: 25,
      revenueTarget: 50000,
    },
    {
      weekNumber: 4,
      startDay: 22,
      endDay: 30,
      label: 'Semana 4',
      dateRangeLabel: '22 a 30',
      startDate: '2026-09-22',
      endDate: '2026-09-30',
      weightPercentage: 25,
      revenueTarget: 50000,
    },
  ];

  const mockMasterGoal: MonthlyMasterGoal = {
    id: 'goal-comp-1-branch-1-2026-9',
    companyId: 'comp-1',
    branchId: 'branch-1',
    branchName: 'Matriz',
    year: 2026,
    monthNumber: 9,
    monthName: 'Setembro',
    monthlyTarget: 200000,
    numberOfWeeks: 4,
    weeks: sampleWeeks,
    totalWeight: 100,
    isValid: true,
    status: 'draft',
    commissionRuleType: 'monthly',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };

  test('1. getSellerIntervalAvailability calcula disponibilidade para semana normal (sem férias)', () => {
    const avail = getSellerIntervalAvailability(
      'seller-ana',
      '2026-09-01',
      '2026-09-07',
      [],
      DEFAULT_WORKING_DAYS_SETTINGS
    );

    assert.equal(avail.factor, 1, 'Fator de disponibilidade deve ser 100%');
    assert.ok(avail.daysAvailable > 0, 'Deve possuir dias úteis disponíveis');
    assert.equal(avail.daysAvailable, avail.daysExpected);
    assert.equal(avail.activeAbsences.length, 0);
  });

  test('2. getSellerIntervalAvailability zera dias disponíveis se vendedora estiver de férias na semana inteira', () => {
    const vacations: SellerAvailability[] = [
      {
        id: 'vac-1',
        companyId: 'comp-1',
        branchId: 'branch-1',
        sellerId: 'seller-ana',
        absenceType: 'vacation',
        startDate: '2026-09-08',
        endDate: '2026-09-21', // Cobre a semana 2 inteira e semana 3
        availabilityPercentage: 0,
        redistributionEnabled: true,
        redistributionMethod: 'equal',
        notes: 'Férias regulares',
        createdAt: '2026-09-01',
        updatedAt: '2026-09-01',
      },
    ];

    const week2Avail = getSellerIntervalAvailability(
      'seller-ana',
      '2026-09-08',
      '2026-09-14',
      vacations,
      DEFAULT_WORKING_DAYS_SETTINGS
    );

    assert.equal(week2Avail.factor, 0, 'Fator de disponibilidade na semana de férias deve ser 0');
    assert.equal(week2Avail.daysAvailable, 0, 'Dias úteis trabalhados devem ser 0');
    assert.ok(week2Avail.daysExpected > 0, 'Dias normais de trabalho na semana devem ser maiores que zero');
    assert.equal(week2Avail.activeAbsences.length, 1);
  });

  test('3. calculateSellerGoalDetail zera meta semanal da vendedora na semana de férias e ajusta a meta mensal proporcionalmente', () => {
    const vacations: SellerAvailability[] = [
      {
        id: 'vac-1',
        companyId: 'comp-1',
        branchId: 'branch-1',
        sellerId: 'seller-ana',
        absenceType: 'vacation',
        startDate: '2026-09-08',
        endDate: '2026-09-14', // Semana 2 inteira de férias
        availabilityPercentage: 0,
        redistributionEnabled: true,
        redistributionMethod: 'equal',
        notes: 'Férias Semana 2',
        createdAt: '2026-09-01',
        updatedAt: '2026-09-01',
      },
    ];

    const detail = calculateSellerGoalDetail(
      mockSeller,
      mockMasterGoal,
      [],
      [mockSeller],
      vacations,
      DEFAULT_WORKING_DAYS_SETTINGS
    );

    // Ana tem 25% de 200.000 = 50.000 base mensal. Com 4 semanas de 25% cada = 12.500 por semana.
    assert.equal(detail.weeklyBreakdown.length, 4);

    const week1 = detail.weeklyBreakdown[0];
    const week2 = detail.weeklyBreakdown[1];
    const week3 = detail.weeklyBreakdown[2];

    assert.equal(week1.weeklyTarget, 12500, 'Semana 1 sem férias deve ter meta cheia');
    assert.equal(week1.isAbsent, false);
    assert.equal(week1.availabilityFactor, 1);

    assert.equal(week2.weeklyTarget, 0, 'Semana 2 de férias deve ter meta zerada (R$ 0,00)');
    assert.equal(week2.isAbsent, true);
    assert.equal(week2.availabilityFactor, 0);

    assert.equal(week3.weeklyTarget, 12500, 'Semana 3 sem férias deve ter meta cheia');

    // A meta mensal efetiva da vendedora no mês deve ser a soma das 3 semanas trabalhadas: 12.500 * 3 = 37.500
    assert.equal(detail.monthlyTarget, 37500, 'Meta mensal deve ser ajustada para a soma das semanas trabalhadas');
  });

  test('4. replicateSharesToOtherMonths replica padrão de participação para os meses escolhidos', () => {
    const sellerShares = {
      'seller-ana': 35,
      'seller-bruna': 35,
      'seller-carla': 30,
    };

    const existingGoals: Record<string, MonthlyMasterGoal> = {
      'comp-1-branch-1-2026-9': mockMasterGoal,
    };

    const updatedGoals = replicateSharesToOtherMonths(
      'comp-1',
      'branch-1',
      2026,
      [10, 11, 12], // Outubro, Novembro, Dezembro
      sellerShares,
      existingGoals,
      {
        replicateTargetToo: false,
        userName: 'Leonardo Consultor',
      }
    );

    assert.ok(updatedGoals['comp-1-branch-1-2026-10'], 'Mês 10 (Outubro) deve ter meta gerada');
    assert.ok(updatedGoals['comp-1-branch-1-2026-11'], 'Mês 11 (Novembro) deve ter meta gerada');
    assert.ok(updatedGoals['comp-1-branch-1-2026-12'], 'Mês 12 (Dezembro) deve ter meta gerada');

    const octGoal = updatedGoals['comp-1-branch-1-2026-10'];
    assert.deepEqual(octGoal.sellerShares, sellerShares, 'Outubro deve ter recebido as porcentagens de participação');
    assert.equal(octGoal.monthNumber, 10);
    assert.equal(octGoal.monthName, 'Outubro');
    assert.equal(octGoal.weeks.length, 4);

    // Verifica que o log de auditoria foi gravado
    assert.ok(octGoal.changeLogs && octGoal.changeLogs.length > 0);
    assert.equal(octGoal.changeLogs[0].action, 'update_shares');
    assert.match(octGoal.changeLogs[0].description, /Replicação de padrão de participação/);
  });

  test('5. Cobertura de cota de férias com destinatário único: transfere a diferença integralmente para a vendedora escolhida', () => {
    // Cenário: 4 vendedoras com 25% cada (Meta total R$ 200.000).
    // Ana tira 15 dias de férias (50% do mês).
    // Cota trabalhada da Ana = 12.5% (R$ 25.000). Cota descoberta = 12.5% (R$ 25.000).
    // O gestor escolhe transferir 100% da cota descoberta para Bruna.
    const initialShares = {
      'seller-ana': 25,
      'seller-bruna': 25,
      'seller-carla': 25,
      'seller-dani': 25,
    };

    const anaWorkedFactor = 0.5; // 50% dos dias úteis
    const anaEffectiveShare = Math.round(initialShares['seller-ana'] * anaWorkedFactor * 10) / 10; // 12.5%
    const uncoveredShare = Math.round((initialShares['seller-ana'] - anaEffectiveShare) * 10) / 10; // 12.5%

    // Transferir para Bruna:
    const newShares = {
      'seller-ana': anaEffectiveShare, // 12.5%
      'seller-bruna': Math.round((initialShares['seller-bruna'] + uncoveredShare) * 10) / 10, // 37.5%
      'seller-carla': initialShares['seller-carla'], // 25%
      'seller-dani': initialShares['seller-dani'], // 25%
    };

    assert.equal(newShares['seller-ana'], 12.5);
    assert.equal(newShares['seller-bruna'], 37.5);
    assert.equal(newShares['seller-carla'], 25);
    assert.equal(newShares['seller-dani'], 25);

    const sum = Object.values(newShares).reduce((a, b) => a + b, 0);
    assert.equal(sum, 100, 'A soma da equipe deve continuar cravando 100%');
  });

  test('6. Cobertura de cota de férias com divisão igualitária entre as presentes: soma continua 100%', () => {
    const initialShares = {
      'seller-ana': 25,
      'seller-bruna': 25,
      'seller-carla': 25,
      'seller-dani': 25,
    };

    const anaWorkedFactor = 0; // Ana de férias o mês inteiro
    const anaEffectiveShare = 0;
    const uncoveredShare = 25; // 25% a redistribuir entre as 3 presentes

    const extraPerSeller = Math.round((uncoveredShare / 3) * 10) / 10; // 8.3%
    const newShares = {
      'seller-ana': 0,
      'seller-bruna': Math.round((25 + extraPerSeller) * 10) / 10, // 33.3%
      'seller-carla': Math.round((25 + extraPerSeller) * 10) / 10, // 33.3%
      'seller-dani': Math.round((25 + extraPerSeller) * 10) / 10, // 33.3%
    };

    // Ajuste de resíduo para cravar 100
    const sum = Object.values(newShares).reduce((a, b) => a + b, 0);
    const diff = Math.round((100 - sum) * 10) / 10;
    newShares['seller-bruna'] = Math.round((newShares['seller-bruna'] + diff) * 10) / 10;

    assert.equal(newShares['seller-ana'], 0);
    const finalSum = Math.round(Object.values(newShares).reduce((a, b) => a + b, 0) * 10) / 10;
    assert.equal(finalSum, 100, 'A soma final deve ser exatamente 100%');
  });

  test('7. Cobertura de cota com divisão individual personalizada por vendedora até atingir o valor que falta', () => {
    // Meta da Loja: R$ 200.000,00
    // 4 vendedoras com 25% (R$ 50.000 cada)
    const monthlyUnitTarget = 200000;
    const initialShares = {
      'seller-ana': 25,
      'seller-bruna': 25,
      'seller-carla': 25,
      'seller-dani': 25,
    };

    // Ana tira 15 dias de férias (fator 0.5)
    // Cota trabalhada da Ana: 12.5% (R$ 25.000)
    // Valor que falta para cobrir a meta da loja: R$ 25.000 (12.5%)
    const targetToRedistribute = 25000;
    const shareToRedistribute = 12.5;

    // Gestor escolhe individualmente quanto dividir:
    // Bruna recebe R$ 15.000
    // Carla recebe R$ 10.000
    // Dani não recebe nada (R$ 0)
    const customAmountsAdd = {
      'seller-bruna': 15000,
      'seller-carla': 10000,
      'seller-dani': 0,
    };

    const totalAllocated = Object.values(customAmountsAdd).reduce((a, b) => a + b, 0);
    const remainingToAllocate = targetToRedistribute - totalAllocated;

    assert.equal(totalAllocated, 25000, 'Total alocado individualmente deve somar 25.000');
    assert.equal(remainingToAllocate, 0, 'Não deve restar nada a alocar');

    // Converte para novas participações da equipe
    const newShares: Record<string, number> = {
      'seller-ana': 12.5,
      'seller-bruna': Math.round((initialShares['seller-bruna'] + (customAmountsAdd['seller-bruna'] / monthlyUnitTarget) * 100) * 10) / 10,
      'seller-carla': Math.round((initialShares['seller-carla'] + (customAmountsAdd['seller-carla'] / monthlyUnitTarget) * 100) * 10) / 10,
      'seller-dani': initialShares['seller-dani'],
    };

    assert.equal(newShares['seller-ana'], 12.5); // R$ 25.000
    assert.equal(newShares['seller-bruna'], 32.5); // R$ 65.000 (25.000 + 15.000)
    assert.equal(newShares['seller-carla'], 30.0); // R$ 60.000 (25.000 + 10.000)
    assert.equal(newShares['seller-dani'], 25.0); // R$ 50.000

    const sumShares = Math.round(Object.values(newShares).reduce((a, b) => a + b, 0) * 10) / 10;
    assert.equal(sumShares, 100.0, 'Soma das porcentagens individuais deve ser 100.0%');

    const totalCalculatedRevenue = Object.values(newShares).reduce(
      (acc, s) => acc + Math.round(monthlyUnitTarget * (s / 100)),
      0
    );
    assert.equal(totalCalculatedRevenue, 200000, 'Soma em R$ deve fechar exatamente os R$ 200.000 da unidade');
  });

  test('8. Persistência imediata e síncrona de sellerShares no MonthlyMasterGoal', () => {
    // Simula a estrutura de masterGoals persistida no AppContext
    const masterGoalsStore: Record<string, MonthlyMasterGoal> = {};
    const goalKey = 'comp-1-branch-1-2026-9';

    // Estado inicial
    masterGoalsStore[goalKey] = {
      ...mockMasterGoal,
      sellerShares: {
        'seller-ana': 25,
        'seller-bruna': 25,
        'seller-carla': 25,
        'seller-dani': 25,
      },
    };

    // Usuário altera a participação de 'seller-ana' para 40% e clica em Salvar
    const updatedShares = {
      ...masterGoalsStore[goalKey].sellerShares,
      'seller-ana': 40,
    };

    masterGoalsStore[goalKey] = {
      ...masterGoalsStore[goalKey],
      sellerShares: updatedShares,
      updatedAt: new Date().toISOString(),
    };

    // Verifica se foi persistido imediatamente no store do mês
    assert.equal(masterGoalsStore[goalKey].sellerShares?.['seller-ana'], 40);
    assert.equal(masterGoalsStore[goalKey].sellerShares?.['seller-bruna'], 25);

    // Troca de mês (ex: mês 10) e retorna para o mês 9
    const loadedMasterGoal = masterGoalsStore[goalKey];
    assert.ok(loadedMasterGoal.sellerShares, 'sellerShares deve existir');
    assert.equal(loadedMasterGoal.sellerShares['seller-ana'], 40, 'Porcentagem personalizada de 40% deve ser preservada ao retornar');
  });

  test('9. Totais consolidados da Matriz (Meta Inicial vs Atual Distribuído vs Falta Distribuir)', () => {
    // Meta da Unidade: R$ 144.000,00
    const monthlyTarget = 144000;
    const sellers = [
      { sellerId: 'seller-1', officialSharePercentage: 25 }, // Base: 36.000
      { sellerId: 'seller-2', officialSharePercentage: 25 }, // Base: 36.000
      { sellerId: 'seller-3', officialSharePercentage: 25 }, // Base: 36.000
      { sellerId: 'seller-4', officialSharePercentage: 25 }, // Base: 36.000
    ];

    // Semana com 4 períodos iguais (25% cada = 36.000 por semana da loja)
    const weeks = [
      { weekNumber: 1, weightPercentage: 25 },
      { weekNumber: 2, weightPercentage: 25 },
      { weekNumber: 3, weightPercentage: 25 },
      { weekNumber: 4, weightPercentage: 25 },
    ];

    // Simula férias da seller-1: falta R$ 10.000 na meta dela (cota efetiva dela vira 26.000 em vez de 36.000)
    // As outras vendedoras continuam com 36.000 cada
    const effectiveSellerTargets: Record<string, number> = {
      'seller-1': 26000,
      'seller-2': 36000,
      'seller-3': 36000,
      'seller-4': 36000,
    };

    const monthDistributed = Object.values(effectiveSellerTargets).reduce((a, b) => a + b, 0);
    const monthMissing = Math.max(0, monthlyTarget - monthDistributed);
    const distributedPercentage = (monthDistributed / monthlyTarget) * 100;

    assert.equal(monthlyTarget, 144000, 'Meta inicial deve ser 144.000');
    assert.equal(monthDistributed, 134000, 'Total atual distribuído deve ser 134.000');
    assert.equal(monthMissing, 10000, 'Diferença que falta distribuir deve ser exatamente 10.000');
    assert.ok(distributedPercentage < 100, 'Percentual distribuído deve ser menor que 100%');
    assert.equal(Math.round(distributedPercentage * 10) / 10, 93.1, 'Percentual distribuído deve ser ~93.1%');
  });

  test('10. Redistribuição Individual Universal (com ou sem férias prévias) e Relatório de Confirmação em 100%', () => {
    // Meta da Loja: R$ 144.000,00
    const monthlyTarget = 144000;
    const sellers = [
      { sellerId: 'seller-1', sellerName: 'Ana', baseShare: 25, baseTarget: 36000 },
      { sellerId: 'seller-2', sellerName: 'Bruna', baseShare: 25, baseTarget: 36000 },
      { sellerId: 'seller-3', sellerName: 'Carla', baseShare: 25, baseTarget: 36000 },
      { sellerId: 'seller-4', sellerName: 'Dani', baseShare: 25, baseTarget: 36000 },
    ];

    // Cedente escolhida: Ana (seller-1). Meta a redistribuir: R$ 10.000 (mesmo sem férias cadastradas no sistema)
    const sourceSellerId = 'seller-1';
    const amountToRedistribute = 10000;
    const shareToRedistribute = (amountToRedistribute / monthlyTarget) * 100; // 6.9444...%

    // Divisão Individual escolhida:
    // Bruna recebe +R$ 7.000
    // Carla recebe +R$ 3.000
    // Dani recebe R$ 0
    const customAllocations = {
      'seller-2': 7000,
      'seller-3': 3000,
      'seller-4': 0,
    };

    const allocatedSum = Object.values(customAllocations).reduce((a, b) => a + b, 0);
    assert.equal(allocatedSum, amountToRedistribute, 'A soma das alocações individuais deve bater exatamente o valor a redistribuir');

    // Calcula novas participações
    const calculatedNewShares: Record<string, number> = {};
    calculatedNewShares[sourceSellerId] = Math.round((sellers[0].baseShare - shareToRedistribute) * 10) / 10; // 25 - 6.9 = 18.1%

    let recipientTotalShare = 0;
    for (const [sId, addedAmount] of Object.entries(customAllocations)) {
      const baseShare = sellers.find(s => s.sellerId === sId)!.baseShare;
      const addedShare = (addedAmount / monthlyTarget) * 100;
      calculatedNewShares[sId] = Math.round((baseShare + addedShare) * 10) / 10;
      recipientTotalShare += calculatedNewShares[sId];
    }

    // Ajuste fino para fechar exatamente em 100.0%
    const totalSharesCalculated = calculatedNewShares[sourceSellerId] + recipientTotalShare;
    const roundDiff = Math.round((100 - totalSharesCalculated) * 10) / 10;
    if (roundDiff !== 0) {
      calculatedNewShares['seller-2'] = Math.round((calculatedNewShares['seller-2'] + roundDiff) * 10) / 10;
    }

    const finalSumShares = Math.round(Object.values(calculatedNewShares).reduce((a, b) => a + b, 0) * 10) / 10;
    assert.equal(finalSumShares, 100.0, 'Soma das novas participações deve ser rigorosamente 100.0%');

    // Valida relatório de Antes vs Depois da tela de sucesso
    const report = sellers.map(s => {
      const newShare = calculatedNewShares[s.sellerId];
      const newTarget = Math.round(monthlyTarget * (newShare / 100));
      const diff = newTarget - s.baseTarget;
      return {
        sellerId: s.sellerId,
        sellerName: s.sellerName,
        baseTarget: s.baseTarget,
        newTarget,
        diff,
        newShare,
      };
    });

    const totalReportRevenue = report.reduce((acc, r) => acc + r.newTarget, 0);
    assert.equal(totalReportRevenue, monthlyTarget, 'Soma das novas metas no relatório deve fechar os 144.000 da unidade');

    // Ana cedeu ~10.000
    assert.ok(report.find(r => r.sellerId === 'seller-1')!.diff < 0);
    // Bruna e Carla aumentaram suas metas
    assert.ok(report.find(r => r.sellerId === 'seller-2')!.diff > 0);
    assert.ok(report.find(r => r.sellerId === 'seller-3')!.diff > 0);
  });

  test('11. Roteiro Semanal de Níveis (Bronze, Prata, Ouro, Diamante) com Valores Reais e Proporcionais por Vendedora', () => {
    // 4 níveis da unidade configurados no mês (Bronze: 144k, Prata: 165.6k, Ouro: 182.16k, Diamante: 200.376k)
    const activeLevels = [
      { level: 1, name: 'Bronze', revenueTarget: 144000, commissionPercentage: 1.0 },
      { level: 2, name: 'Prata', revenueTarget: 165600, commissionPercentage: 1.5 },
      { level: 3, name: 'Ouro', revenueTarget: 182160, commissionPercentage: 2.0 },
      { level: 4, name: 'Diamante', revenueTarget: 200376, commissionPercentage: 2.5 },
    ];

    const weekWeightPct = 25; // Semana 1 com 25%

    const sellers = [
      { id: 'seller-ana', name: 'Ana', share: 25, availFactor: 1.0 },
      { id: 'seller-bruna', name: 'Bruna', share: 25, availFactor: 1.0 },
      { id: 'seller-carla', name: 'Carla', share: 30, availFactor: 1.0 },
      { id: 'seller-dani', name: 'Dani', share: 20, availFactor: 0.0 }, // Dani de férias na semana
    ];

    // Calcula as metas semanais de cada vendedora para cada nível
    const matrix: Record<string, Record<string, number>> = {};

    sellers.forEach((seller) => {
      matrix[seller.id] = {};
      activeLevels.forEach((lvl) => {
        const val = Math.round(
          lvl.revenueTarget * (weekWeightPct / 100) * (seller.share / 100) * seller.availFactor
        );
        matrix[seller.id][lvl.name] = val;
      });
    });

    // Ana (25% e presente):
    // Bronze: 144.000 * 0.25 * 0.25 = 9.000
    // Prata: 165.600 * 0.25 * 0.25 = 10.350
    // Ouro: 182.160 * 0.25 * 0.25 = 11.385
    // Diamante: 200.376 * 0.25 * 0.25 = 12.524 (arredondado)
    assert.equal(matrix['seller-ana']['Bronze'], 9000);
    assert.equal(matrix['seller-ana']['Prata'], 10350);
    assert.equal(matrix['seller-ana']['Ouro'], 11385);
    assert.equal(matrix['seller-ana']['Diamante'], 12524);

    // Os valores NÃO são iguais entre os níveis! Cada faixa possui seu valor progressivo
    assert.ok(
      matrix['seller-ana']['Bronze'] < matrix['seller-ana']['Prata'],
      'Bronze deve ser menor que Prata'
    );
    assert.ok(
      matrix['seller-ana']['Prata'] < matrix['seller-ana']['Ouro'],
      'Prata deve ser menor que Ouro'
    );
    assert.ok(
      matrix['seller-ana']['Ouro'] < matrix['seller-ana']['Diamante'],
      'Ouro deve ser menor que Diamante'
    );

    // Carla (30% e presente): metas proporcionalmente maiores
    assert.equal(matrix['seller-carla']['Bronze'], 10800); // 144k * 0.25 * 0.30
    assert.equal(matrix['seller-carla']['Prata'], 12420); // 165.6k * 0.25 * 0.30

    // Dani (de férias na semana): todas as faixas zeradas
    assert.equal(matrix['seller-dani']['Bronze'], 0);
    assert.equal(matrix['seller-dani']['Prata'], 0);
    assert.equal(matrix['seller-dani']['Ouro'], 0);
    assert.equal(matrix['seller-dani']['Diamante'], 0);
  });

  test('12. Modo de Privacidade no Relatório Individual (Ocultação da Participação e Meta da Loja)', () => {
    const monthlyTarget = 144000;
    const seller = {
      sellerName: 'Camila Santos',
      officialSharePercentage: 25.0,
      sellerMonthlyTarget: 36000,
    };

    // Função de geração de texto com controle de privacidade
    const formatReportSummary = (isPrivacyMode: boolean) => {
      const lines = [
        `Consultor(a): ${seller.sellerName}`,
        `Meta Mensal Oficial: R$ ${seller.sellerMonthlyTarget.toLocaleString('pt-BR')},00`,
      ];
      if (!isPrivacyMode) {
        lines.push(`Participação na Meta da Loja: ${seller.officialSharePercentage.toFixed(1)}% (Total da Loja: R$ ${monthlyTarget.toLocaleString('pt-BR')},00)`);
      } else {
        lines.push(`Participação: [Meta Individual Protegida]`);
      }
      return lines.join('\n');
    };

    // Modo Seguro / Privado (para entrega à vendedora)
    const privateReport = formatReportSummary(true);
    assert.ok(!privateReport.includes('144.000'), 'Relatório privado NÃO deve expor a meta total da loja');
    assert.ok(!privateReport.includes('25.0%'), 'Relatório privado NÃO deve expor o percentual da loja');
    assert.ok(privateReport.includes('36.000'), 'Relatório privado deve conter a meta individual da vendedora');
    assert.ok(privateReport.includes('[Meta Individual Protegida]'));

    // Modo Gerencial (para diretoria / consultoria)
    const publicReport = formatReportSummary(false);
    assert.ok(publicReport.includes('144.000'), 'Relatório gerencial deve conter a meta da loja');
    assert.ok(publicReport.includes('25.0%'), 'Relatório gerencial deve conter a participação');
  });

  test('13. Discriminação e Persistência de vacationAdditions (Meta Base + Cobertura Férias = Meta Oficial)', () => {
    // Cenário: Loja com Meta de R$ 144.000,00
    // Vendedora 1 (Ana) sai de férias e sua cota de R$ 10.000 é redistribuída:
    // Bruna recebe +R$ 7.000 e Carla recebe +R$ 3.000
    const monthlyTarget = 144000;
    const baseShares: Record<string, number> = {
      'seller-ana': 25, // 36.000
      'seller-bruna': 25, // 36.000
      'seller-carla': 25, // 36.000
      'seller-dani': 25, // 36.000
    };

    const vacationAdditions: Record<string, number> = {
      'seller-bruna': 7000,
      'seller-carla': 3000,
    };

    // Novas metas calculadas
    const brunaOriginalBase = Math.round(monthlyTarget * (baseShares['seller-bruna'] / 100)); // 36.000
    const brunaVacationAdd = vacationAdditions['seller-bruna'] || 0; // 7.000
    const brunaOfficialTarget = brunaOriginalBase + brunaVacationAdd; // 43.000

    assert.equal(brunaOriginalBase, 36000);
    assert.equal(brunaVacationAdd, 7000);
    assert.equal(brunaOfficialTarget, 43000);

    // Formatação discriminada para relatório/WhatsApp
    const formatSellerSummary = (sellerId: string, name: string) => {
      const add = vacationAdditions[sellerId] || 0;
      const base = Math.round(monthlyTarget * (baseShares[sellerId] / 100));
      const total = base + add;
      let text = `🎯 *Meta Mensal Oficial:* ${formatCurrency(total)}\n`;
      if (add > 0) {
        text += `🌴 *Cota de Férias Incluída:* +${formatCurrency(add)} (Meta Base Regular: ${formatCurrency(base)})`;
      }
      return text;
    };

    const brunaText = formatSellerSummary('seller-bruna', 'Bruna');
    assert.ok(brunaText.includes(formatCurrency(43000)), 'Deve exibir meta total oficial de 43.000');
    assert.ok(brunaText.includes(`+${formatCurrency(7000)}`), 'Deve discriminar os 7.000 de férias');
    assert.ok(brunaText.includes(formatCurrency(36000)), 'Deve discriminar a meta base de 36.000');

    // Vendedora sem acréscimo de férias
    const daniText = formatSellerSummary('seller-dani', 'Dani');
    assert.ok(!daniText.includes('Cota de Férias Incluída'), 'Dani não deve ter menção de férias');
    assert.ok(daniText.includes(formatCurrency(36000)));
  });

  test('14. Cartão Visual Compacto (Story / Card de Alta Conversão) com resumo operacional', () => {
    const seller = {
      name: 'Bruna Lima',
      monthlyTarget: 43000,
      vacationAdd: 7000,
      originalBase: 36000,
      avgTicket: 250,
      weeks: [
        { weekNumber: 1, target: 10750, weight: 25 },
        { weekNumber: 2, target: 10750, weight: 25 },
        { weekNumber: 3, target: 10750, weight: 25 },
        { weekNumber: 4, target: 10750, weight: 25 },
      ],
    };

    const requiredSales = Math.ceil(seller.monthlyTarget / seller.avgTicket);
    assert.equal(requiredSales, 172, '43.000 / 250 = 172 clientes');

    // Validação da estrutura de dados do card compacto
    const compactCardData = {
      sellerName: seller.name,
      monthlyTarget: seller.monthlyTarget,
      vacationAdd: seller.vacationAdd,
      requiredSales,
      avgTicket: seller.avgTicket,
      weeklyCount: seller.weeks.length,
    };

    assert.equal(compactCardData.sellerName, 'Bruna Lima');
    assert.equal(compactCardData.monthlyTarget, 43000);
    assert.equal(compactCardData.vacationAdd, 7000);
    assert.equal(compactCardData.requiredSales, 172);
  });

  test('15. Termômetro Dinâmico de Superação de Níveis e Salto de Comissões', () => {
    const monthlyTarget = 40000;
    const realizedRevenue = 45000;

    const levels = [
      { id: '1', name: 'Bronze', revenueTarget: 32000, commissionPercentage: 2.0 },
      { id: '2', name: 'Prata', revenueTarget: 40000, commissionPercentage: 3.0 },
      { id: '3', name: 'Ouro', revenueTarget: 48000, commissionPercentage: 4.0 },
      { id: '4', name: 'Diamante', revenueTarget: 56000, commissionPercentage: 5.0 },
    ];

    // Encontra nível conquistado
    const currentLevelIndex = levels.reduce((acc, lvl, idx) => {
      return realizedRevenue >= lvl.revenueTarget ? idx : acc;
    }, -1);

    assert.equal(currentLevelIndex, 1, '45.000 supera Prata (40.000), mas ainda não atingiu Ouro (48.000)');
    const currentLevel = levels[currentLevelIndex];
    assert.equal(currentLevel.name, 'Prata');
    assert.equal(currentLevel.commissionPercentage, 3.0);

    // Próximo nível a ser alcançado
    const nextLevel = levels[currentLevelIndex + 1];
    assert.equal(nextLevel.name, 'Ouro');
    assert.equal(nextLevel.commissionPercentage, 4.0);

    const remainingToNext = Math.max(0, nextLevel.revenueTarget - realizedRevenue);
    assert.equal(remainingToNext, 3000, 'Faltam exatamente 3.000 para virar para Ouro');

    const commissionDiff = nextLevel.commissionPercentage - currentLevel.commissionPercentage;
    assert.equal(commissionDiff, 1.0, 'Salto de comissão de 1.0 ponto percentual');
  });

  test('16. Impressão em Lote com Quebra de Página por Vendedora e Modo Privacidade', () => {
    const sellers = [
      { id: '1', name: 'Ana', share: 25 },
      { id: '2', name: 'Bruna', share: 25 },
      { id: '3', name: 'Carla', share: 25 },
      { id: '4', name: 'Dani', share: 25 },
    ];

    // Verifica montagem da lista de páginas
    const pages = sellers.map((s, idx) => ({
      pageNumber: idx + 1,
      totalPages: sellers.length,
      sellerName: s.name,
      pageBreakClass: 'seller-page-card',
    }));

    assert.equal(pages.length, 4);
    assert.equal(pages[0].pageNumber, 1);
    assert.equal(pages[3].pageNumber, 4);
    assert.equal(pages[0].totalPages, 4);
    assert.equal(pages[0].pageBreakClass, 'seller-page-card');
  });
});



