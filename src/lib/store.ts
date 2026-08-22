'use client';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppState,
  Member,
  MonthCycle,
  DailyMealEntry,
  DepositEntry,
  MealCostEntry,
  OtherCostEntry,
  ActivityLogEntry,
} from './types';
import { STORAGE_KEY } from './constants';
import { generateId, getTodayStr } from './utils';
import { generateDemoData } from './demo-data';
import { calcMonthSummary } from './calculations';

interface AppActions {
  // ── Authentication ────────────────────────────────────
  login: (memberId: string, pin: string) => boolean;
  logout: () => void;
  checkSession: () => void;

  // ── Members ─────────────────────────────────────────
  addMember: (member: Omit<Member, 'id'>) => void;
  updateMember: (id: string, updates: Partial<Member>) => void;
  removeMember: (id: string) => void;
  setActiveUser: (id: string) => void;
  transferManagerRole: (newManagerId: string) => void;

  // ── Months ──────────────────────────────────────────
  createMonth: (monthName: string, startDate: string, endDate: string, managerId: string) => void;
  setActiveMonth: (id: string) => void;
  closeMonth: (nextManagerId?: string) => void;

  // ── Meals ───────────────────────────────────────────
  setMealEntry: (date: string, memberId: string, mealType: 'breakfast' | 'lunch' | 'dinner', value: number) => void;
  setFullMealEntry: (date: string, memberId: string, meals: { breakfast: number, lunch: number, dinner: number }) => void;
  setBatchMeals: (entries: DailyMealEntry[]) => void;

  // ── Deposits ────────────────────────────────────────
  addDeposit: (deposit: Omit<DepositEntry, 'id'>) => void;
  removeDeposit: (id: string) => void;

  // ── Meal Costs ──────────────────────────────────────
  addMealCost: (cost: Omit<MealCostEntry, 'id'>, autoDeposit: boolean) => void;
  removeMealCost: (id: string) => void;

  // ── Other Costs ─────────────────────────────────────
  addOtherCost: (cost: Omit<OtherCostEntry, 'id'>) => void;
  removeOtherCost: (id: string) => void;

  // ── Bazar Schedule ──────────────────────────────────
  setBazarSchedule: (date: string, memberIds: string[]) => void;

  // ── Theme ───────────────────────────────────────────
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // ── Data Management ─────────────────────────────────
  exportData: () => string;
  importData: (json: string) => boolean;
  resetToDemo: () => void;
  clearAll: () => void;

  // ── Activity Log ────────────────────────────────────
  addLog: (type: ActivityLogEntry['type'], message: string) => void;
  clearLog: () => void;

  // ── Helpers ─────────────────────────────────────────
  getActiveMonth: () => MonthCycle | null;
  getActiveUser: () => Member | null;
}

type Store = AppState & AppActions;

