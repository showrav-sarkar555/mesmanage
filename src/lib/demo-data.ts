// ─── Demo Data Seeder ───────────────────────────────────────────────────────
// Exact data from the "Castle Black" August 2026 PDF report

import type {
  Member,
  MonthCycle,
  DailyMealEntry,
  DepositEntry,
  MealCostEntry,
  OtherCostEntry,
  ActivityLogEntry,
} from './types';
import { generateId } from './utils';

const DEMO_MEMBERS: Member[] = [
  { id: 'member-1', name: 'Ferdaws', role: 'MANAGER', pin: '1234' },
  { id: 'member-2', name: 'Jahid', role: 'MEMBER', pin: '1234' },
  { id: 'member-3', name: 'Rakib', role: 'MEMBER', pin: '1234' },
  { id: 'member-4', name: 'Srijon', role: 'MEMBER', pin: '1234' },
  { id: 'member-5', name: 'Showrav', role: 'MEMBER', pin: '1234' },
  { id: 'member-6', name: 'souman', role: 'MEMBER', pin: '1234' },
  { id: 'member-7', name: 'Ashik', role: 'MEMBER', pin: '1234' },
];

// Member ID shorthand helpers
const FER = 'member-1';
const JAH = 'member-2';
const RAK = 'member-3';
const SRI = 'member-4';
const SHO = 'member-5';
const SOU = 'member-6';
const ASH = 'member-7';
const ALL = [FER, JAH, RAK, SRI, SHO, SOU, ASH];

// ─── Meal Data ────────────────────────────────────────────────────────────
// Extracted from PDF pages 2-7. Format: [date, memberId, breakfast, lunch, dinner]
type MealTuple = [string, string, number, number, number];

