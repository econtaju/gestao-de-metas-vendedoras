import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  getSellerIntervalAvailability,
  DEFAULT_WORKING_DAYS_SETTINGS,
} from '../src/services/availabilityEngine';
import {
  calculateSellerGoalDetail,
  replicateSharesToOtherMonths,
  buildCommercialWeeks,
} from '../src/services/masterGoalEngine';
import {
  Seller,
  MonthlyMasterGoal,
  SellerAvailability,
  CommercialWeekPeriod,
} from '../src/types';

describe('Férias Proporcionais nas Semanas & Replicação de Metas', () => {
  const mockSeller: Seller = {
    id: 'seller-ana',
    name: 'Ana Silva',
    companyId: 'comp-1',
    branchId: 'branch-1',
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
      startDate: '2026-09-01',
      endDate: '2026-09-07',
      weightPercentage: 25,
      revenueTarget: 50000,
      targetAmount: 50000,
    },
    {
      weekNumber: 2,
      startDay: 8,
      endDay: 14,
      startDate: '2026-09-08',
      endDate: '2026-09-14',
      weightPercentage: 25,
      revenueTarget: 50000,
      targetAmount: 50000,
    },
    {
      weekNumber: 3,
      startDay: 15,
      endDay: 21,
      startDate: '2026-09-15',
      endDate: '2026-09-21',
      weightPercentage: 25,
      revenueTarget: 50000,
      targetAmount: 50000,
    },
    {
      weekNumber: 4,
      startDay: 22,
      endDay: 30,
      startDate: '2026-09-22',
      endDate: '2026-09-30',
      weightPercentage: 25,
      revenueTarget: 50000,
      targetAmount: 50000,
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
        sellerId: 'seller-ana',
        startDate: '2026-09-08',
        endDate: '2026-09-21', // Cobre a semana 2 inteira e semana 3
        type: 'vacation',
        notes: 'Férias regulares',
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
        sellerId: 'seller-ana',
        startDate: '2026-09-08',
        endDate: '2026-09-14', // Semana 2 inteira de férias
        type: 'vacation',
        notes: 'Férias Semana 2',
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
});
