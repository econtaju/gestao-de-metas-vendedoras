import {
  Seller,
  CommercialWeekPeriod,
  WorkingDaysSettings,
  SellerAvailability,
  AvailabilityRedistributionResult,
  AvailabilityRedistributionMethod,
  GoalLevel,
} from '../types';

export const DEFAULT_WORKING_DAYS_SETTINGS: WorkingDaysSettings = {
  weeklySchedule: [
    { day: 0, name: 'Domingo', isOpen: false },
    { day: 1, name: 'Segunda-feira', isOpen: true },
    { day: 2, name: 'Terça-feira', isOpen: true },
    { day: 3, name: 'Quarta-feira', isOpen: true },
    { day: 4, name: 'Quinta-feira', isOpen: true },
    { day: 5, name: 'Sexta-feira', isOpen: true },
    { day: 6, name: 'Sábado', isOpen: true },
  ],
  holidays: [
    { id: 'hol-01-01', date: '2026-01-01', name: 'Confraternização Universal', isClosed: true },
    { id: 'hol-04-21', date: '2026-04-21', name: 'Tiradentes', isClosed: true },
    { id: 'hol-05-01', date: '2026-05-01', name: 'Dia do Trabalho', isClosed: true },
    { id: 'hol-09-07', date: '2026-09-07', name: 'Independência do Brasil', isClosed: true },
    { id: 'hol-10-12', date: '2026-10-12', name: 'Nossa Senhora Aparecida', isClosed: true },
    { id: 'hol-11-02', date: '2026-11-02', name: 'Finados', isClosed: true },
    { id: 'hol-11-15', date: '2026-11-15', name: 'Proclamação da República', isClosed: true },
    { id: 'hol-12-25', date: '2026-12-25', name: 'Natal', isClosed: true },
  ],
};

/**
 * Converte string 'YYYY-MM-DD' para Date local (evitando problemas de fusos horários UTC).
 */
export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date(dateStr);
}

/**
 * Formata Date local para 'YYYY-MM-DD'
 */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Verifica se um dia específico é letivo/comercial conforme o calendário configurado.
 */
export function isWorkingDay(date: Date, settings: WorkingDaysSettings): boolean {
  const dayOfWeek = date.getDay(); // 0 = Domingo, 6 = Sábado
  const daySched = settings.weeklySchedule.find((s) => s.day === dayOfWeek);
  if (!daySched || !daySched.isOpen) {
    return false; // Dia fechado por padrão de funcionamento
  }

  const dateStr = formatLocalDate(date);
  const holiday = settings.holidays.find((h) => h.date === dateStr && h.isClosed);
  if (holiday) {
    return false; // Feriado / dia de loja fechada
  }

  return true;
}

/**
 * Retorna os dias previstos de trabalho em um intervalo de datas [start, end].
 */
export function getWorkingDaysInInterval(
  startDateStr: string,
  endDateStr: string,
  settings: WorkingDaysSettings = DEFAULT_WORKING_DAYS_SETTINGS
): { totalDays: number; workingDays: number } {
  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);

  let totalDays = 0;
  let workingDays = 0;

  const cur = new Date(start);
  while (cur <= end) {
    totalDays++;
    if (isWorkingDay(cur, settings)) {
      workingDays++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  return { totalDays, workingDays };
}

/**
 * Calcula a disponibilidade detalhada de um vendedor para um intervalo específico de datas (ex: uma semana).
 */
export function getSellerIntervalAvailability(
  sellerId: string,
  startDateStr: string,
  endDateStr: string,
  availabilities: SellerAvailability[],
  settings: WorkingDaysSettings = DEFAULT_WORKING_DAYS_SETTINGS
): {
  daysExpected: number;
  daysAvailable: number;
  factor: number;
  activeAbsences: SellerAvailability[];
} {
  const { workingDays: daysExpected } = getWorkingDaysInInterval(startDateStr, endDateStr, settings);

  if (daysExpected === 0) {
    return { daysExpected: 0, daysAvailable: 0, factor: 1, activeAbsences: [] };
  }

  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);

  // Filtra ausências ativas que sobrepõem o intervalo
  const sellerAbsences = availabilities.filter((a) => {
    if (a.sellerId !== sellerId) return false;
    const aStart = parseLocalDate(a.startDate);
    const aEnd = parseLocalDate(a.endDate);
    return aStart <= end && aEnd >= start;
  });

  if (sellerAbsences.length === 0) {
    return { daysExpected, daysAvailable: daysExpected, factor: 1, activeAbsences: [] };
  }

  let totalAvailableWeighted = 0;

  const cur = new Date(start);
  while (cur <= end) {
    if (isWorkingDay(cur, settings)) {
      const curStr = formatLocalDate(cur);
      // Verifica se o dia cai em alguma ausência do vendedor
      const matchingAbsence = sellerAbsences.find((a) => {
        return curStr >= a.startDate && curStr <= a.endDate;
      });

      if (matchingAbsence) {
        // Se houver ausência, o dia vale conforme o percentual de disponibilidade (ex: 0% para férias, 50% para meio período)
        const dayAvailabilityFactor = (matchingAbsence.availabilityPercentage ?? 0) / 100;
        totalAvailableWeighted += dayAvailabilityFactor;
      } else {
        totalAvailableWeighted += 1;
      }
    }
    cur.setDate(cur.getDate() + 1);
  }

  const daysAvailable = Math.round(totalAvailableWeighted * 100) / 100;
  const factor = Math.min(1, Math.max(0, daysAvailable / daysExpected));

  return {
    daysExpected,
    daysAvailable,
    factor,
    activeAbsences: sellerAbsences,
  };
}

