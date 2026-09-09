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
  closeMonth: (nextManagerId: string, closingDateStr?: string) => void;
  deleteMonth: (monthId: string) => void;
  reopenMonth: (monthId: string) => void;

  // ── Meals ───────────────────────────────────────────
  setMealEntry: (date: string, memberId: string, mealType: 'breakfast' | 'lunch' | 'dinner', value: number) => void;
  setFullMealEntry: (date: string, memberId: string, meals: { breakfast: number, lunch: number, dinner: number }) => void;
  setBatchMeals: (entries: DailyMealEntry[]) => void;

  // ── Deposits ────────────────────────────────────────
  addDeposit: (deposit: Omit<DepositEntry, 'id'>) => void;
  updateDeposit: (id: string, deposit: Omit<DepositEntry, 'id'>) => void;
  removeDeposit: (id: string) => void;

  // ── Meal Costs ──────────────────────────────────────
  addMealCost: (cost: Omit<MealCostEntry, 'id'>, autoDeposit: boolean) => void;
  updateMealCost: (id: string, cost: Omit<MealCostEntry, 'id'>, autoDeposit: boolean) => void;
  removeMealCost: (id: string) => void;

  // ── Other Costs ─────────────────────────────────────
  addOtherCost: (cost: Omit<OtherCostEntry, 'id'>) => void;
  removeOtherCost: (id: string) => void;

  // ── Bazar Schedule ──────────────────────────────────
  setBazarSchedule: (date: string, memberIds: string[]) => void;

  // ── Theme & Mess Name ──────────────────────────────
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setMessName: (name: string) => void;

  // ── Data Management ─────────────────────────────────
  exportData: () => string;
  importData: (json: string) => boolean;
  resetToDemo: () => Promise<void>;
  clearAll: () => void;

  // ── Activity Log ────────────────────────────────────
  addLog: (type: ActivityLogEntry['type'], message: string) => void;
  clearLog: () => void;

  // ── Helpers ─────────────────────────────────────────
  getActiveMonth: () => MonthCycle | null;
  getActiveUser: () => Member | null;

  // ── Cloud Sync ──────────────────────────────────────
  syncToCloud: () => Promise<void>;
  loadFromCloud: () => Promise<void>;
  cloudSynced: boolean; // true once initial cloud load succeeds
}

type Store = AppState & AppActions;

// Helper: pick only the serialisable AppState fields for cloud sync
function pickState(s: AppState) {
  return {
    members: s.members,
    months: s.months,
    activeMonthId: s.activeMonthId,
    messName: s.messName,
    theme: s.theme,
    activityLog: s.activityLog,
    lastUpdatedAt: s.lastUpdatedAt,
  };
}