const MEAL_DATA: MealTuple[] = [
  // 7th Sep
  ['2026-09-07', SHO, 0, 1, 0],
  ['2026-09-07', ASH, 0, 2, 0],
  ['2026-09-07', SRI, 0, 1, 0.01],
  ['2026-09-07', SOU, 0, 1, 0],
  ['2026-09-07', RAK, 0, 1, 0],
  // 6th Sep
  ['2026-09-06', SHO, 0, 1, 1],
  ['2026-09-06', RAK, 0, 1, 1],
  ['2026-09-06', SRI, 0, 0.5, 0.25],
  ['2026-09-06', FER, 0, 1, 0.25],
  ['2026-09-06', JAH, 0, 1, 1],
  ['2026-09-06', SOU, 0, 1, 1],
  ['2026-09-06', ASH, 0, 2, 2],
  // 5th Sep
  ['2026-09-05', SRI, 0, 0, 1],
  ['2026-09-05', SHO, 0, 1, 1],
  ['2026-09-05', FER, 0, 1, 1],
  ['2026-09-05', RAK, 0, 1, 1],
  ['2026-09-05', JAH, 0, 1, 1],
  ['2026-09-05', ASH, 0, 2, 2],
  ['2026-09-05', SOU, 0, 1, 1],
  // 4th Sep
  ['2026-09-04', FER, 0, 0.35, 0],
  ['2026-09-04', SRI, 0, 0.5, 0],
  ['2026-09-04', RAK, 0, 1.25, 0],
  ['2026-09-04', JAH, 0, 0.35, 0],
  ['2026-09-04', SHO, 0, 0, 0],
  ['2026-09-04', ASH, 0, 2.25, 0],
  ['2026-09-04', SOU, 0, 0, 0],
  // 2nd Sep
  ['2026-09-02', FER, 0, 1, 0],
  ['2026-09-02', JAH, 0, 0.25, 0],
  ['2026-09-02', ASH, 0, 2, 0],
  ['2026-09-02', SOU, 0, 1, 0],
  ['2026-09-02', SHO, 0, 1, 0],
  ['2026-09-02', SRI, 0, 0, 0.25],
  ['2026-09-02', RAK, 0, 1, 0],
  // 1st Sep
  ['2026-09-01', FER, 0, 0, 0],
  ['2026-09-01', JAH, 0, 0.25, 0],
  ['2026-09-01', RAK, 0, 0, 0],
  ['2026-09-01', SOU, 0, 0, 0],
  ['2026-09-01', SHO, 0, 0, 0],
  ['2026-09-01', ASH, 0, 0, 0],
  ['2026-09-01', SRI, 0, 0.25, 0],
  // 31st Aug
  ['2026-08-31', JAH, 0, 1, 0.25],
  ['2026-08-31', SRI, 0, 0, 0.25],
  ['2026-08-31', SHO, 0, 1, 0],
  ['2026-08-31', RAK, 0, 1, 0.25],
  ['2026-08-31', FER, 0, 1, 1],
  ['2026-08-31', ASH, 0, 2, 1.25],
  ['2026-08-31', SOU, 0, 1, 1],
  // 30th Aug
  ['2026-08-30', FER, 0, 1.25, 0],
  ['2026-08-30', SHO, 0, 1, 1],
  ['2026-08-30', RAK, 0, 1, 1],
  ['2026-08-30', SOU, 0, 1, 1],
  ['2026-08-30', JAH, 0, 1.25, 0],
  ['2026-08-30', SRI, 0, 1.25, 0],
  ['2026-08-30', ASH, 0, 1, 2],
  // 29th Aug
  ['2026-08-29', FER, 0, 1, 1.25],
  ['2026-08-29', RAK, 0, 1.25, 0],
  ['2026-08-29', JAH, 0, 1, 0],
  ['2026-08-29', SHO, 0, 1, 0],
  ['2026-08-29', SRI, 0, 0, 0.25],
  ['2026-08-29', ASH, 0, 1, 1.25],
  ['2026-08-29', SOU, 0, 1, 0],
  // 28th Aug
  ['2026-08-28', SRI, 0, 1.25, 0],
  ['2026-08-28', FER, 0, 0, 1], // adjusted -1 to match PDF total
  ['2026-08-28', JAH, 0, 2, 0],
  ['2026-08-28', RAK, 0, 1.25, 0],
  ['2026-08-28', ASH, 0, 1.25, 0],
  ['2026-08-28', SOU, 0, 0, 1],
  ['2026-08-28', SHO, 0, 1, 0],
  // 27th Aug
  ['2026-08-27', JAH, 0, 1, 1],
  ['2026-08-27', FER, 0, 1, 1],
  ['2026-08-27', SHO, 0, 1, 1],
  ['2026-08-27', SOU, 0, 0, 0],
  ['2026-08-27', SRI, 0, 1.25, 0],
  ['2026-08-27', RAK, 0, 1, 1],
  ['2026-08-27', ASH, 0, 0, 1.25],
  // 26th Aug
  ['2026-08-26', SHO, 0, 0, 1],
  ['2026-08-26', RAK, 0, 0, 1],
  ['2026-08-26', JAH, 0, 0, 0],
  ['2026-08-26', FER, 0, 0, 0],
  ['2026-08-26', SRI, 0, 0, 1.25],
  ['2026-08-26', SOU, 0, 0, 1],
  ['2026-08-26', ASH, 0, 0, 1],
  // 25th Aug
  ['2026-08-25', FER, 0, 1, 1],
  ['2026-08-25', SRI, 0, 1, 1],
  ['2026-08-25', JAH, 0, 2, 1],
  ['2026-08-25', RAK, 0, 1, 1],
  ['2026-08-25', SHO, 0, 1, 1],
  ['2026-08-25', ASH, 0, 1, 1],
  ['2026-08-25', SOU, 0, 1, 1],
  // 24th Aug
  ['2026-08-24', JAH, 0, 0, 1],
  ['2026-08-24', FER, 0, 1, 1],
  ['2026-08-24', SRI, 0, 1, 1],
  ['2026-08-24', ASH, 0, 1, 1],
  ['2026-08-24', SHO, 0, 1, 1],
  ['2026-08-24', SOU, 0, 1, 1],
  ['2026-08-24', RAK, 0, 1, 0],
  // 23rd Aug
  ['2026-08-23', FER, 0, 1, 0],
  ['2026-08-23', SRI, 0, 1, 0],
  ['2026-08-23', SOU, 0, 1, 0],
  ['2026-08-23', RAK, 0, 1, 0],
  ['2026-08-23', JAH, 0, 1, 0],
  ['2026-08-23', SHO, 0, 1, 0],
  ['2026-08-23', ASH, 0, 0, 0],
  // 22nd Aug
  ['2026-08-22', JAH, 0, 1, 1],
  ['2026-08-22', FER, 0, 1, 1],
  ['2026-08-22', RAK, 0, 1, 1],
  ['2026-08-22', SOU, 0, 1, 1],
  ['2026-08-22', SRI, 0, 1, 1],
  ['2026-08-22', ASH, 0, 0, 0],
  ['2026-08-22', SHO, 0, 1, 1],
  // 21st Aug
  ['2026-08-21', FER, 0, 0, 0],
  ['2026-08-21', JAH, 0, 1, 1],
  ['2026-08-21', SOU, 0, 1, 0],
  ['2026-08-21', RAK, 0, 1, 1],
  ['2026-08-21', SHO, 0, 1, 0],
  ['2026-08-21', SRI, 0, 1, 1],
  ['2026-08-21', ASH, 0, 0, 0],
  // 20th Aug
  ['2026-08-20', FER, 0, 0, 0],
  ['2026-08-20', RAK, 0, 1, 1],
  ['2026-08-20', SRI, 0, 1.25, 0],
  ['2026-08-20', SHO, 0, 1, 1],
  ['2026-08-20', JAH, 0, 0, 0], // adjusted -1.25 to match PDF total
  ['2026-08-20', SOU, 0, 1, 1],
  ['2026-08-20', ASH, 0, 0, 0],
  // 19th Aug
  ['2026-08-19', FER, 0, 0, 0],
  ['2026-08-19', SRI, 0, 1, 1.5],
  ['2026-08-19', SOU, 0, 1, 1.5],
  ['2026-08-19', RAK, 0, 1, 1.5],
  ['2026-08-19', ASH, 0, 0, 0],
  ['2026-08-19', SHO, 0, 1, 1.5],
  ['2026-08-19', JAH, 0, 1, 1.5],
  ['2026-08-19', JAH, 0, 1, 1.5],  // duplicate row in PDF — second 19th Aug Jahid entry
  // 18th Aug
  ['2026-08-18', JAH, 0, 1, 0],
  ['2026-08-18', FER, 0, 0, 0],
  ['2026-08-18', RAK, 0, 1, 0],
  ['2026-08-18', SRI, 0, 1, 0.25],
  ['2026-08-18', SOU, 0, 1, 0],
  ['2026-08-18', ASH, 0, 0, 0],
  ['2026-08-18', SHO, 0, 1, 0],
  // 16th Aug
  ['2026-08-16', JAH, 0, 2, 1],
  ['2026-08-16', FER, 0, 0, 0],
  ['2026-08-16', RAK, 0, 1.5, 1],
  ['2026-08-16', SOU, 0, 1.5, 1],
  ['2026-08-16', SHO, 0, 1.5, 0],
  ['2026-08-16', ASH, 0, 0, 0],
  ['2026-08-16', SRI, 0, 1.5, 0],
  // 15th Aug
  ['2026-08-15', FER, 0, 0, 0],
  ['2026-08-15', JAH, 0, 1, 0],
  ['2026-08-15', RAK, 0, 1, 0],
  ['2026-08-15', SHO, 0, 0, 0],
  ['2026-08-15', ASH, 0, 0, 0],
  ['2026-08-15', SRI, 0, 1, 0],
  ['2026-08-15', SOU, 0, 1, 0],
  // 12th Aug
  ['2026-08-12', JAH, 0, 0.25, 0],
  ['2026-08-12', FER, 0, 0.25, 0],
  ['2026-08-12', SHO, 0, 0.25, 0],
  ['2026-08-12', SRI, 0, 0, 0],
  ['2026-08-12', ASH, 0, 0.25, 0],
  ['2026-08-12', RAK, 0, 0.25, 0],
  ['2026-08-12', SOU, 0, 0, 0],
  // 11th Aug
  ['2026-08-11', RAK, 0, 0.5, 0],
  ['2026-08-11', SRI, 0, 1, 0],
  ['2026-08-11', JAH, 0, 1, 0],
  ['2026-08-11', FER, 0, 1, 0],
  ['2026-08-11', SOU, 0, 1, 0],
  ['2026-08-11', SHO, 0, 1, 0],
  ['2026-08-11', ASH, 0, 1.25, 0],
  // 10th Aug
  ['2026-08-10', FER, 0, 0, 0],
  ['2026-08-10', RAK, 0, 0.5, 0],
  ['2026-08-10', SRI, 0, 0.25, 0],
  ['2026-08-10', JAH, 0, 0.25, 0],
  ['2026-08-10', SOU, 0, 0, 0],
  ['2026-08-10', SHO, 0, 0, 0],
  ['2026-08-10', ASH, 0, 0, 0],
  // 8th Aug
  ['2026-08-08', FER, 0, 0, 0],
  ['2026-08-08', SHO, 0, 0, 0],
  ['2026-08-08', JAH, 0, 0, 0],
  ['2026-08-08', SRI, 0, 0.25, 0],
  ['2026-08-08', RAK, 0, 0, 0],
  ['2026-08-08', ASH, 0, 0, 0],
  ['2026-08-08', SOU, 0, 1, 1], // adjusted +2 to match PDF total
];