/**
 * MOTOR MATEMÁTICO CENTRAL DE REDISTRIBUIÇÃO DE METAS POR INDISPONIBILIDADE / FÉRIAS
 *
 * Segue a regra matemática oficial:
 * META MENSAL DA UNIDADE -> PESO DA SEMANA -> META SEMANAL DA UNIDADE ->
 * PARTICIPAÇÃO OFICIAL DO VENDEDOR -> FATOR DE DISPONIBILIDADE -> PESO AJUSTADO DO VENDEDOR ->
 * RENORMALIZAÇÃO DA EQUIPE DISPONÍVEL -> META SEMANAL INDIVIDUAL AJUSTADA -> META MENSAL INDIVIDUAL AJUSTADA
 */
export function calculateAvailabilityRedistribution(
  companyId: string,
  branchId: string,
  year: number,
  monthNumber: number,
  monthlyUnitTarget: number,
  weeks: CommercialWeekPeriod[],
  sellers: Seller[],
  availabilities: SellerAvailability[],
  workingDaysSettings: WorkingDaysSettings = DEFAULT_WORKING_DAYS_SETTINGS,
  redistributionMethodOverride?: AvailabilityRedistributionMethod,
  manualAllocationsOverride?: Record<string, number>,
  adjustGoalLevelsProportionally: boolean = true,
  companyLevels: GoalLevel[] = []
): AvailabilityRedistributionResult {
  const safeActiveCompanySellers = sellers.filter((s) => s.active && (!s.companyId || s.companyId === companyId));
  let activeSellers = branchId === 'all'
    ? safeActiveCompanySellers
    : safeActiveCompanySellers.filter((s) => s.branchId === branchId);

  // Fallback seguro se a filial não tiver vendedoras mas a empresa tiver
  if (activeSellers.length === 0 && safeActiveCompanySellers.length > 0) {
    activeSellers = safeActiveCompanySellers;
  }

  // Determina o método de redistribuição (se passado um override na ausência cadastrada)
  const primaryAbsence = availabilities.find(
    (a) => a.companyId === companyId && (branchId === 'all' || a.branchId === branchId)
  );
  const method: AvailabilityRedistributionMethod =
    redistributionMethodOverride || primaryAbsence?.redistributionMethod || 'proportional';

  const manualAllocations = manualAllocationsOverride || primaryAbsence?.manualAllocations || {};

  // Mapeamento de metas semanais ajustadas por vendedor e semana
  const sellerWeeklyAdjustedTargets: Record<string, number[]> = {};
  const sellerWeeklyOriginalTargets: Record<string, number[]> = {};
  const sellerWeeklyDaysExpected: Record<string, number[]> = {};
  const sellerWeeklyDaysAvailable: Record<string, number[]> = {};
  const sellerWeeklyFactors: Record<string, number[]> = {};

  activeSellers.forEach((s) => {
    sellerWeeklyAdjustedTargets[s.id] = [];
    sellerWeeklyOriginalTargets[s.id] = [];
    sellerWeeklyDaysExpected[s.id] = [];
    sellerWeeklyDaysAvailable[s.id] = [];
    sellerWeeklyFactors[s.id] = [];
  });

  const weeklyImpacts: AvailabilityRedistributionResult['weeklyImpacts'] = [];
  let adjustedUnitMonthlySum = 0;

  // PROCESSAMENTO SEMANA A SEMANA
  weeks.forEach((w) => {
    const weekUnitTarget = Math.round(monthlyUnitTarget * (w.weightPercentage / 100));

    // Define as datas da semana
    const mStr = String(monthNumber).padStart(2, '0');
    const startDateStr =
      w.startDate ||
      `${year}-${mStr}-${String(w.startDay || [1, 8, 16, 24][w.weekNumber - 1] || 1).padStart(2, '0')}`;
    const endDateStr =
      w.endDate ||
      `${year}-${mStr}-${String(w.endDay || [7, 15, 23, 31][w.weekNumber - 1] || 31).padStart(2, '0')}`;

    const weekSellerDetails: Record<
      string,
      {
        daysExpected: number;
        daysAvailable: number;
        factor: number;
        officialShare: number;
        tempShare: number;
        originalTarget: number;
        adjustedTarget: number;
        differenceAmount: number;
      }
    > = {};

    let totalTempShare = 0;
    let unassignedTargetSum = 0;

    // 1. Calcula a participação ponderada temporária de cada vendedor na semana
    activeSellers.forEach((s) => {
      const share = s.officialSharePercentage ?? 100 / Math.max(1, activeSellers.length);
      const origTarget = Math.round(weekUnitTarget * (share / 100));
      sellerWeeklyOriginalTargets[s.id].push(origTarget);

      const avail = getSellerIntervalAvailability(
        s.id,
        startDateStr,
        endDateStr,
        availabilities,
        workingDaysSettings
      );

      sellerWeeklyDaysExpected[s.id].push(avail.daysExpected);
      sellerWeeklyDaysAvailable[s.id].push(avail.daysAvailable);
      sellerWeeklyFactors[s.id].push(avail.factor);

      const tempShare = share * avail.factor;
      totalTempShare += tempShare;

      // Se o vendedor teve redução, acumula a meta desocupada
      const unassignedFromSeller = origTarget * (1 - avail.factor);
      unassignedTargetSum += unassignedFromSeller;

      weekSellerDetails[s.id] = {
        daysExpected: avail.daysExpected,
        daysAvailable: avail.daysAvailable,
        factor: avail.factor,
        officialShare: share,
        tempShare,
        originalTarget: origTarget,
        adjustedTarget: origTarget, // será atualizado na renormalização
        differenceAmount: 0,
      };
    });

    // 2. Renormalização / Redistribuição da Semana
    if (method === 'reduce_unit') {
      // OPÇÃO 4: Reduz a meta da unidade na semana (não força os outros a cobrir a ausência)
      activeSellers.forEach((s) => {
        const d = weekSellerDetails[s.id];
        const adj = Math.round(d.originalTarget * d.factor);
        d.adjustedTarget = adj;
        d.differenceAmount = adj - d.originalTarget;
        sellerWeeklyAdjustedTargets[s.id].push(adj);
      });
    } else if (method === 'proportional') {
      // OPÇÃO 1: Redistribui proporcionalmente a meta liberada entre os disponíveis
      activeSellers.forEach((s) => {
        const d = weekSellerDetails[s.id];
        let adj = 0;
        if (totalTempShare > 0) {
          adj = Math.round(weekUnitTarget * (d.tempShare / totalTempShare));
        } else {
          adj = Math.round(weekUnitTarget / activeSellers.length);
        }
        d.adjustedTarget = adj;
        d.differenceAmount = adj - d.originalTarget;
        sellerWeeklyAdjustedTargets[s.id].push(adj);
      });
    } else if (method === 'equal') {
      // OPÇÃO 2: Redistribui a sobra da meta liberada igualmente entre quem está disponível
      const availableSellers = activeSellers.filter(
        (s) => (weekSellerDetails[s.id]?.factor ?? 0) > 0
      );
      const equalExtraPerSeller =
        availableSellers.length > 0 ? unassignedTargetSum / availableSellers.length : 0;

      activeSellers.forEach((s) => {
        const d = weekSellerDetails[s.id];
        let adj = Math.round(d.originalTarget * d.factor);
        if (d.factor > 0) {
          adj += Math.round(equalExtraPerSeller);
        }
        d.adjustedTarget = adj;
        d.differenceAmount = adj - d.originalTarget;
        sellerWeeklyAdjustedTargets[s.id].push(adj);
      });
    } else if (method === 'manual') {
      // OPÇÃO 3: Redistribuição manual (com base no rateio definido pelo consultor/gestor)
      const totalManualAllocated = Object.values(manualAllocations).reduce((a, b) => a + b, 0);

      activeSellers.forEach((s) => {
        const d = weekSellerDetails[s.id];
        let adj = Math.round(d.originalTarget * d.factor);
        const manualAdd = manualAllocations[s.id] || 0;
        // Pondera o acréscimo manual pela proporção da semana
        adj += Math.round(manualAdd * (w.weightPercentage / 100));
        d.adjustedTarget = adj;
        d.differenceAmount = adj - d.originalTarget;
        sellerWeeklyAdjustedTargets[s.id].push(adj);
      });
    }

    weeklyImpacts.push({
      weekNumber: w.weekNumber,
      weekLabel: w.label,
      weekWeight: w.weightPercentage,
      weekUnitTarget,
      sellerAvailabilities: activeSellers.reduce(
        (acc, s) => {
          const d = weekSellerDetails[s.id];
          acc[s.id] = {
            daysExpected: d.daysExpected,
            daysAvailable: d.daysAvailable,
            factor: d.factor,
            originalTarget: d.originalTarget,
            adjustedTarget: d.adjustedTarget,
            differenceAmount: d.differenceAmount,
          };
          return acc;
        },
        {} as AvailabilityRedistributionResult['weeklyImpacts'][0]['sellerAvailabilities']
      ),
    });
  });

  // 3. CONSOLIDAÇÃO MENSAL DAS VENDEDORAS
  const sellerImpacts: AvailabilityRedistributionResult['sellerImpacts'] = activeSellers.map(
    (s) => {
      const origMonthlyTarget = sellerWeeklyOriginalTargets[s.id].reduce((a, b) => a + b, 0);
      const adjMonthlyTarget = sellerWeeklyAdjustedTargets[s.id].reduce((a, b) => a + b, 0);
      const totalDaysExpected = sellerWeeklyDaysExpected[s.id].reduce((a, b) => a + b, 0);
      const totalDaysAvailable = sellerWeeklyDaysAvailable[s.id].reduce((a, b) => a + b, 0);

      const availabilityFactor =
        totalDaysExpected > 0 ? totalDaysAvailable / totalDaysExpected : 1;
      const differenceAmount = adjMonthlyTarget - origMonthlyTarget;
      const differencePct =
        origMonthlyTarget > 0 ? (differenceAmount / origMonthlyTarget) * 100 : 0;

      // Alerta de Sobrecarga (Carga Adicional da Equipe)
      const overloadPercentage =
        origMonthlyTarget > 0 ? Math.max(0, (differenceAmount / origMonthlyTarget) * 100) : 0;
      const isOverloaded = overloadPercentage >= 20;

      let overloadWarningMessage: string | undefined;
      if (isOverloaded) {
        overloadWarningMessage = `ATENÇÃO: a redistribuição aumentou em ${overloadPercentage.toFixed(1)}% a meta desta vendedora.`;
      }

      // Níveis de Meta Ajustados Proporcionalmente (Meta 1, 2, 3, 4)
      let adjustedLevels: GoalLevel[] | undefined;
      if (adjustGoalLevelsProportionally && companyLevels.length > 0 && origMonthlyTarget > 0) {
        const ratio = adjMonthlyTarget / origMonthlyTarget;
        adjustedLevels = companyLevels.map((lvl) => ({
          ...lvl,
          revenueTarget: Math.round(lvl.revenueTarget * ratio),
        }));
      }

      // Faturamento por dia disponível (para diagnósticos futuros sem penalização por férias)
      const revenuePerAvailableDay =
        totalDaysAvailable > 0 ? Math.round(adjMonthlyTarget / totalDaysAvailable) : 0;

      adjustedUnitMonthlySum += adjMonthlyTarget;

      return {
        sellerId: s.id,
        sellerName: s.name,
        officialShare: s.officialSharePercentage ?? 25,
        daysExpected: totalDaysExpected,
        daysAvailable: totalDaysAvailable,
        availabilityFactor,
        originalMonthlyTarget: origMonthlyTarget,
        adjustedMonthlyTarget: adjMonthlyTarget,
        differenceAmount,
        differencePct,
        overloadPercentage,
        isOverloaded,
        overloadWarningMessage,
        adjustedLevels,
        revenuePerAvailableDay,
      };
    }
  );

  const adjustedUnitTarget =
    method === 'reduce_unit' ? adjustedUnitMonthlySum : monthlyUnitTarget;
  const unitTargetDifference = adjustedUnitTarget - monthlyUnitTarget;

  return {
    companyId,
    branchId,
    year,
    monthNumber,
    originalUnitTarget: monthlyUnitTarget,
    adjustedUnitTarget,
    unitTargetDifference,
    redistributionMethod: method,
    sellerImpacts,
    weeklyImpacts,
  };
}