const initialState: AppState = { ...generateDemoData(), cloudSynced: false } as AppState;

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
        get().syncToCloud();
      },

      updateMember: (id, updates) => {
        set((s) => ({
          members: s.members.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        }));
        get().syncToCloud();
      },

      removeMember: (id) => {
        const member = get().members.find((m) => m.id === id);
        set((s) => ({
          members: s.members.filter((m) => m.id !== id),
        }));
        if (member) get().addLog('MEMBER', `Removed member: ${member.name}`);
        get().syncToCloud();
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
        get().syncToCloud();
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
        get().syncToCloud();
      },

      setActiveMonth: (id) => set({ activeMonthId: id }),

      closeMonth: (nextManagerId, closingDateStr) => {
        const state = get();
        const activeMonth = state.months.find((m) => m.id === state.activeMonthId);
        if (!activeMonth) return;

        // If a closing date was provided, update the active month's end date first
        const finalEndDate = closingDateStr || activeMonth.endDate;
        const finalizedActiveMonth = { ...activeMonth, endDate: finalEndDate };

        // Calculate summary for balance rollover using the finalized month
        const summary = calcMonthSummary(finalizedActiveMonth, state.members);

        // Archive the current month
        const archivedMonths = state.months.map((m) =>
          m.id === activeMonth.id ? { ...finalizedActiveMonth, status: 'ARCHIVED' as const } : m
        );

        // Create new month with balance rollover
        const nextMonthDate = new Date(finalEndDate + 'T00:00:00');
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
        get().syncToCloud();
      },

      deleteMonth: (monthId) => {
        set((state) => {
          const monthToDelete = state.months.find(m => m.id === monthId);
          if (!monthToDelete) return state;
          
          const newMonths = state.months.filter(m => m.id !== monthId);
          let nextActiveId = state.activeMonthId;
          if (state.activeMonthId === monthId) {
            nextActiveId = newMonths.length > 0 ? newMonths[newMonths.length - 1].id : null;
          }
          return { months: newMonths, activeMonthId: nextActiveId };
        });
        get().addLog('MONTH', `Deleted a month record.`);
        get().syncToCloud();
      },

      reopenMonth: (monthId) => {
        set((state) => {
          const newMonths = state.months.map(m => {
            if (m.id === monthId) return { ...m, status: 'ACTIVE' as const };
            return { ...m, status: 'ARCHIVED' as const };
          });
          return { months: newMonths, activeMonthId: monthId };
        });
        get().addLog('MONTH', `Re-opened month as ACTIVE.`);
        get().syncToCloud();
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
        
        const member = get().members.find(m => m.id === memberId);
        if (member) {
          get().addLog('MEAL', `Updated ${mealType} meal for ${member.name} on ${date} to ${value}`);
        }
        get().syncToCloud();
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
        get().syncToCloud();
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
        get().syncToCloud();
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
        get().syncToCloud();
      },

      updateDeposit: (id, deposit) => {
        set((s) => {
          const month = s.months.find((m) => m.id === s.activeMonthId);
          if (!month) return s;
          return {
            months: s.months.map((m) =>
              m.id === s.activeMonthId
                ? {
                    ...m,
                    deposits: m.deposits.map((d) => (d.id === id ? { ...deposit, id } : d)),
                  }
                : m
            ),
          };
        });
        const member = get().members.find((m) => m.id === deposit.memberId);
        get().addLog('DEPOSIT', `Updated deposit for ${member?.name || 'Unknown'} to ৳${deposit.amount}`);
        get().syncToCloud();
      },

      removeDeposit: (id) => {
        set((s) => ({
          months: s.months.map((m) =>
            m.id === s.activeMonthId
              ? { ...m, deposits: m.deposits.filter((d) => d.id !== id) }
              : m
          ),
        }));
        get().syncToCloud();
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
        get().syncToCloud();
      },

      updateMealCost: (id, cost, autoDeposit) => {
        set((s) => {
          const month = s.months.find((m) => m.id === s.activeMonthId);
          if (!month) return s;
          const existingCost = month.mealCosts.find(c => c.id === id);
          if (!existingCost) return s;

          return {
            months: s.months.map((m) =>
              m.id === s.activeMonthId
                ? {
                    ...m,
                    mealCosts: m.mealCosts.map((c) =>
                      c.id === id ? { ...cost, id, isAutoCreditedToDeposit: existingCost.isAutoCreditedToDeposit } : c
                    ),
                  }
                : m
            ),
          };
        });
        const shopper = get().members.find((m) => m.id === cost.shopperMemberId);
        get().addLog(
          'MEAL_COST',
          `Updated bazar cost for ${shopper?.name || 'Unknown'} on ${cost.date} to ৳${cost.amount}`
        );
        get().syncToCloud();
      },

      removeMealCost: (id) => {
        set((s) => ({
          months: s.months.map((m) =>
            m.id === s.activeMonthId
              ? { ...m, mealCosts: m.mealCosts.filter((c) => c.id !== id) }
              : m
          ),
        }));
        get().syncToCloud();
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
        get().syncToCloud();
      },

      removeOtherCost: (id) => {
        set((s) => ({
          months: s.months.map((m) =>
            m.id === s.activeMonthId
              ? { ...m, otherCosts: m.otherCosts.filter((c) => c.id !== id) }
              : m
          ),
        }));
        get().syncToCloud();
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
        get().syncToCloud();
      },

      // ── Theme & Mess Name ──────────────────────────────
      setTheme: (theme) => set({ theme }),
      setMessName: (name) => {
        set({ messName: name });
        get().syncToCloud();
      },

      // ── Data Management ─────────────────────────────────
      exportData: () => {
        const { members, months, activeMonthId, activeUserId, messName, theme, activityLog } = get();
        return JSON.stringify(
          { members, months, activeMonthId, activeUserId, messName, theme, activityLog },
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
              messName: data.messName || 'Castle Black',
              theme: data.theme || 'dark',
              activityLog: data.activityLog || [],
              lastUpdatedAt: Date.now(),
            });
            get().syncToCloud();
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      resetToDemo: async () => {
        const demoData = generateDemoData();
        set({ ...demoData, lastUpdatedAt: Date.now() });
        await get().syncToCloud();
      },

      clearAll: () => {
        set({
          members: [],
          months: [],
          activeMonthId: null,
          activeUserId: null,
          isAuthenticated: false,
          loginTimestamp: null,
          cloudSynced: false,
          messName: 'My Mess',
          theme: 'system',
          activityLog: [],
          lastUpdatedAt: Date.now(),
        });
        get().syncToCloud();
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

      // ── Cloud Sync ─────────────────────────────────────────
      // Strategy: Cloud is ALWAYS the single source of truth.
      // syncToCloud: push local state to cloud with a fresh timestamp.
      // loadFromCloud: ALWAYS pull cloud data and overwrite local (preserving session).
      cloudSynced: false,

      syncToCloud: async () => {
        try {
          const now = Date.now();
          set({ lastUpdatedAt: now });
          const state = get();
          const payload = pickState(state);
          await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            cache: 'no-store',
          });
        } catch {
          // Silently fail — local persist still works
        }
      },

      loadFromCloud: async () => {
        try {
          const res = await fetch('/api/data', { cache: 'no-store' });
          if (!res.ok) {
            // No cloud data yet — push our current state to initialise
            if (res.status === 404 || res.status === 503) {
              const state = get();
              if (state.members.length > 0) {
                await get().syncToCloud();
              }
            }
            set({ cloudSynced: true });
            return;
          }
          const { ok, data } = await res.json();
          if (ok && data && Array.isArray(data.members) && Array.isArray(data.months)) {
            // Cloud ALWAYS wins — overwrite local state, but preserve auth session
            const { isAuthenticated, activeUserId, loginTimestamp } = get();
            set({
              members: data.members,
              months: data.months,
              activeMonthId: data.activeMonthId || null,
              messName: data.messName || 'Castle Black',
              theme: data.theme || 'dark',
              activityLog: data.activityLog || [],
              lastUpdatedAt: data.lastUpdatedAt || Date.now(),
              // Preserve local session — don't log out on sync
              isAuthenticated,
              activeUserId,
              loginTimestamp,
              cloudSynced: true,
            });
          } else {
            set({ cloudSynced: true });
          }
        } catch {
          // Network error — fall back to local state silently
          set({ cloudSynced: true });
        }
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
        messName: state.messName,
        theme: state.theme,
        activityLog: state.activityLog,
        lastUpdatedAt: state.lastUpdatedAt,
      }),
    }
  )
);
