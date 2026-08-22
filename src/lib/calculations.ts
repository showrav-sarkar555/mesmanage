// ─── Mess Manager Calculation Engine ────────────────────────────────────────
// Pure, isolated arithmetic utility functions for monthly mess accounting.
// All functions are stateless and testable.

import type {
  DailyMealEntry,
  DepositEntry,
  MealCostEntry,
  MemberSummary,
  MonthCycle,
  MonthSummary,
  OtherCostEntry,
  Member,
} from './types';

/**
 * 1. Total Consumed Meals across all members
 * M_total = Σ (Breakfast_i + Lunch_i + Dinner_i)
 */
export function calcTotalConsumedMeals(meals: DailyMealEntry[]): number {
  return meals.reduce(
    (sum, m) => sum + m.breakfast + m.lunch + m.dinner,
    0
  );
}

/**
 * Total meals for a single member
 */
export function calcMemberMeals(
  meals: DailyMealEntry[],
  memberId: string
): { total: number; breakfast: number; lunch: number; dinner: number } {
  const memberMeals = meals.filter((m) => m.memberId === memberId);
  const breakfast = memberMeals.reduce((s, m) => s + m.breakfast, 0);
  const lunch = memberMeals.reduce((s, m) => s + m.lunch, 0);
  const dinner = memberMeals.reduce((s, m) => s + m.dinner, 0);
  return {
    total: breakfast + lunch + dinner,
    breakfast,
    lunch,
    dinner,
  };
}

/**
 * 2. Total Meal / Bazar Cost
 * C_meal = Σ Bazar/Grocery Cost entries
 */
export function calcTotalMealCost(mealCosts: MealCostEntry[]): number {
  return mealCosts.reduce((sum, c) => sum + c.amount, 0);
}

/**
 * 3. Mess Meal Rate
 * R_meal = C_meal / M_total  (if M_total > 0, else 0.00)
 */
export function calcMealRate(
  totalMealCost: number,
  totalMeals: number
): number {
  if (totalMeals <= 0) return 0;
  return totalMealCost / totalMeals;
}

/**
 * 4. Shared Other Cost for a member
 * For each shared expense: Per Member Share = Amount / Count(Selected Members)
 * Each selected member accumulates their fractional split.
 */
export function calcSharedCosts(
  otherCosts: OtherCostEntry[],
  memberId: string
): number {
  return otherCosts
    .filter(
      (c) =>
        c.costType === 'SHARED' && c.targetMemberIds.includes(memberId)
    )
    .reduce((sum, c) => {
      const share = c.amount / c.targetMemberIds.length;
      return sum + share;
    }, 0);
}

/**
 * 5. Individual Other Cost for a member
 * Direct personal charge assigned specifically to member
 */
export function calcIndividualCosts(
  otherCosts: OtherCostEntry[],
  memberId: string
): number {
  return otherCosts
    .filter(
      (c) =>
        c.costType === 'INDIVIDUAL' &&
        c.targetMemberIds.includes(memberId)
    )
    .reduce((sum, c) => sum + c.amount, 0);
}

/**
 * Total deposits for a single member
 */
export function calcMemberDeposits(
  deposits: DepositEntry[],
  memberId: string
): number {
  return deposits
    .filter((d) => d.memberId === memberId)
    .reduce((sum, d) => sum + d.amount, 0);
}

/**
 * 6. Member Total Cost
 * C_total_i = (M_i × R_meal) + C_shared_i + C_individual_i
 */
export function calcMemberTotalCost(
  mealRate: number,
  memberTotalMeals: number,
  sharedCost: number,
  individualCost: number
): number {
  return mealRate * memberTotalMeals + sharedCost + individualCost;
}

/**
 * 7. Member Balance
 * B_i = D_i - C_total_i
 * Positive = credit (owed by mess), Negative = debit (owes to mess)
 */
export function calcMemberBalance(
  totalDeposit: number,
  totalCost: number
): number {
  return totalDeposit - totalCost;
}

/**
 * 8. Mess Cash in Hand / Mess Balance
 * B_mess = Σ D_i - (C_meal + Σ C_shared + Σ C_individual)
 */
export function calcMessBalance(
  deposits: DepositEntry[],
  mealCosts: MealCostEntry[],
  otherCosts: OtherCostEntry[]
): number {
  const totalDeposits = deposits.reduce((s, d) => s + d.amount, 0);
  const totalMealCost = mealCosts.reduce((s, c) => s + c.amount, 0);
  const totalOtherCosts = otherCosts.reduce((s, c) => s + c.amount, 0);
  return totalDeposits - (totalMealCost + totalOtherCosts);
}

/**
 * Total shared costs across all entries
 */
export function calcTotalSharedCosts(otherCosts: OtherCostEntry[]): number {
  return otherCosts
    .filter((c) => c.costType === 'SHARED')
    .reduce((s, c) => s + c.amount, 0);
}

/**
 * Total individual costs across all entries
 */
export function calcTotalIndividualCosts(
  otherCosts: OtherCostEntry[]
): number {
  return otherCosts
    .filter((c) => c.costType === 'INDIVIDUAL')
    .reduce((s, c) => s + c.amount, 0);
}

/**
 * 10. Complete Member Summary — all financial data for a single member
 */
export function calcMemberSummary(
  month: MonthCycle,
  member: Member
): MemberSummary {
  const mealData = calcMemberMeals(month.meals, member.id);
  const totalMeals = calcTotalConsumedMeals(month.meals);
  const totalMealCost = calcTotalMealCost(month.mealCosts);
  const mealRate = calcMealRate(totalMealCost, totalMeals);
  const sharedCost = calcSharedCosts(month.otherCosts, member.id);
  const individualCost = calcIndividualCosts(month.otherCosts, member.id);
  const totalDeposit = calcMemberDeposits(month.deposits, member.id);
  const memberMealCost = mealRate * mealData.total;
  const totalCost = calcMemberTotalCost(
    mealRate,
    mealData.total,
    sharedCost,
    individualCost
  );
  const balance = calcMemberBalance(totalDeposit, totalCost);

  return {
    memberId: member.id,
    memberName: member.name,
    totalMeals: mealData.total,
    totalBreakfast: mealData.breakfast,
    totalLunch: mealData.lunch,
    totalDinner: mealData.dinner,
    totalDeposit,
    mealCost: memberMealCost,
    sharedCost,
    individualCost,
    totalCost,
    balance,
  };
}

/**
 * Complete Month Summary — all aggregate data for the month
 */
export function calcMonthSummary(
  month: MonthCycle,
  members: Member[]
): MonthSummary {
  const totalMeals = calcTotalConsumedMeals(month.meals);
  const totalMealCost = calcTotalMealCost(month.mealCosts);
  const mealRate = calcMealRate(totalMealCost, totalMeals);
  const totalDeposits = month.deposits.reduce((s, d) => s + d.amount, 0);
  const totalSharedCosts = calcTotalSharedCosts(month.otherCosts);
  const totalIndividualCosts = calcTotalIndividualCosts(month.otherCosts);
  const totalExpenses = totalMealCost + totalSharedCosts + totalIndividualCosts;
  const messBalance = totalDeposits - totalExpenses;

  const memberSummaries = members.map((m) =>
    calcMemberSummary(month, m)
  );

  return {
    totalMeals,
    totalMealCost,
    mealRate,
    totalDeposits,
    totalSharedCosts,
    totalIndividualCosts,
    totalExpenses,
    messBalance,
    memberSummaries,
  };
}