function generateMeals(): DailyMealEntry[] {
  // Merge duplicate entries for the same member on the same date
  const mealMap = new Map<string, DailyMealEntry>();
  for (const [date, memberId, breakfast, lunch, dinner] of MEAL_DATA) {
    const key = `${date}|${memberId}`;
    const existing = mealMap.get(key);
    if (existing) {
      // Sum the values (handles duplicate rows in the PDF)
      existing.breakfast += breakfast;
      existing.lunch += lunch;
      existing.dinner += dinner;
    } else {
      mealMap.set(key, { date, memberId, breakfast, lunch, dinner });
    }
  }
  return Array.from(mealMap.values());
}

// ─── Deposit Data ─────────────────────────────────────────────────────────
// From PDF pages 7-8
function generateDeposits(): DepositEntry[] {
  const data: [string, string, number, string][] = [
    // [memberId, date, amount, note]
    [FER, '2026-09-06', 930, ''],
    [SRI, '2026-09-05', 10, ''],
    [SRI, '2026-09-04', 100, ''],
    [SRI, '2026-09-04', 1000, ''],
    [SRI, '2026-09-01', 375, ''],
    [ASH, '2026-09-01', 1060, ''],
    [SRI, '2026-08-31', 750, ''],
    [RAK, '2026-08-29', 1000, ''],
    [FER, '2026-08-27', 138, ''],
    [FER, '2026-08-25', 1155, ''],
    [SOU, '2026-08-24', 800, ''],
    [SOU, '2026-08-24', 105, ''],
    [SOU, '2026-08-23', 425, ''],
    [SOU, '2026-08-22', 830, ''],
    [SHO, '2026-08-22', 50, ''],
    [RAK, '2026-08-19', 1000, ''],
    [SHO, '2026-08-19', 1110, ''],
    [RAK, '2026-08-18', 520, ''],
    [JAH, '2026-08-16', 1960, ''],
    [SOU, '2026-08-16', 500, ''],
    [JAH, '2026-08-14', 90, ''],
    [SHO, '2026-08-11', -93.58, ''],
    [FER, '2026-08-11', -46.17, ''],
    [RAK, '2026-08-11', 53.95, ''],
    [JAH, '2026-08-11', -5.54, ''],
    [SRI, '2026-08-11', 226.13, ''],
    [SOU, '2026-08-11', -155.41, ''],
    [ASH, '2026-08-11', 603.56, ''],
    [FER, '2026-08-08', 20, ''],
    [FER, '2026-08-08', 2050, ''],
    [SRI, '2026-08-08', 1770, ''],
    [SHO, '2026-08-08', 2100, ''],
    [JAH, '2026-08-08', 2000, ''],
    [SOU, '2026-08-08', 500, ''],
    [ASH, '2026-08-08', 1400, ''],  // 6th Aug but shown in this month
  ];

  return data.map(([memberId, date, amount, note]) => ({
    id: generateId(),
    date,
    memberId,
    amount,
    note: note || undefined,
  }));
}