const initialState: AppState = generateDemoData();

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ── Members ─────────────────────────────────────────
      addMember: (member) => {
        const newMember: Member = { ...member, id: generateId() };
        set((s) => ({
          members: [...s.members, newMember],
        }));
        get().addLog('MEMBER', `Added member: ${newMember.name}`);
      },

      updateMember: (id, updates) => {
        set((s) => ({
          members: s.members.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        }));
      },

      removeMember: (id) => {
        const member = get().members.find((m) => m.id === id);
        set((s) => ({
          members: s.members.filter((m) => m.id !== id),
        }));
        if (member) get().addLog('MEMBER', `Removed member: ${member.name}`);
      },

      transferManagerRole: (newManagerId) => {
        const state = get();
        const currentManagerId = state.activeUserId;
        if (!currentManagerId) return;
        
        set((s) => ({
          members: s.members.map(m => {
            if (m.id === currentManagerId) return { ...m, role: 'MEMBER' };
            if (m.id === newManagerId) return { ...m, role: 'MANAGER' };
            return m;
          }),
          months: s.months.map(m => 
            m.status === 'ACTIVE' ? { ...m, managerId: newManagerId } : m
          )
        }));
        
        const newManager = get().members.find(m => m.id === newManagerId);
        if (newManager) get().addLog('MEMBER', `Manager role transferred to ${newManager.name}`);
      },

      // ── Authentication ────────────────────────────────────
      login: (memberId, pin) => {
        const member = get().members.find((m) => m.id === memberId);
        if (!member) return false;
        
        // If a pin is set, verify it. If not, allow login without it.
        if (member.pin && member.pin !== pin) {
          return false;
        }

        set({ activeUserId: memberId, isAuthenticated: true, loginTimestamp: Date.now() });
        return true;
      },
      
      logout: () => {
        set({ activeUserId: null, isAuthenticated: false, loginTimestamp: null });
      },

      checkSession: () => {
        const { isAuthenticated, loginTimestamp } = get();
        if (isAuthenticated && loginTimestamp) {
          const elapsed = Date.now() - loginTimestamp;
          if (elapsed > SESSION_DURATION_MS) {
            set({ activeUserId: null, isAuthenticated: false, loginTimestamp: null });
          }
        }
      },

      setActiveUser: (id) => set({ activeUserId: id }), // Kept for legacy/demo purposes if needed, though login() is preferred

      // ── Months ──────────────────────────────────────────
      createMonth: (monthName, startDate, endDate, managerId) => {
        const newMonth: MonthCycle = {
          id: generateId(),
          monthName,
          startDate,
          endDate,
          status: 'ACTIVE',
          managerId,
          meals: [],
          deposits: [],
          mealCosts: [],
          otherCosts: [],
          bazarSchedule: {},
        };
        set((s) => ({
          months: [...s.months, newMonth],
          activeMonthId: newMonth.id,
        }));
        get().addLog('MONTH', `Created new month: ${monthName}`);
      },

      setActiveMonth: (id) => set({ activeMonthId: id }),

      closeMonth: (nextManagerId) => {
        const state = get();
        const activeMonth = state.months.find((m) => m.id === state.activeMonthId);
        if (!activeMonth) return;

        // Calculate summary for balance rollover
        const summary = calcMonthSummary(activeMonth, state.members);

        // Archive the current month
        const archivedMonths = state.months.map((m) =>
          m.id === activeMonth.id ? { ...m, status: 'ARCHIVED' as const } : m
        );

        // Create new month with balance rollover
        const nextMonthDate = new Date(activeMonth.endDate + 'T00:00:00');
        nextMonthDate.setDate(nextMonthDate.getDate() + 1);
        const nextEndDate = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1, 0);
        const newMonthName = nextMonthDate.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });
        const newStartStr = nextMonthDate.toISOString().split('T')[0];
        const newEndStr = nextEndDate.toISOString().split('T')[0];

        // Create rollover deposit entries
        const rolloverDeposits: DepositEntry[] = summary.memberSummaries.map(
          (ms: { memberId: string; memberName: string; balance: number }) => ({
            id: generateId(),
            date: newStartStr,
            memberId: ms.memberId,
            amount: ms.balance,
            note: `Balance rollover from ${activeMonth.monthName}`,
            isAutoDeposit: true,
          })
        );

        const newManagerId = nextManagerId || activeMonth.managerId;

        const newMonth: MonthCycle = {
          id: generateId(),
          monthName: newMonthName,
          startDate: newStartStr,
          endDate: newEndStr,
          status: 'ACTIVE',
          managerId: newManagerId,
          meals: [],
          deposits: rolloverDeposits,
          mealCosts: [],
          otherCosts: [],
          bazarSchedule: {},
        };

        const updatedMembers = state.members.map((m) => {
          if (m.id === newManagerId) return { ...m, role: 'MANAGER' as const };
          return { ...m, role: 'MEMBER' as const };
        });

        set({
          months: [...archivedMonths, newMonth],
          activeMonthId: newMonth.id,
          members: updatedMembers,
        });
        get().addLog('MONTH', `Closed ${activeMonth.monthName} and opened ${newMonthName} with manager ${updatedMembers.find(m => m.id === newManagerId)?.name}`);
      },

      // ── Meals ───────────────────────────────────────────
      setMealEntry: (date, memberId, mealType, value) => {
        set((s) => {
          const month = s.months.find((m) => m.id === s.activeMonthId);
          if (!month) return s;

          const existingIdx = month.meals.findIndex(
            (e) => e.date === date && e.memberId === memberId
          );

          let updatedMeals: DailyMealEntry[];
          if (existingIdx >= 0) {
            updatedMeals = month.meals.map((e, i) =>
              i === existingIdx ? { ...e, [mealType]: value } : e
            );
          } else {
            const newEntry: DailyMealEntry = {
              date,
              memberId,
              breakfast: 0,
              lunch: 0,
              dinner: 0,
              [mealType]: value,
            };
            updatedMeals = [...month.meals, newEntry];
          }

          return {
            months: s.months.map((m) =>
              m.id === s.activeMonthId ? { ...m, meals: updatedMeals } : m
            ),
          };
        });
      },

      setFullMealEntry: (date, memberId, meals) => {
        set((s) => {
          const month = s.months.find((m) => m.id === s.activeMonthId);
          if (!month) return s;

          const existingIdx = month.meals.findIndex(
            (e) => e.date === date && e.memberId === memberId
          );

          let updatedMeals: DailyMealEntry[];
          if (existingIdx >= 0) {
            updatedMeals = month.meals.map((e, i) =>
              i === existingIdx ? { ...e, ...meals } : e
            );
          } else {
            updatedMeals = [...month.meals, { date, memberId, ...meals }];
          }

          return {
            months: s.months.map((m) =>
              m.id === s.activeMonthId ? { ...m, meals: updatedMeals } : m
            ),
          };
        });
        
        const member = get().members.find(m => m.id === memberId);
        if (member) {
          get().addLog('MEAL', `Updated meals for ${member.name} on ${date}: B:${meals.breakfast} L:${meals.lunch} D:${meals.dinner}`);
        }
      },

      setBatchMeals: (entries) => {
        set((s) => {
          const month = s.months.find((m) => m.id === s.activeMonthId);
          if (!month) return s;

          let updatedMeals = [...month.meals];
          for (const entry of entries) {
            const idx = updatedMeals.findIndex(
              (e) => e.date === entry.date && e.memberId === entry.memberId
            );
            if (idx >= 0) {
              updatedMeals[idx] = entry;
            } else {
              updatedMeals.push(entry);
            }
          }

          return {
            months: s.months.map((m) =>
              m.id === s.activeMonthId ? { ...m, meals: updatedMeals } : m
            ),
          };
        });
        get().addLog('MEAL', `Batch meal entries updated`);
      },

      // ── Deposits ────────────────────────────────────────
      addDeposit: (deposit) => {
        const newDeposit: DepositEntry = { ...deposit, id: generateId() };
        set((s) => {
          const month = s.months.find((m) => m.id === s.activeMonthId);
          if (!month) return s;
          return {
            months: s.months.map((m) =>
              m.id === s.activeMonthId
                ? { ...m, deposits: [...m.deposits, newDeposit] }
                : m
            ),
          };
        });
        const member = get().members.find((m) => m.id === deposit.memberId);
        get().addLog('DEPOSIT', `${member?.name || 'Unknown'} deposited ৳${deposit.amount}`);
      },

      removeDeposit: (id) => {
        set((s) => ({
          months: s.months.map((m) =>
            m.id === s.activeMonthId
              ? { ...m, deposits: m.deposits.filter((d) => d.id !== id) }
              : m
          ),
        }));
      },

      // ── Meal Costs ──────────────────────────────────────
      addMealCost: (cost, autoDeposit) => {
        const newCost: MealCostEntry = {
          ...cost,
          id: generateId(),
          isAutoCreditedToDeposit: autoDeposit,
        };
        set((s) => {
          const month = s.months.find((m) => m.id === s.activeMonthId);
          if (!month) return s;

          let deposits = month.deposits;
          // Auto-deposit to shopper if toggled
          if (autoDeposit) {
            const autoDepositEntry: DepositEntry = {
              id: generateId(),
              date: cost.date,
              memberId: cost.shopperMemberId,
              amount: cost.amount,
              note: `Auto-deposit for bazar shopping`,
              isAutoDeposit: true,
            };
            deposits = [...deposits, autoDepositEntry];
          }

          return {
            months: s.months.map((m) =>
              m.id === s.activeMonthId
                ? { ...m, mealCosts: [...m.mealCosts, newCost], deposits }
                : m
            ),
          };
        });
        const shopper = get().members.find((m) => m.id === cost.shopperMemberId);
        get().addLog(
          'MEAL_COST',
          `${shopper?.name || 'Unknown'} spent ৳${cost.amount} on bazar${autoDeposit ? ' (auto-credited)' : ''}`
        );
      },

      removeMealCost: (id) => {
        set((s) => ({
          months: s.months.map((m) =>
            m.id === s.activeMonthId
              ? { ...m, mealCosts: m.mealCosts.filter((c) => c.id !== id) }
              : m
          ),
        }));
      },

      // ── Other Costs ─────────────────────────────────────
      addOtherCost: (cost) => {
        const newCost: OtherCostEntry = { ...cost, id: generateId() };
        set((s) => ({
          months: s.months.map((m) =>
            m.id === s.activeMonthId
              ? { ...m, otherCosts: [...m.otherCosts, newCost] }
              : m
          ),
        }));
        get().addLog('OTHER_COST', `Added ${cost.costType.toLowerCase()} cost: ${cost.costTitle} (৳${cost.amount})`);
      },

      removeOtherCost: (id) => {
        set((s) => ({
          months: s.months.map((m) =>
            m.id === s.activeMonthId
              ? { ...m, otherCosts: m.otherCosts.filter((c) => c.id !== id) }
              : m
          ),
        }));
      },

      // ── Bazar Schedule ──────────────────────────────────
      setBazarSchedule: (date, memberIds) => {
        set((s) => ({
          months: s.months.map((m) =>
            m.id === s.activeMonthId
              ? { ...m, bazarSchedule: { ...m.bazarSchedule, [date]: memberIds } }
              : m
          ),
        }));
      },

      // ── Theme ───────────────────────────────────────────
      setTheme: (theme) => set({ theme }),

      // ── Data Management ─────────────────────────────────
      exportData: () => {
        const { members, months, activeMonthId, activeUserId, theme, activityLog } = get();
        return JSON.stringify(
          { members, months, activeMonthId, activeUserId, theme, activityLog },
          null,
          2
        );
      },

      importData: (json) => {
        try {
          const data = JSON.parse(json);
          if (data.members && data.months) {
            set({
              members: data.members,
              months: data.months,
              activeMonthId: data.activeMonthId || null,
              activeUserId: data.activeUserId || null,
              theme: data.theme || 'dark',
              activityLog: data.activityLog || [],
            });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      resetToDemo: () => {
        const demoData = generateDemoData();
        set(demoData);
      },

      clearAll: () => {
        set({
          members: [],
          months: [],
          activeMonthId: null,
          activeUserId: null,
          isAuthenticated: false,
          loginTimestamp: null,
          theme: 'system',
          activityLog: [],
        });
      },

      // ── Activity Log ────────────────────────────────────
      addLog: (type, message) => {
        const entry: ActivityLogEntry = {
          id: generateId(),
          timestamp: new Date().toISOString(),
          type,
          message,
        };
        set((s) => ({
          activityLog: [entry, ...s.activityLog].slice(0, 50),
        }));
      },

      clearLog: () => set({ activityLog: [] }),

      // ── Helpers ─────────────────────────────────────────
      getActiveMonth: () => {
        const s = get();
        return s.months.find((m) => m.id === s.activeMonthId) || null;
      },

      getActiveUser: () => {
        const s = get();
        return s.members.find((m) => m.id === s.activeUserId) || null;
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        members: state.members,
        months: state.months,
        activeMonthId: state.activeMonthId,
        activeUserId: state.activeUserId,
        isAuthenticated: state.isAuthenticated,
        loginTimestamp: state.loginTimestamp,
        theme: state.theme,
        activityLog: state.activityLog,
      }),
    }
  )
);
