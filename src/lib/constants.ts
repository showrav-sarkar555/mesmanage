// ─── Constants & Configuration ──────────────────────────────────────────────

export const STORAGE_KEY = 'MESS_MANAGER_STATE_V1';

export const CURRENCY_SYMBOL = '৳';

export const MEAL_INCREMENTS = [0, 0.25, 0.5, 0.75, 1.0, 1.5] as const;

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'meals', label: 'Meals', icon: 'UtensilsCrossed' },
  { id: 'deposits', label: 'Deposits', icon: 'Wallet' },
  { id: 'costs', label: 'Costs', icon: 'Receipt' },
  { id: 'members', label: 'Members', icon: 'Users' },
  { id: 'reports', label: 'Reports', icon: 'FileBarChart' },
  { id: 'profile', label: 'Profile', icon: 'UserCircle' },
] as const;

export type NavId = (typeof NAV_ITEMS)[number]['id'];

export const DEFAULT_MEAL_CUTOFF_HOUR = 10; // 10:00 AM

export const COMMON_SHARED_COSTS = [
  'Cook / Khala Salary',
  'Gas Bill',
  'Wi-Fi Bill',
  'Waste Bill',
  'Electricity Bill',
  'Water Bill',
  'Cleaning Supplies',
] as const;