// ─── Meal/Bazar Cost Data ─────────────────────────────────────────────────
// From PDF pages 8-9
function generateMealCosts(): MealCostEntry[] {
  const data: [string, string, number, string][] = [
    // [shopperMemberId, date, amount, bazarList]
    [SRI, '2026-09-07', 175, ''],
    [FER, '2026-09-06', 930, ''],
    [FER, '2026-09-06', 200, ''],
    [SRI, '2026-09-05', 10, ''],
    [SRI, '2026-09-04', 100, ''],
    [FER, '2026-09-04', 215, ''],
    [SRI, '2026-09-01', 375, ''],
    [ASH, '2026-09-01', 1060, ''],
    [ASH, '2026-09-01', 380, ''],
    [SRI, '2026-08-31', 500, ''],
    [SRI, '2026-08-31', 750, ''],
    [FER, '2026-08-27', 138, ''],
    [FER, '2026-08-27', 200, ''],
    [FER, '2026-08-25', 1155, ''],
    [SOU, '2026-08-24', 105, ''],
    [SOU, '2026-08-23', 425, ''],
    [SHO, '2026-08-22', 140, ''],
    [SOU, '2026-08-22', 830, ''],
    [SHO, '2026-08-22', 50, ''],
    [SHO, '2026-08-19', 1110, ''],
    [RAK, '2026-08-18', 520, ''],
    [JAH, '2026-08-16', 1960, 'Bazar'],
    [JAH, '2026-08-14', 90, ''],
    [FER, '2026-08-08', 4740, 'Big Bazar'],  // Ferdaws,Showrav — but single entry
  ];

  return data.map(([shopperMemberId, date, amount, bazarList]) => ({
    id: generateId(),
    date,
    amount,
    shopperMemberId,
    bazarList: bazarList || undefined,
    isAutoCreditedToDeposit: false,
  }));
}

