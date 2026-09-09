// ─── Mess Manager Data Models ───────────────────────────────────────────────

export type MemberRole = 'MANAGER' | 'MEMBER';
export type CostType = 'SHARED' | 'INDIVIDUAL';
export type MonthStatus = 'ACTIVE' | 'ARCHIVED';

export interface Member {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  role: MemberRole;
  pin?: string;
}

export interface DailyMealEntry {
  date: string; // YYYY-MM-DD
  memberId: string;
  breakfast: number; // 0, 0.25, 0.5, 0.75, 1, 1.5
  lunch: number;
  dinner: number;
}

export interface DepositEntry {
  id: string;
  date: string; // YYYY-MM-DD
  memberId: string;
  amount: number;
  note?: string;
  isAutoDeposit?: boolean;
}

export interface MealCostEntry {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  shopperMemberId: string;
  bazarList?: string;
  isAutoCreditedToDeposit: boolean;
}

export interface OtherCostEntry {
  id: string;
  date: string; // YYYY-MM-DD
  costTitle: string;
  costType: CostType;
  amount: number;
  targetMemberIds: string[]; // split equally among these members
}

export interface MonthCycle {
  id: string;
  monthName: string; // e.g. "August 2026"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: MonthStatus;
  managerId: string;
  meals: DailyMealEntry[];
  deposits: DepositEntry[];
  mealCosts: MealCostEntry[];
  otherCosts: OtherCostEntry[];
  bazarSchedule: { [date: string]: string[] }; // date -> memberIds
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  type: 'DEPOSIT' | 'MEAL' | 'MEAL_COST' | 'OTHER_COST' | 'MEMBER' | 'MONTH';
  message: string;
}

export interface AppState {
  members: Member[];
  months: MonthCycle[];
  activeMonthId: string | null;
  activeUserId: string | null;
  isAuthenticated: boolean;
  loginTimestamp: number | null; // Unix ms — used for 7-day session expiry
  cloudSynced: boolean; // true once initial cloud load completes
  messName: string; // e.g. "Castle Black"
  theme: 'light' | 'dark' | 'system';
  activityLog: ActivityLogEntry[];
  lastUpdatedAt?: number;
}

// ─── Calculation Result Types ───────────────────────────────────────────────

export interface MemberSummary {
  memberId: string;
  memberName: string;
  totalMeals: number;
  totalBreakfast: number;
  totalLunch: number;
  totalDinner: number;
  totalDeposit: number;
  mealCost: number;
  sharedCost: number;
  individualCost: number;
  totalCost: number;
  balance: number; // positive = credit, negative = debit
}

export interface MonthSummary {
  totalMeals: number;
  totalMealCost: number;
  mealRate: number;
  totalDeposits: number;
  totalSharedCosts: number;
  totalIndividualCosts: number;
  totalExpenses: number;
  messBalance: number;
  memberSummaries: MemberSummary[];
}
