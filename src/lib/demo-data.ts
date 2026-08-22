// ─── Demo Data Seeder ───────────────────────────────────────────────────────
// Generates realistic demo data based on "Castle Black" July month

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
  { id: 'member-7', name: 'Rimu', role: 'MEMBER', pin: '1234' },
  { id: 'member-8', name: 'Ashik', role: 'MEMBER', pin: '1234' },
];

const MEMBER_MEALS: Record<string, number> = {
  'member-1': 34.5,
  'member-2': 27.25,
  'member-3': 38.5,
  'member-4': 32.75,
  'member-5': 36.25,
  'member-6': 40.25,
  'member-7': 21.5,
  'member-8': 23.25,
};

const MEMBER_DEPOSITS: Record<string, number> = {
  'member-1': 3020.94,
  'member-2': 2563.61,
  'member-3': 3395.8,
  'member-4': 3173.04,
  'member-5': 3093.73,
  'member-6': 3306.64,
  'member-7': 2990.31,
  'member-8': 2897.97,
};

function generateMeals(startDate: string): DailyMealEntry[] {
  const meals: DailyMealEntry[] = [];
  
  for (const member of DEMO_MEMBERS) {
    let remaining = MEMBER_MEALS[member.id];
    let d = 0;
    while (remaining > 0) {
      const date = new Date(startDate + 'T00:00:00');
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().split('T')[0];
      
      const toAssign = Math.min(remaining, 1.5);
      
      meals.push({
        date: dateStr,
        memberId: member.id,
        breakfast: 0,
        lunch: toAssign > 0.5 ? Math.min(toAssign - 0.5, 1) : toAssign,
        dinner: toAssign > 1 ? 0.5 : 0,
      });
      
      remaining -= toAssign;
      d++;
      if (d > 30) {
        // Just dump the rest on the last day if we run out of days
        const lastMeal = meals[meals.length - 1];
        lastMeal.dinner += remaining;
        remaining = 0;
      }
    }
  }
  
  return meals;
}

function generateDeposits(startDate: string): DepositEntry[] {
  const deposits: DepositEntry[] = [];
  for (const member of DEMO_MEMBERS) {
    deposits.push({
      id: generateId(),
      date: startDate,
      memberId: member.id,
      amount: MEMBER_DEPOSITS[member.id],
      note: 'Monthly deposit',
    });
  }
  return deposits;
}

function generateMealCosts(startDate: string): MealCostEntry[] {
  return [
    {
      id: generateId(),
      date: startDate,
      amount: 17463.00,
      shopperMemberId: DEMO_MEMBERS[0].id,
      bazarList: 'Total meal cost for July',
      isAutoCreditedToDeposit: false,
    }
  ];
}

function generateOtherCosts(startDate: string): OtherCostEntry[] {
  const allMemberIds = DEMO_MEMBERS.map((m) => m.id);
  return [
    {
      id: generateId(),
      date: startDate,
      costTitle: 'Shared Costs',
      costType: 'SHARED',
      amount: 5580.00,
      targetMemberIds: allMemberIds,
    }
  ];
}

export function generateDemoData() {
  // We use July 2026 based on the PDF
  const startDate = '2026-07-01';
  const endDateStr = '2026-07-31';
  const monthName = 'July 2026';

  const month: MonthCycle = {
    id: 'month-demo-1',
    monthName,
    startDate,
    endDate: endDateStr,
    status: 'ACTIVE',
    managerId: 'member-1',
    meals: generateMeals(startDate),
    deposits: generateDeposits(startDate),
    mealCosts: generateMealCosts(startDate),
    otherCosts: generateOtherCosts(startDate),
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
    theme: 'dark' as const,
    activityLog,
  };
}