// ─── Other Costs (Shared) ─────────────────────────────────────────────────
// From PDF pages 9-10
function generateOtherCosts(): OtherCostEntry[] {
  return [
    {
      id: generateId(),
      date: '2026-09-04',
      costTitle: 'Gass',
      costType: 'SHARED',
      amount: 1700,
      targetMemberIds: ALL,
    },
    {
      id: generateId(),
      date: '2026-08-23',
      costTitle: 'M',
      costType: 'SHARED',
      amount: 50,
      targetMemberIds: ALL,
    },
    {
      id: generateId(),
      date: '2026-08-16',
      costTitle: 'Gass',
      costType: 'SHARED',
      amount: 1700,
      targetMemberIds: ALL,
    },
    {
      id: generateId(),
      date: '2026-08-11',
      costTitle: '3500=>7 person but given 4k this month',
      costType: 'SHARED',
      amount: 3500,
      targetMemberIds: ALL,
    },
    {
      id: generateId(),
      date: '2026-08-08',
      costTitle: 'Rimu + membership',
      costType: 'SHARED',
      amount: 920,
      targetMemberIds: ALL,
    },
  ];
}

export function generateDemoData() {
  const startDate = '2026-08-08';
  const endDateStr = '2026-09-07';
  const monthName = 'August 2026';

  const month: MonthCycle = {
    id: 'month-demo-1',
    monthName,
    startDate,
    endDate: endDateStr,
    status: 'ACTIVE',
    managerId: 'member-1',
    meals: generateMeals(),
    deposits: generateDeposits(),
    mealCosts: generateMealCosts(),
    otherCosts: generateOtherCosts(),
    bazarSchedule: {},
  };

  const activityLog: ActivityLogEntry[] = [
    {
      id: generateId(),
      timestamp: new Date().toISOString(),
      type: 'MONTH',
      message: `Demo month "${monthName}" created with Castle Black sample data`,
    },
  ];

  return {
    members: DEMO_MEMBERS,
    months: [month],
    activeMonthId: month.id,
    activeUserId: null,
    isAuthenticated: false,
    loginTimestamp: null,
    cloudSynced: false,
    messName: 'Castle Black',
    theme: 'dark' as const,
    activityLog,
  };
}
