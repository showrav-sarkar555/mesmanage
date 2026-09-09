'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useStore } from '@/lib/store';
import { calcMonthSummary, calcMemberSummary } from '@/lib/calculations';
import { formatCurrency, getTodayStr, generateId, getDaysInRange } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { CURRENCY_SYMBOL, MEAL_TYPES, NAV_ITEMS, COMMON_SHARED_COSTS } from '@/lib/constants';
import type { NavId } from '@/lib/constants';
import type {
  Member,
  MemberSummary,
  MonthSummary,
  DailyMealEntry,
  MonthCycle,
} from '@/lib/types';

// ─── Icons (inline SVG to avoid hydration issues with lucide-react) ─────────
function Icon({ name, size = 20, className = '' }: { name: string; size?: number; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    LayoutDashboard: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>,
    UtensilsCrossed: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c1.7 1.7 4.3 1.7 6 0"/><path d="m2 22 4-4"/><path d="m22 2-4 4"/></svg>,
    Wallet: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>,
    Receipt: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>,
    Users: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    FileBarChart: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 18v-2"/><path d="M12 18v-4"/><path d="M16 18v-6"/></svg>,
    Sun: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>,
    Moon: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>,
    Bell: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
    Plus: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
    Minus: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/></svg>,
    X: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
    Download: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
    Upload: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>,
    Trash: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
    Menu: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>,
    ChevronRight: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6"/></svg>,
    Calendar: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>,
    Share: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>,
    Archive: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>,
    Coffee: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/></svg>,
    ShoppingCart: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>,
    TrendingUp: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
    UserCircle: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></svg>,
    Lock: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    LogOut: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>,
  };
  return <>{icons[name] || null}</>;
}

// ─── Modal Component ────────────────────────────────────────────────────────
function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative w-full rounded-2xl bg-card border border-border shadow-2xl animate-scale-in overflow-hidden',
          maxWidth
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <Icon name="X" size={18} />
          </button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ─── Meal Stepper Component ─────────────────────────────────────────────────
function MealStepper({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  icon: string;
}) {
  const step = (delta: number) => {
    const newVal = Math.max(0, Math.min(5, +(value + delta).toFixed(2)));
    onChange(newVal);
  };

  return (
    <div className="glass-card p-4 flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon name={icon} size={16} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold gradient-text">{value.toFixed(2)}</div>
      <div className="flex items-center justify-center gap-1.5 w-full">
        <button
          onClick={() => step(-1)}
          className="flex-1 max-w-[36px] h-9 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 flex items-center justify-center transition-colors text-xs font-bold"
        >
          -1
        </button>
        <button
          onClick={() => step(-0.25)}
          className="flex-1 max-w-[36px] h-9 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
        >
          <Icon name="Minus" size={14} />
        </button>
        <button
          onClick={() => step(0.25)}
          className="flex-1 max-w-[36px] h-9 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
        >
          <Icon name="Plus" size={14} />
        </button>
        <button
          onClick={() => step(1)}
          className="flex-1 max-w-[36px] h-9 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 flex items-center justify-center transition-colors text-xs font-bold"
        >
          +1
        </button>
      </div>
    </div>
  );
}

// ─── Ring Gauge Component ───────────────────────────────────────────────────
function RingGauge({ value, max, label, color = 'primary' }: { value: number; max: number; label: string; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const r = 40;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          className={cn(color === 'success' ? 'text-success' : color === 'destructive' ? 'text-destructive' : 'text-primary')}
          strokeWidth="8"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
        />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-sm font-bold" fontSize="14">
          {value.toFixed(1)}
        </text>
      </svg>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN APPLICATION
// ═══════════════════════════════════════════════════════════════════════════

function LoginScreen({ store }: { store: any }) {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const synced: boolean = store.cloudSynced;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedUser) {
      setError('Please select a user');
      return;
    }
    const success = store.login(selectedUser, pin);
    if (!success) {
      setError('Invalid PIN');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm glass-card p-6 space-y-6 animate-scale-in">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl mx-auto flex items-center justify-center text-primary mb-4">
            <Icon name="Lock" size={32} />
          </div>
          <h1 className="text-2xl font-bold">Welcome Back</h1>
          <p className="text-sm text-muted-foreground">Select your account to continue</p>
        </div>

        {/* Cloud sync status badge */}
        {!synced ? (
          <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-primary/10 text-primary text-sm font-medium">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <span>Syncing latest data…</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-1 px-3 rounded-xl bg-success/10 text-success text-xs font-medium">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Data synced from cloud ✔️</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Member</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              disabled={!synced}
              className="w-full p-3 rounded-xl bg-card border border-border outline-none focus:border-primary transition-colors appearance-none disabled:opacity-50"
            >
              <option value="">-- Select Member --</option>
              {store.members.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">PIN</label>
            <input
              type="password"
              placeholder="Enter your PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              disabled={!synced}
              className="w-full p-3 rounded-xl bg-card border border-border outline-none focus:border-primary transition-colors disabled:opacity-50"
              maxLength={6}
            />
          </div>

          {error && <p className="text-sm text-destructive text-center font-medium">{error}</p>}

          <button
            type="submit"
            disabled={!synced}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {synced ? 'Login' : 'Syncing…'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function MessManagerApp() {
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState<NavId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Modal states
  const [mealModalOpen, setMealModalOpen] = useState(false);
  const [mealEditDate, setMealEditDate] = useState<string | null>(null); // pre-select date for editing
  const [mealEditMember, setMealEditMember] = useState<string | null>(null); // pre-select member for editing
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<any>(null);
  const [mealCostModalOpen, setMealCostModalOpen] = useState(false);
  const [editingMealCost, setEditingMealCost] = useState<any>(null);
  const [otherCostModalOpen, setOtherCostModalOpen] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [monthModalOpen, setMonthModalOpen] = useState(false);
  const [closeMonthModalOpen, setCloseMonthModalOpen] = useState(false);
  const [bazarAssignModalOpen, setBazarAssignModalOpen] = useState(false);
  const [bazarAssignDate, setBazarAssignDate] = useState('');

  // Store
  const store = useStore();
  const {
    members,
    months,
    activeMonthId,
    activeUserId,
    messName,
    theme,
    activityLog,
    setTheme,
    setMessName,
    setActiveUser,
    setActiveMonth,
    setMealEntry,
    addDeposit,
    addMealCost,
    addOtherCost,
    addMember,
    removeMember,
    removeDeposit,
    removeMealCost,
    removeOtherCost,
    createMonth,
    closeMonth,
    exportData,
    importData,
    resetToDemo,
    setBazarSchedule,
    transferManagerRole,
    setFullMealEntry,
    checkSession,
    loadFromCloud,
  } = store;

  // Track whether any modal is open so we can skip cloud polling during edits
  const anyModalOpen = mealModalOpen || depositModalOpen || mealCostModalOpen || otherCostModalOpen || memberModalOpen || monthModalOpen || closeMonthModalOpen || bazarAssignModalOpen;

  useEffect(() => {
    setMounted(true);
    // Check if the persisted session is older than 7 days and log out if so
    checkSession();
    // Load shared data from cloud (Upstash Redis) — syncs members, PINs, meals etc.
    loadFromCloud();
    // Register service worker for PWA / offline support
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // ── Periodic cloud sync (pauses when modals are open) ──────────
  useEffect(() => {
    if (anyModalOpen) return; // Don't poll while user is editing

    const syncInterval = setInterval(() => {
      loadFromCloud();
    }, 30_000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadFromCloud();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(syncInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [anyModalOpen]);

  // Apply theme
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      root.classList.add(theme);
    }
  }, [theme, mounted]);

  // Active month & user
  const activeMonth = useMemo(
    () => months.find((m) => m.id === activeMonthId) || null,
    [months, activeMonthId]
  );
  const activeUser = useMemo(
    () => members.find((m) => m.id === activeUserId) || null,
    [members, activeUserId]
  );
  const isManager = activeUser?.role === 'MANAGER';

  // Early return moved to render method

  // Month summary
  const monthSummary = useMemo(
    () => (activeMonth ? calcMonthSummary(activeMonth, members) : null),
    [activeMonth, members]
  );

  // My summary
  const mySummary = useMemo(
    () =>
      monthSummary && activeUserId
        ? monthSummary.memberSummaries.find((s) => s.memberId === activeUserId) || null
        : null,
    [monthSummary, activeUserId]
  );

  const today = getTodayStr();

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Mess Manager...</p>
        </div>
      </div>
    );
  }

  // ── HEADER ──────────────────────────────────────────────────────────────
  const Header = () => (
    <header className="sticky top-0 z-40 glass-card border-b border-border/50 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Icon name="Menu" size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center">
              <Icon name="UtensilsCrossed" size={16} className="text-white" />
            </div>
            <h1 className="text-lg font-bold hidden sm:block">{messName || 'Mess Manager'}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Active Month Badge */}
          {activeMonth && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium">
              <Icon name="Calendar" size={14} className="text-primary" />
              <span>{activeMonth.monthName}</span>
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase',
                activeMonth.status === 'ACTIVE' ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
              )}>
                {activeMonth.status === 'ACTIVE' ? '● Running' : 'Archived'}
              </span>
            </div>
          )}

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 rounded-lg hover:bg-muted transition-colors relative"
            >
              <Icon name="Bell" size={20} />
              {activityLog.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive animate-pulse" />
              )}
            </button>
            {notifOpen && (
              <div className="fixed sm:absolute inset-x-4 top-[70px] sm:inset-auto sm:right-0 sm:top-12 w-auto sm:w-80 max-w-[400px] glass-card rounded-xl shadow-2xl border border-border overflow-hidden z-[100]">
                <div className="p-3 border-b border-border font-semibold text-sm">Recent Activity</div>
                <div className="max-h-64 overflow-y-auto">
                  {activityLog.slice(0, 10).map((log) => (
                    <div key={log.id} className="px-3 py-2.5 border-b border-border/30 text-sm hover:bg-muted/50 transition-colors">
                      <p className="text-foreground">{log.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {activityLog.length === 0 && (
                    <p className="p-4 text-center text-muted-foreground text-sm">No activity yet</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={20} />
          </button>

          {/* User Profile Pill */}
          {activeUser && (
            <div className="flex items-center gap-1 pl-2 pr-2 py-1.5 rounded-full bg-muted border border-border">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center text-white text-xs font-bold">
                {activeUser.name.charAt(0)}
              </div>
              <div className="hidden sm:block px-1">
                <p className="text-xs font-semibold leading-tight">{activeUser.name}</p>
                <p className={cn(
                  'text-[10px] font-bold uppercase',
                  activeUser.role === 'MANAGER' ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {activeUser.role}
                </p>
              </div>
              <button
                onClick={() => store.logout()}
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors ml-1"
                title="Logout"
              >
                <Icon name="LogOut" size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );

  // ── NAVIGATION ──────────────────────────────────────────────────────────
  const Navigation = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={cn(
      mobile ? 'flex flex-col gap-1 p-2' : 'hidden lg:flex flex-col gap-1 p-2 w-56 border-r border-border min-h-[calc(100vh-65px)]'
    )}>
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            setActiveNav(item.id);
            setSidebarOpen(false);
          }}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
            activeNav === item.id
              ? 'bg-primary/15 text-primary shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Icon name={item.icon} size={18} />
          {item.label}
        </button>
      ))}

      {/* Month Switcher */}
      {months.length > 1 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="px-3 text-[11px] text-muted-foreground uppercase font-semibold mb-2 tracking-wider">Months</p>
          {months.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveMonth(m.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                activeMonthId === m.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Icon name={m.status === 'ACTIVE' ? 'Calendar' : 'Archive'} size={14} />
              <span className="truncate">{m.monthName}</span>
            </button>
          ))}
        </div>
      )}
    </nav>
  );

  // ── DASHBOARD ───────────────────────────────────────────────────────────
  const Dashboard = () => {
    if (!activeMonth || !monthSummary) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Icon name="Calendar" size={48} className="text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Active Month</h2>
          <p className="text-muted-foreground mb-4">Create a new month to get started</p>
          <button
            onClick={() => setMonthModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Create Month
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in">
        {/* Summary Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Mess Balance */}
          <div className="glass-card-hover p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">Mess Balance</span>
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon name="Wallet" size={18} className="text-primary" />
              </div>
            </div>
            <p className={cn(
              'text-2xl font-bold',
              monthSummary.messBalance >= 0 ? 'text-success' : 'text-destructive'
            )}>
              {formatCurrency(monthSummary.messBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Cash in hand</p>
          </div>

          {/* Meal Rate */}
          <div className="glass-card-hover p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">Meal Rate</span>
              <div className="p-2 rounded-lg bg-chart-4/10">
                <Icon name="TrendingUp" size={18} className="text-chart-4" />
              </div>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(monthSummary.mealRate)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {monthSummary.totalMeals.toFixed(1)} meals consumed
            </p>
          </div>

          {/* Total Deposits */}
          <div className="glass-card-hover p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">Total Deposits</span>
              <div className="p-2 rounded-lg bg-success/10">
                <Icon name="Download" size={18} className="text-success" />
              </div>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(monthSummary.totalDeposits)}</p>
            <p className="text-xs text-muted-foreground mt-1">From {members.length} members</p>
          </div>

          {/* Total Expenses */}
          <div className="glass-card-hover p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">Total Expenses</span>
              <div className="p-2 rounded-lg bg-destructive/10">
                <Icon name="Receipt" size={18} className="text-destructive" />
              </div>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(monthSummary.totalExpenses)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Meal: {formatCurrency(monthSummary.totalMealCost)}
            </p>
          </div>
        </div>

        {/* Personal Summary Card */}
        {mySummary && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon name="UserCircle" size={20} className="text-primary" />
              My Summary — {mySummary.memberName}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <RingGauge
                value={mySummary.totalMeals}
                max={monthSummary.totalMeals / Math.max(members.length, 1) * 1.5}
                label="My Meals"
              />
              <RingGauge
                value={mySummary.totalDeposit}
                max={mySummary.totalCost > 0 ? mySummary.totalCost * 1.3 : 5000}
                label="Deposit"
                color={mySummary.totalDeposit >= mySummary.totalCost ? 'success' : 'destructive'}
              />
              <div className="flex flex-col items-center justify-center">
                <p className="text-sm text-muted-foreground mb-1">Total Cost</p>
                <p className="text-xl font-bold">{formatCurrency(mySummary.totalCost)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Meal: {formatCurrency(mySummary.mealCost)}
                </p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-sm text-muted-foreground mb-1">My Balance</p>
                <p className={cn(
                  'text-2xl font-bold',
                  mySummary.balance >= 0 ? 'text-success' : 'text-destructive'
                )}>
                  {formatCurrency(mySummary.balance)}
                </p>
                <p className={cn(
                  'text-[11px] font-semibold uppercase mt-1',
                  mySummary.balance >= 0 ? 'text-success' : 'text-destructive'
                )}>
                  {mySummary.balance >= 0 ? '● Surplus' : '● Due'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bazar Schedule Strip */}
        <BazarScheduleStrip />

        {/* All Members Breakdown */}
        <MembersBreakdown />
      </div>
    );
  };

  // ── BAZAR SCHEDULE STRIP ────────────────────────────────────────────────
  const BazarScheduleStrip = () => {
    if (!activeMonth) return null;

    const days = getDaysInRange(activeMonth.startDate, activeMonth.endDate).slice(0, 15);

    return (
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Icon name="ShoppingCart" size={16} className="text-primary" />
            Bazar Duty Schedule
          </h3>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {days.map((date) => {
            const assigned = activeMonth.bazarSchedule[date] || [];
            const isToday = date === today;
            return (
              <button
                key={date}
                onClick={() => {
                  if (isManager) {
                    setBazarAssignDate(date);
                    setBazarAssignModalOpen(true);
                  } else {
                    alert("Only manager can perform this action");
                  }
                }}
                className={cn(
                  'flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-xl min-w-[64px] border transition-all',
                  isToday
                    ? 'bg-primary/15 border-primary/40'
                    : 'bg-muted/30 border-border hover:border-primary/30'
                )}
              >
                <span className="text-[10px] text-muted-foreground">
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className={cn('text-sm font-bold', isToday && 'text-primary')}>
                  {date.slice(8)}
                </span>
                {assigned.length > 0 ? (
                  <div className="flex -space-x-1">
                    {assigned.slice(0, 2).map((id) => {
                      const m = members.find((x) => x.id === id);
                      return (
                        <div
                          key={id}
                          className="w-5 h-5 rounded-full bg-primary/80 text-white text-[8px] flex items-center justify-center font-bold border border-card"
                        >
                          {m?.name?.charAt(0) || '?'}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-[9px] text-muted-foreground">—</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ── MEMBERS BREAKDOWN TABLE ─────────────────────────────────────────────
  const MembersBreakdown = () => {
    if (!monthSummary) return null;

    return (
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2">
            <Icon name="Users" size={18} className="text-primary" />
            All Members Breakdown
          </h3>
        </div>

        {/* Mobile View: Box Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 md:hidden">
          {monthSummary.memberSummaries.map((ms) => (
            <div key={ms.memberId} className="bg-card border border-border/50 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/30 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-chart-4/80 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                    {ms.memberName.charAt(0)}
                  </div>
                  <span className="font-semibold text-base">{ms.memberName}</span>
                </div>
                <div className={cn('font-bold text-lg', ms.balance >= 0 ? 'text-success' : 'text-destructive')}>
                  {formatCurrency(ms.balance)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-[11px] uppercase tracking-wider">Meals</span>
                  <span className="font-mono font-medium">{ms.totalMeals.toFixed(1)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-[11px] uppercase tracking-wider">Deposit</span>
                  <span className="font-mono font-medium text-primary">{formatCurrency(ms.totalDeposit)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-[11px] uppercase tracking-wider">Meal Cost</span>
                  <span className="font-mono font-medium">{formatCurrency(ms.mealCost)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-[11px] uppercase tracking-wider">Shared</span>
                  <span className="font-mono font-medium">{formatCurrency(ms.sharedCost)}</span>
                </div>
                <div className="flex flex-col col-span-2 pt-1 border-t border-border/30 mt-1">
                  <span className="text-muted-foreground text-[11px] uppercase tracking-wider">Total Cost</span>
                  <span className="font-mono font-medium text-destructive">{formatCurrency(ms.totalCost)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 font-semibold">Member</th>
                <th className="text-right p-3 font-semibold">Meals</th>
                <th className="text-right p-3 font-semibold">Deposit</th>
                <th className="text-right p-3 font-semibold">Meal Cost</th>
                <th className="text-right p-3 font-semibold">Shared</th>
                <th className="text-right p-3 font-semibold">Total Cost</th>
                <th className="text-right p-3 font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody>
              {monthSummary.memberSummaries.map((ms) => (
                <tr key={ms.memberId} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/80 to-chart-4/80 flex items-center justify-center text-white text-xs font-bold">
                        {ms.memberName.charAt(0)}
                      </div>
                      <span className="font-medium">{ms.memberName}</span>
                    </div>
                  </td>
                  <td className="text-right p-3 font-mono">{ms.totalMeals.toFixed(1)}</td>
                  <td className="text-right p-3 font-mono">{formatCurrency(ms.totalDeposit)}</td>
                  <td className="text-right p-3 font-mono">{formatCurrency(ms.mealCost)}</td>
                  <td className="text-right p-3 font-mono">{formatCurrency(ms.sharedCost)}</td>
                  <td className="text-right p-3 font-mono">{formatCurrency(ms.totalCost)}</td>
                  <td className={cn('text-right p-3 font-mono font-bold', ms.balance >= 0 ? 'text-success' : 'text-destructive')}>
                    {formatCurrency(ms.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── MEALS PAGE ──────────────────────────────────────────────────────────
  const MealsPage = () => {
    if (!activeMonth) return <EmptyState />;

    const dates = getDaysInRange(activeMonth.startDate, activeMonth.endDate);
    const recentDates = dates.filter((d) => d <= today).slice(-7).reverse();

    const openMealEdit = (date: string, memberId?: string) => {
      if (!isManager) { alert("Only manager can perform this action"); return; }
      setMealEditDate(date);
      setMealEditMember(memberId || null);
      setMealModalOpen(true);
    };

    return (
      <div className="space-y-6 animate-in">
        {/* Batch Meal Grid */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold">Recent Meal Log (Last 7 Days)</h3>
            <button
              onClick={() => isManager ? setMealModalOpen(true) : alert("Only manager can perform this action")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Icon name="Plus" size={14} />
              Add / Edit Meal
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-semibold">Date</th>
                  {members.map((m) => (
                    <th key={m.id} className="text-center p-3 font-semibold text-xs">
                      {m.name.split(' ')[0]}
                    </th>
                  ))}
                  <th className="text-center p-3 font-semibold text-xs bg-muted/50">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentDates.map((date) => {
                  // Calculate daily total across all members
                  let dayTotal = 0;
                  const memberCells = members.map((m) => {
                    const entry = activeMonth.meals.find(
                      (e) => e.date === date && e.memberId === m.id
                    );
                    const total = entry
                      ? entry.breakfast + entry.lunch + entry.dinner
                      : 0;
                    dayTotal += total;
                    return { member: m, entry, total };
                  });

                  return (
                    <tr key={date} className={cn('border-b border-border/30', date === today && 'bg-primary/5')}>
                      <td className="p-3 text-xs font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          {date === today && (
                            <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[9px] font-bold">
                              TODAY
                            </span>
                          )}
                          {isManager && (
                            <button
                              onClick={() => openMealEdit(date)}
                              className="ml-1 p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                              title={`Edit all meals for this day`}
                            >
                              <Icon name="Pencil" size={10} />
                            </button>
                          )}
                        </div>
                      </td>
                      {memberCells.map(({ member: m, entry, total }) => (
                        <td
                          key={m.id}
                          className={cn("text-center p-3", isManager && "cursor-pointer hover:bg-primary/5 transition-colors")}
                          onClick={() => openMealEdit(date, m.id)}
                          title={isManager ? `Click to edit ${m.name}'s meal` : undefined}
                        >
                          <span className={cn(
                            'inline-block min-w-[32px] px-2 py-0.5 rounded-full text-xs font-bold',
                            total > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                          )}>
                            {total > 0 ? total.toFixed(1) : '—'}
                          </span>
                          {entry && total > 0 && (
                            <div className="text-[9px] text-muted-foreground mt-0.5">
                              {entry.breakfast}/{entry.lunch}/{entry.dinner}
                            </div>
                          )}
                        </td>
                      ))}
                      <td className="text-center p-3 bg-muted/20">
                        <span className={cn(
                          'inline-block min-w-[40px] px-2 py-0.5 rounded-full text-xs font-bold',
                          dayTotal > 0 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                        )}>
                          {dayTotal > 0 ? dayTotal.toFixed(1) : '0'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <BazarScheduleStrip />
      </div>
    );
  };

  // ── DEPOSITS PAGE ───────────────────────────────────────────────────────
  const DepositsPage = () => {
    if (!activeMonth) return <EmptyState />;

    const sortedDeposits = [...activeMonth.deposits].sort(
      (a, b) => b.date.localeCompare(a.date)
    );

    return (
      <div className="space-y-4 animate-in">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Deposits</h2>
          <button
            onClick={() => isManager ? setDepositModalOpen(true) : alert("Only manager can perform this action")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            <Icon name="Plus" size={16} />
            Add Deposit
          </button>
        </div>

        <div className="glass-card overflow-hidden">
          {/* Mobile View: Box Cards */}
          <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
            {sortedDeposits.map((d) => {
              const member = members.find((m) => m.id === d.memberId);
              return (
                <div key={d.id} className="bg-card border border-border/50 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                        {member?.name?.charAt(0) || '?'}
                      </div>
                      <span className="font-semibold text-base">{member?.name || 'Unknown'}</span>
                    </div>
                    <div className="font-bold text-lg text-success">
                      {formatCurrency(d.amount)}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <div className="text-muted-foreground text-xs">{d.date}</div>
                    <div className="text-muted-foreground text-xs flex items-center gap-1">
                      {d.note || '—'}
                      {d.isAutoDeposit && (
                        <span className="px-1.5 py-0.5 rounded-full bg-chart-4/15 text-chart-4 text-[9px] font-bold">AUTO</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/30">
                    <button
                      onClick={() => {
                        if (!isManager) { alert("Only manager can perform this action"); return; }
                        setEditingDeposit(d);
                        setDepositModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium"
                    >
                      <Icon name="Edit" size={14} /> Edit
                    </button>
                    <button
                      onClick={() => isManager ? removeDeposit(d.id) : alert("Only manager can perform this action")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-xs font-medium"
                    >
                      <Icon name="Trash" size={14} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
            {sortedDeposits.length === 0 && (
              <p className="text-center text-muted-foreground text-sm p-4">No deposits yet</p>
            )}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-semibold">Date</th>
                  <th className="text-left p-3 font-semibold">Member</th>
                  <th className="text-right p-3 font-semibold">Amount</th>
                  <th className="text-left p-3 font-semibold">Note</th>
                  <th className="text-center p-3 font-semibold w-24">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedDeposits.map((d) => {
                  const member = members.find((m) => m.id === d.memberId);
                  return (
                    <tr key={d.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="p-3 text-xs">{d.date}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
                            {member?.name?.charAt(0) || '?'}
                          </div>
                          <span>{member?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="text-right p-3 font-mono font-bold text-success">{formatCurrency(d.amount)}</td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {d.note || '—'}
                        {d.isAutoDeposit && (
                          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-chart-4/15 text-chart-4 text-[9px] font-bold">AUTO</span>
                        )}
                      </td>
                      <td className="text-center p-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              if (!isManager) { alert("Only manager can perform this action"); return; }
                              setEditingDeposit(d);
                              setDepositModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Icon name="Edit" size={14} />
                          </button>
                          <button
                            onClick={() => isManager ? removeDeposit(d.id) : alert("Only manager can perform this action")}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Icon name="Trash" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ── COSTS PAGE ──────────────────────────────────────────────────────────
  const CostsPage = () => {
    const [tab, setTab] = useState<'meal' | 'other'>('meal');

    if (!activeMonth) return <EmptyState />;

    return (
      <div className="space-y-4 animate-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1 p-1 rounded-xl bg-muted">
            <button
              onClick={() => setTab('meal')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab === 'meal' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Meal / Bazar Cost
            </button>
            <button
              onClick={() => setTab('other')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab === 'other' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Other Costs
            </button>
          </div>
          <button
            onClick={() => isManager ? (tab === 'meal' ? setMealCostModalOpen(true) : setOtherCostModalOpen(true)) : alert("Only manager can perform this action")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            <Icon name="Plus" size={16} />
            Add {tab === 'meal' ? 'Meal Cost' : 'Other Cost'}
          </button>
        </div>

        {tab === 'meal' ? (
          <div className="glass-card overflow-hidden">
            {/* Mobile View: Box Cards */}
            <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
              {[...activeMonth.mealCosts].sort((a, b) => b.date.localeCompare(a.date)).map((c) => {
                const shopper = members.find((m) => m.id === c.shopperMemberId);
                return (
                  <div key={c.id} className="bg-card border border-border/50 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-border/30 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base">{shopper?.name || 'Unknown'}</span>
                        {c.isAutoCreditedToDeposit && (
                          <span className="px-1.5 py-0.5 rounded-full bg-chart-4/15 text-chart-4 text-[9px] font-bold">AUTO-DEP</span>
                        )}
                      </div>
                      <div className="font-bold text-lg text-destructive">
                        {formatCurrency(c.amount)}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <div className="text-muted-foreground text-xs">{c.date}</div>
                      <div className="text-muted-foreground text-xs flex-1 text-right ml-4 truncate">
                        {c.bazarList || '—'}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/30">
                      <button
                        onClick={() => {
                          if (!isManager) { alert("Only manager can perform this action"); return; }
                          setEditingMealCost(c);
                          setMealCostModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium"
                      >
                        <Icon name="Edit" size={14} /> Edit
                      </button>
                      <button onClick={() => isManager ? removeMealCost(c.id) : alert("Only manager can perform this action")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-xs font-medium">
                        <Icon name="Trash" size={14} /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
              {activeMonth.mealCosts.length === 0 && (
                <p className="text-center text-muted-foreground text-sm p-4">No meal costs yet</p>
              )}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3 font-semibold">Date</th>
                    <th className="text-left p-3 font-semibold">Shopper</th>
                    <th className="text-left p-3 font-semibold hidden sm:table-cell">Items</th>
                    <th className="text-right p-3 font-semibold">Amount</th>
                    <th className="text-center p-3 w-24">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[...activeMonth.mealCosts].sort((a, b) => b.date.localeCompare(a.date)).map((c) => {
                    const shopper = members.find((m) => m.id === c.shopperMemberId);
                    return (
                      <tr key={c.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="p-3 text-xs">{c.date}</td>
                        <td className="p-3">
                          {shopper?.name || 'Unknown'}
                          {c.isAutoCreditedToDeposit && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-chart-4/15 text-chart-4 text-[9px] font-bold">AUTO-DEP</span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground hidden sm:table-cell truncate max-w-[200px]">{c.bazarList || '—'}</td>
                        <td className="text-right p-3 font-mono font-bold text-destructive">{formatCurrency(c.amount)}</td>
                        <td className="text-center p-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                if (!isManager) { alert("Only manager can perform this action"); return; }
                                setEditingMealCost(c);
                                setMealCostModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Icon name="Edit" size={14} />
                            </button>
                            <button onClick={() => isManager ? removeMealCost(c.id) : alert("Only manager can perform this action")} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                              <Icon name="Trash" size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            {/* Mobile View: Box Cards */}
            <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
              {activeMonth.otherCosts.map((c) => (
                <div key={c.id} className="bg-card border border-border/50 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">{c.costTitle}</span>
                      <span className={cn(
                        'px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase',
                        c.costType === 'SHARED' ? 'bg-primary/15 text-primary' : 'bg-chart-4/15 text-chart-4'
                      )}>
                        {c.costType}
                      </span>
                    </div>
                    <div className="font-bold text-lg text-foreground">
                      {formatCurrency(c.amount)}
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground text-xs flex-1 truncate">
                    Members: {c.targetMemberIds.map((id) => members.find((m) => m.id === id)?.name?.split(' ')[0]).join(', ')}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/30">
                    <button onClick={() => isManager ? removeOtherCost(c.id) : alert("Only manager can perform this action")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-xs font-medium">
                      <Icon name="Trash" size={14} /> Delete
                    </button>
                  </div>
                </div>
              ))}
              {activeMonth.otherCosts.length === 0 && (
                <p className="text-center text-muted-foreground text-sm p-4">No other costs yet</p>
              )}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3 font-semibold">Title</th>
                    <th className="text-left p-3 font-semibold">Type</th>
                    <th className="text-left p-3 font-semibold hidden sm:table-cell">Members</th>
                    <th className="text-right p-3 font-semibold">Amount</th>
                    <th className="text-center p-3 w-16">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeMonth.otherCosts.map((c) => (
                    <tr key={c.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-medium">{c.costTitle}</td>
                      <td className="p-3">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                          c.costType === 'SHARED' ? 'bg-primary/15 text-primary' : 'bg-chart-4/15 text-chart-4'
                        )}>
                          {c.costType}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground hidden sm:table-cell">
                        {c.targetMemberIds.map((id) => members.find((m) => m.id === id)?.name?.split(' ')[0]).join(', ')}
                      </td>
                      <td className="text-right p-3 font-mono font-bold">{formatCurrency(c.amount)}</td>
                      <td className="text-center p-3">
                          <button onClick={() => isManager ? removeOtherCost(c.id) : alert("Only manager can perform this action")} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                            <Icon name="Trash" size={14} />
                          </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── MEMBERS PAGE ────────────────────────────────────────────────────────
  const MembersPage = () => (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Members ({members.length})</h2>
        <button
          onClick={() => isManager ? setMemberModalOpen(true) : alert("Only manager can perform this action")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          <Icon name="Plus" size={16} />
          Add Member
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((m) => {
          const summary = activeMonth ? calcMemberSummary(activeMonth, m) : null;
          return (
            <div key={m.id} className="glass-card-hover p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center text-white text-lg font-bold">
                    {m.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{m.name}</p>
                    <p className={cn(
                      'text-[10px] font-bold uppercase',
                      m.role === 'MANAGER' ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {m.role}
                    </p>
                  </div>
                </div>
                  <div className="flex gap-2">
                    {isManager && m.role !== 'MANAGER' && (
                      <button
                        onClick={() => {
                          if (confirm(`Make ${m.name} the new Manager? You will become a regular member.`)) {
                            try {
                              transferManagerRole(m.id);
                              alert(`Success! ${m.name} is now the Manager.`);
                            } catch (err: any) {
                              alert("Error: " + err.message);
                            }
                          }
                        }}
                        className="px-2 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                      >
                        Make Manager
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (!isManager) {
                          alert("Only manager can perform this action");
                        } else if (confirm(`Remove ${m.name}?`)) {
                          removeMember(m.id);
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Icon name="Trash" size={14} />
                    </button>
                  </div>
              </div>
              {summary && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Meals</p>
                    <p className="font-bold">{summary.totalMeals.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Deposit</p>
                    <p className="font-bold">{formatCurrency(summary.totalDeposit)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Total Cost</p>
                    <p className="font-bold">{formatCurrency(summary.totalCost)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Balance</p>
                    <p className={cn('font-bold', summary.balance >= 0 ? 'text-success' : 'text-destructive')}>
                      {formatCurrency(summary.balance)}
                    </p>
                  </div>
                </div>
              )}
              {m.phone && <p className="text-xs text-muted-foreground mt-3">📱 {m.phone}</p>}
            </div>
          );
        })}
      </div>

      {activeMonth && <MembersBreakdown />}
    </div>
  );

  // ── REPORTS PAGE ────────────────────────────────────────────────────────
  const ReportsPage = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
      const data = exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mess_manager_backup_${getTodayStr()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        const success = importData(result);
        alert(success ? 'Data imported successfully!' : 'Import failed. Invalid data format.');
      };
      reader.readAsText(file);
    };

    const handlePDF = async () => {
      if (!activeMonth) return;
      const { generateMonthlyPDF } = await import('@/lib/pdf-generator');
      await generateMonthlyPDF(activeMonth, members, messName);
    };

    const handleShare = async () => {
      const data = exportData();
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Mess Manager Backup',
            text: 'Mess Manager data backup',
            files: [new File([data], `mess_backup_${getTodayStr()}.json`, { type: 'application/json' })],
          });
        } catch {
          // User cancelled or API not available, fallback
          handleExport();
        }
      } else {
        handleExport();
      }
    };

    return (
      <div className="space-y-6 animate-in">
        <h2 className="text-xl font-bold">Reports & Data</h2>

        {/* PDF Generation */}
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Icon name="FileBarChart" size={18} className="text-primary" />
            PDF Report
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Generate a comprehensive monthly financial statement as PDF.
          </p>
          <button
            onClick={handlePDF}
            disabled={!activeMonth}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Icon name="Download" size={16} />
            Generate PDF Report
          </button>
        </div>

        {/* Data Management */}
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Icon name="Archive" size={18} className="text-primary" />
            Data Management
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <Icon name="Download" size={18} className="text-success" />
              <div className="text-left">
                <p className="font-medium text-sm">Export JSON Backup</p>
                <p className="text-xs text-muted-foreground">Download complete data backup</p>
              </div>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <Icon name="Upload" size={18} className="text-primary" />
              <div className="text-left">
                <p className="font-medium text-sm">Import JSON Backup</p>
                <p className="text-xs text-muted-foreground">Restore from a backup file</p>
              </div>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <Icon name="Share" size={18} className="text-chart-4" />
              <div className="text-left">
                <p className="font-medium text-sm">Share via WhatsApp</p>
                <p className="text-xs text-muted-foreground">Share data via Web Share API</p>
              </div>
            </button>
              <button
                onClick={() => {
                  if (!isManager) {
                    alert("Only manager can perform this action");
                  } else if (confirm('Reset all data to demo? This will erase current data.')) {
                    resetToDemo();
                  }
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-destructive/30 hover:bg-destructive/5 transition-colors"
              >
                <Icon name="Trash" size={18} className="text-destructive" />
                <div className="text-left">
                  <p className="font-medium text-sm text-destructive">Reset Demo Data</p>
                  <p className="text-xs text-muted-foreground">Replace with fresh demo data</p>
                </div>
              </button>
          </div>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>

        {/* Month History */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Icon name="Calendar" size={18} className="text-primary" />
              Month History
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => isManager ? setMonthModalOpen(true) : alert("Only manager can perform this action")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                <Icon name="Plus" size={14} />
                New Month
              </button>
              {activeMonth?.status === 'ACTIVE' && (
                <button
                  onClick={() => isManager ? setCloseMonthModalOpen(true) : alert("Only manager can perform this action")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-chart-4/10 text-chart-4 text-sm font-medium hover:bg-chart-4/20 transition-colors"
                >
                  <Icon name="Archive" size={14} />
                  Close Month
                </button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            {months.map((m) => (
              <div
                key={m.id}
                onClick={() => setActiveMonth(m.id)}
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all',
                  m.id === activeMonthId
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border hover:border-primary/20 hover:bg-muted/30'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon name={m.status === 'ACTIVE' ? 'Calendar' : 'Archive'} size={18} className={m.status === 'ACTIVE' ? 'text-primary' : 'text-muted-foreground'} />
                  <div>
                    <p className="font-medium">{m.monthName}</p>
                    <p className="text-xs text-muted-foreground">{m.startDate} → {m.endDate}</p>
                  </div>
                </div>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                  m.status === 'ACTIVE' ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
                )}>
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── PROFILE PAGE ────────────────────────────────────────────────────────
  const ProfilePage = () => {
    const [name, setName] = useState(activeUser?.name || '');
    const [phone, setPhone] = useState(activeUser?.phone || '');
    const [localMessName, setLocalMessName] = useState(messName || '');
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmNewPin, setConfirmNewPin] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    if (!activeUser) return null;

    const handleUpdateProfile = () => {
      setMessage('');
      setError('');
      if (!name.trim()) {
        setError('Name cannot be empty');
        return;
      }
      if (isManager && !localMessName.trim()) {
        setError('Mess name cannot be empty');
        return;
      }
      
      store.updateMember(activeUser.id, { name: name.trim(), phone: phone.trim() });
      if (isManager) {
        setMessName(localMessName.trim());
      }
      
      setMessage('Profile updated successfully');
      setTimeout(() => setMessage(''), 3000);
    };

    const handleChangePin = () => {
      setMessage('');
      setError('');
      if (activeUser.pin && activeUser.pin !== currentPin) {
        setError('Current PIN is incorrect');
        return;
      }
      if (newPin !== confirmNewPin) {
        setError('New PINs do not match');
        return;
      }
      if (newPin.length > 0 && newPin.length !== 4) {
        setError('PIN must be exactly 4 digits');
        return;
      }
      
      store.updateMember(activeUser.id, { pin: newPin || undefined });
      setMessage('PIN changed successfully');
      setCurrentPin('');
      setNewPin('');
      setConfirmNewPin('');
      setTimeout(() => setMessage(''), 3000);
    };

    return (
      <div className="space-y-6 animate-in max-w-2xl mx-auto">
        <h2 className="text-xl font-bold">My Profile</h2>
        
        <div className="glass-card p-6 space-y-6">
          <h3 className="font-semibold flex items-center gap-2 border-b border-border pb-3">
            <Icon name="UserCircle" size={20} className="text-primary" />
            Personal Information
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border focus:border-primary focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Phone Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border focus:border-primary focus:outline-none transition-colors" />
            </div>
            <button onClick={handleUpdateProfile}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
              Update Profile
            </button>
          </div>
        </div>

        {isManager && (
          <div className="glass-card p-6 space-y-6">
            <h3 className="font-semibold flex items-center gap-2 border-b border-border pb-3">
              <Icon name="Settings" size={20} className="text-primary" />
              Mess Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Mess Name</label>
                <input type="text" value={localMessName} onChange={(e) => setLocalMessName(e.target.value)}
                  placeholder="e.g. Castle Black"
                  className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border focus:border-primary focus:outline-none transition-colors" />
                <p className="text-xs text-muted-foreground mt-2">This name appears on the Dashboard and PDF reports.</p>
              </div>
              <button onClick={handleUpdateProfile}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                Save Mess Name
              </button>
            </div>
            
            <div className="pt-4 mt-4 border-t border-border">
              <h4 className="text-sm font-semibold text-destructive mb-2">Danger Zone</h4>
              <button 
                onClick={async () => {
                  if (confirm("Are you sure? This will wipe all current data and load the August 2026 demo data from the PDF.")) {
                    await store.resetToDemo();
                    setMessage('Data reset to August Demo successfully!');
                    setTimeout(() => window.location.reload(), 1000);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-destructive/10 text-destructive font-medium hover:bg-destructive hover:text-destructive-foreground transition-colors text-sm">
                Reset to August Demo Data
              </button>
            </div>
          </div>
        )}

        <div className="glass-card p-6 space-y-6">
          <h3 className="font-semibold flex items-center gap-2 border-b border-border pb-3">
            <Icon name="Lock" size={20} className="text-primary" />
            Change PIN
          </h3>
          
          <div className="space-y-4">
            {activeUser.pin && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Current PIN</label>
                <input type="password" value={currentPin} onChange={(e) => setCurrentPin(e.target.value)} maxLength={4}
                  className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border focus:border-primary focus:outline-none transition-colors" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5">New PIN (4 digits)</label>
              <input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} maxLength={4} placeholder={!activeUser.pin ? "Set a new PIN" : ""}
                className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border focus:border-primary focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Confirm New PIN</label>
              <input type="password" value={confirmNewPin} onChange={(e) => setConfirmNewPin(e.target.value)} maxLength={4}
                className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border focus:border-primary focus:outline-none transition-colors" />
            </div>
            <button onClick={handleChangePin}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
              Update PIN
            </button>
          </div>
        </div>

        {message && (
          <div className="p-4 rounded-xl bg-success/20 border border-success/30 text-success text-sm font-medium animate-in fade-in">
            {message}
          </div>
        )}
        {error && (
          <div className="p-4 rounded-xl bg-destructive/20 border border-destructive/30 text-destructive text-sm font-medium animate-in fade-in">
            {error}
          </div>
        )}
      </div>
    );
  };

  // ── EMPTY STATE ─────────────────────────────────────────────────────────
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Icon name="Calendar" size={48} className="text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-2">No Active Month</h2>
      <p className="text-muted-foreground mb-4">Create a month cycle to start tracking</p>
      <button
        onClick={() => setMonthModalOpen(true)}
        className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
      >
        Create Month
      </button>
    </div>
  );

  // ── MODALS ──────────────────────────────────────────────────────────────

  const getDefaultDate = () => {
    if (!activeMonth) return today;
    if (today < activeMonth.startDate || today > activeMonth.endDate) return activeMonth.endDate;
    return today;
  };

  // Add/Edit Deposit Modal
  const AddDepositModal = () => {
    const [date, setDate] = useState(editingDeposit ? editingDeposit.date : getDefaultDate());
    const [memberId, setMemberId] = useState(editingDeposit ? editingDeposit.memberId : (activeUserId || ''));
    const [amount, setAmount] = useState(editingDeposit ? editingDeposit.amount.toString() : '');
    const [note, setNote] = useState(editingDeposit ? (editingDeposit.note || '') : '');

    // Reset state when modal opens/closes
    useEffect(() => {
      if (depositModalOpen) {
        setDate(editingDeposit ? editingDeposit.date : getDefaultDate());
        setMemberId(editingDeposit ? editingDeposit.memberId : (activeUserId || ''));
        setAmount(editingDeposit ? editingDeposit.amount.toString() : '');
        setNote(editingDeposit ? (editingDeposit.note || '') : '');
      }
    }, [depositModalOpen, editingDeposit, activeUserId]);

    const handleClose = () => {
      setDepositModalOpen(false);
      setEditingDeposit(null);
    };

    const handleSubmit = () => {
      if (!memberId || !amount || parseFloat(amount) <= 0) return;
      const depositData = {
        date,
        memberId,
        amount: parseFloat(amount),
        note: note || undefined,
      };
      
      if (editingDeposit) {
        store.updateDeposit(editingDeposit.id, depositData);
      } else {
        store.addDeposit(depositData);
      }
      handleClose();
    };

    return (
      <Modal open={depositModalOpen} onClose={handleClose} title={editingDeposit ? "Edit Deposit" : "Add Deposit"}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              min={activeMonth?.startDate}
              max={activeMonth?.endDate}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Member</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none transition-colors"
            >
              <option value="">Select member</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Amount ({CURRENCY_SYMBOL})</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Monthly deposit"
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          <button
            onClick={handleSubmit}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            {editingDeposit ? "Save Changes" : "Add Deposit"}
          </button>
        </div>
      </Modal>
    );
  };

  // Add Meal Cost Modal
  const AddMealCostModal = () => {
    const [date, setDate] = useState(editingMealCost ? editingMealCost.date : getDefaultDate());
    const [shopperId, setShopperId] = useState(editingMealCost ? editingMealCost.shopperMemberId : (activeUserId || ''));
    const [amount, setAmount] = useState(editingMealCost ? editingMealCost.amount.toString() : '');
    const [bazarList, setBazarList] = useState(editingMealCost ? (editingMealCost.bazarList || '') : '');
    const [autoDeposit, setAutoDeposit] = useState(editingMealCost ? editingMealCost.isAutoCreditedToDeposit : true);

    useEffect(() => {
      if (mealCostModalOpen) {
        setDate(editingMealCost ? editingMealCost.date : getDefaultDate());
        setShopperId(editingMealCost ? editingMealCost.shopperMemberId : (activeUserId || ''));
        setAmount(editingMealCost ? editingMealCost.amount.toString() : '');
        setBazarList(editingMealCost ? (editingMealCost.bazarList || '') : '');
        setAutoDeposit(editingMealCost ? editingMealCost.isAutoCreditedToDeposit : true);
      }
    }, [mealCostModalOpen, editingMealCost, activeUserId]);

    const handleClose = () => {
      setMealCostModalOpen(false);
      setEditingMealCost(null);
    };

    const handleSubmit = () => {
      if (!shopperId || !amount || parseFloat(amount) <= 0) return;
      const costData = {
        date,
        shopperMemberId: shopperId,
        amount: parseFloat(amount),
        bazarList: bazarList || undefined,
        isAutoCreditedToDeposit: autoDeposit,
      };

      if (editingMealCost) {
        store.updateMealCost(editingMealCost.id, costData, autoDeposit);
      } else {
        store.addMealCost(costData, autoDeposit);
      }
      handleClose();
    };

    return (
      <Modal open={mealCostModalOpen} onClose={handleClose} title={editingMealCost ? "Edit Meal / Bazar Cost" : "Add Meal / Bazar Cost"}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              min={activeMonth?.startDate} max={activeMonth?.endDate}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Shopper</label>
            <select value={shopperId} onChange={(e) => setShopperId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none transition-colors">
              <option value="">Select shopper</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Amount ({CURRENCY_SYMBOL})</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00" min="0" step="0.01"
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Bazar Items (optional)</label>
            <textarea value={bazarList} onChange={(e) => setBazarList(e.target.value)}
              rows={3} placeholder="e.g., Rice 5kg, Oil 1L, Vegetables..."
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none transition-colors resize-none" />
          </div>
          <label className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border cursor-pointer">
            <input
              type="checkbox"
              checked={autoDeposit}
              onChange={(e) => setAutoDeposit(e.target.checked)}
              className="w-4 h-4 rounded accent-primary"
            />
            <div>
              <p className="text-sm font-medium">Auto-deposit to Shopper</p>
              <p className="text-xs text-muted-foreground">
                Shopper paid out of pocket — auto-credit their deposit ledger
              </p>
            </div>
          </label>
          <button onClick={handleSubmit}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
            {editingMealCost ? "Save Changes" : "Add Meal Cost"}
          </button>
        </div>
      </Modal>
    );
  };

  // Add Other Cost Modal
  const AddOtherCostModal = () => {
    const [date, setDate] = useState(getDefaultDate());
    const [title, setTitle] = useState('');
    const [costType, setCostType] = useState<'SHARED' | 'INDIVIDUAL'>('SHARED');
    const [amount, setAmount] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>(members.map((m) => m.id));

    const toggleMember = (id: string) => {
      setSelectedMembers((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    };

    const handleSubmit = () => {
      if (!title || !amount || parseFloat(amount) <= 0 || selectedMembers.length === 0) return;
      addOtherCost({
        date,
        costTitle: title,
        costType,
        amount: parseFloat(amount),
        targetMemberIds: selectedMembers,
      });
      setOtherCostModalOpen(false);
    };

    return (
      <Modal open={otherCostModalOpen} onClose={() => setOtherCostModalOpen(false)} title="Add Other Cost">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Cost Title</label>
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none transition-colors"
            >
              <option value="">Select or type below</option>
              {COMMON_SHARED_COSTS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Or type a custom title"
              className="w-full px-3 py-2 mt-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              min={activeMonth?.startDate} max={activeMonth?.endDate}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Amount ({CURRENCY_SYMBOL})</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00" min="0" step="0.01"
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Cost Type</label>
            <div className="flex gap-1 p-1 rounded-lg bg-muted">
              <button
                onClick={() => {
                  setCostType('SHARED');
                  setSelectedMembers(members.map((m) => m.id));
                }}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  costType === 'SHARED' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                )}
              >
                Shared (Split)
              </button>
              <button
                onClick={() => {
                  setCostType('INDIVIDUAL');
                  setSelectedMembers([]);
                }}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  costType === 'INDIVIDUAL' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                )}
              >
                Individual
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {costType === 'SHARED' ? 'Split Among Members' : 'Assign To Member'}
            </label>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {members.map((m) => (
                <label key={m.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(m.id)}
                    onChange={() => toggleMember(m.id)}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-sm">{m.name}</span>
                </label>
              ))}
            </div>
            {costType === 'SHARED' && selectedMembers.length > 0 && amount && (
              <p className="text-xs text-muted-foreground mt-2">
                Each pays: {formatCurrency(parseFloat(amount || '0') / selectedMembers.length)}
              </p>
            )}
          </div>
          <button onClick={handleSubmit}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
            Add Other Cost
          </button>
        </div>
      </Modal>
    );
  };

  // Add Member Modal
  const AddMemberModal = () => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState<'MANAGER' | 'MEMBER'>('MEMBER');

    const handleSubmit = () => {
      if (!name.trim()) return;
      addMember({ name: name.trim(), phone: phone || undefined, role });
      setMemberModalOpen(false);
    };

    return (
      <Modal open={memberModalOpen} onClose={() => setMemberModalOpen(false)} title="Add Member">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Rahim Uddin"
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Phone (optional)</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Role</label>
            <div className="flex gap-1 p-1 rounded-lg bg-muted">
              <button
                onClick={() => setRole('MEMBER')}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  role === 'MEMBER' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                )}
              >
                Member
              </button>
              <button
                onClick={() => setRole('MANAGER')}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  role === 'MANAGER' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                )}
              >
                Manager
              </button>
            </div>
          </div>
          <button onClick={handleSubmit}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
            Add Member
          </button>
        </div>
      </Modal>
    );
  };

  // Create Month Modal
  const CreateMonthModal = () => {
    const now = new Date();
    const [monthStr, setMonthStr] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    const [managerId, setManagerId] = useState(activeUserId || '');

    const handleSubmit = () => {
      if (!monthStr || !managerId) return;
      const [year, month] = monthStr.split('-').map(Number);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      const monthName = new Date(year, month - 1).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
      createMonth(monthName, startDate, endDate, managerId);
      setMonthModalOpen(false);
    };

    return (
      <Modal open={monthModalOpen} onClose={() => setMonthModalOpen(false)} title="Create New Month">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Month</label>
            <input type="month" value={monthStr} onChange={(e) => setMonthStr(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Manager</label>
            <select value={managerId} onChange={(e) => setManagerId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none transition-colors">
              <option value="">Select manager</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <button onClick={handleSubmit}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
            Create Month
          </button>
        </div>
      </Modal>
    );
  };

  // Close Month Modal
  const CloseMonthModal = () => {
    const [nextManagerId, setNextManagerId] = useState(activeUserId || '');

    const handleSubmit = () => {
      if (!nextManagerId) return;
      if (confirm('Close current month and rollover balances to a new month? The selected user will become the Manager for the new month.')) {
        closeMonth(nextManagerId);
        setCloseMonthModalOpen(false);
      }
    };

    return (
      <Modal open={closeMonthModalOpen} onClose={() => setCloseMonthModalOpen(false)} title="Close Month">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Closing the month will archive the current records and create a new month with the rolled-over balances as deposits.
          </p>
          <div>
            <label className="block text-sm font-medium mb-1.5">Assign Next Manager</label>
            <select value={nextManagerId} onChange={(e) => setNextManagerId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none transition-colors">
              <option value="" disabled>Select Manager</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <button onClick={handleSubmit}
            className="w-full py-2.5 rounded-xl bg-chart-4 text-white font-medium hover:bg-chart-4/90 transition-colors">
            Close Month & Continue
          </button>
        </div>
      </Modal>
    );
  };

  // Bazar Assign Modal
  const BazarAssignModal = () => {
    const current = activeMonth?.bazarSchedule[bazarAssignDate] || [];
    const [selected, setSelected] = useState<string[]>(current);

    useEffect(() => {
      if (bazarAssignModalOpen && activeMonth) {
        setSelected(activeMonth.bazarSchedule[bazarAssignDate] || []);
      }
    }, [bazarAssignModalOpen, bazarAssignDate]);

    const toggleMember = (id: string) => {
      setSelected((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    };

    const handleSubmit = () => {
      setBazarSchedule(bazarAssignDate, selected);
      setBazarAssignModalOpen(false);
    };

    return (
      <Modal open={bazarAssignModalOpen} onClose={() => setBazarAssignModalOpen(false)} title={`Bazar Duty — ${bazarAssignDate}`}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Select members assigned for bazar duty on this date:</p>
          <div className="space-y-1">
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selected.includes(m.id)}
                  onChange={() => toggleMember(m.id)}
                  className="w-4 h-4 rounded accent-primary"
                />
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                    {m.name.charAt(0)}
                  </div>
                  <span className="font-medium text-sm">{m.name}</span>
                </div>
              </label>
            ))}
          </div>
          <button onClick={handleSubmit}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
            Save Assignment
          </button>
        </div>
      </Modal>
    );
  };

  const MealModal = () => {
    const initialDate = mealEditDate || getDefaultDate();
    const initialMembers = mealEditMember
      ? [mealEditMember]
      : mealEditDate
        ? members.map(m => m.id) // pencil icon = all members for that day
        : [members[0]?.id].filter(Boolean);

    const [date, setDate] = useState(initialDate);
    const [selectedMembers, setSelectedMembers] = useState<string[]>(initialMembers);
    const [mealValues, setMealValues] = useState<Record<string, { b: number; l: number; d: number }>>({});

    // Re-initialize when modal opens with new pre-selections
    useEffect(() => {
      setDate(mealEditDate || getDefaultDate());
      if (mealEditMember) {
        setSelectedMembers([mealEditMember]);
      } else if (mealEditDate) {
        setSelectedMembers(members.map(m => m.id));
      }
    }, [mealEditDate, mealEditMember]);

    const handleClose = () => {
      setMealModalOpen(false);
      setMealEditDate(null);
      setMealEditMember(null);
    };

    // Load existing meal values when date or selections change
    useEffect(() => {
      if (!activeMonth) return;
      const vals: Record<string, { b: number; l: number; d: number }> = {};
      for (const mid of selectedMembers) {
        const entry = activeMonth.meals.find(e => e.date === date && e.memberId === mid);
        vals[mid] = {
          b: entry?.breakfast ?? 0,
          l: entry?.lunch ?? 0,
          d: entry?.dinner ?? 0,
        };
      }
      setMealValues(vals);
    }, [date, selectedMembers, activeMonth]);

    const toggleMember = (id: string) => {
      setSelectedMembers(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
    };

    const selectAll = () => {
      if (selectedMembers.length === members.length) {
        setSelectedMembers([]);
      } else {
        setSelectedMembers(members.map(m => m.id));
      }
    };

    const updateMemberMeal = (memberId: string, field: 'b' | 'l' | 'd', value: number) => {
      setMealValues(prev => ({
        ...prev,
        [memberId]: { ...(prev[memberId] || { b: 0, l: 0, d: 0 }), [field]: value },
      }));
    };

    const handleSave = () => {
      if (!date || selectedMembers.length === 0) return;
      for (const mid of selectedMembers) {
        const v = mealValues[mid] || { b: 0, l: 0, d: 0 };
        setFullMealEntry(date, mid, { breakfast: v.b, lunch: v.l, dinner: v.d });
      }
      handleClose();
    };

    return (
      <Modal open={mealModalOpen} onClose={handleClose} title="Add / Edit Meals">
        <div className="space-y-4">
          {/* Date picker */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-muted/50 border border-border text-sm"
              max={activeMonth?.endDate}
              min={activeMonth?.startDate}
            />
          </div>

          {/* Member selection with checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground">Members</label>
              <button onClick={selectAll} className="text-xs text-primary hover:underline">
                {selectedMembers.length === members.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {members.map(m => (
                <button
                  key={m.id}
                  onClick={() => toggleMember(m.id)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-xs font-medium transition-all border',
                    selectedMembers.includes(m.id)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50'
                  )}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Meal values per selected member */}
          {selectedMembers.length > 0 && (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {selectedMembers.map(mid => {
                const m = members.find(x => x.id === mid);
                const v = mealValues[mid] || { b: 0, l: 0, d: 0 };
                return (
                  <div key={mid} className="glass-card p-3">
                    <p className="text-xs font-semibold mb-2 text-primary">{m?.name}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <MealStepper label="Breakfast" value={v.b} onChange={(val) => updateMemberMeal(mid, 'b', val)} icon="Coffee" />
                      <MealStepper label="Lunch" value={v.l} onChange={(val) => updateMemberMeal(mid, 'l', val)} icon="UtensilsCrossed" />
                      <MealStepper label="Dinner" value={v.d} onChange={(val) => updateMemberMeal(mid, 'd', val)} icon="Moon" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={selectedMembers.length === 0}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Meals ({selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''})
          </button>
        </div>
      </Modal>
    );
  };

  // ── PAGE ROUTER ─────────────────────────────────────────────────────────
  const renderPage = () => {
    switch (activeNav) {
      case 'dashboard': return <Dashboard />;
      case 'meals': return <MealsPage />;
      case 'deposits': return <DepositsPage />;
      case 'costs': return <CostsPage />;
      case 'members': return <MembersPage />;
      case 'reports': return <ReportsPage />;
      case 'profile': return <ProfilePage />;
      default: return <Dashboard />;
    }
  };

  // ── BOTTOM NAV (Mobile) ─────────────────────────────────────────────────
  const BottomNav = () => (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-card border-t border-border/50">
      <div className="flex items-center justify-around py-2">
        {NAV_ITEMS.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveNav(item.id)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all',
              activeNav === item.id ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon name={item.icon} size={20} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );

  // ── RENDER ──────────────────────────────────────────────────────────────
  if (mounted && !store.isAuthenticated) {
    return <LoginScreen store={store} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="flex">
        {/* Desktop Sidebar */}
        <Navigation />

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-64 bg-card border-r border-border shadow-2xl animate-slide-in">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-bold">Menu</h2>
                <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-muted">
                  <Icon name="X" size={18} />
                </button>
              </div>
              <Navigation mobile />
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 max-w-6xl mx-auto w-full pb-24 lg:pb-6">
          {renderPage()}
        </main>
      </div>

      <BottomNav />

      {/* Modals */}
      <MealModal />
      <AddDepositModal />
      <AddMealCostModal />
      <AddOtherCostModal />
      <AddMemberModal />
      <CreateMonthModal />
      <CloseMonthModal />
      <BazarAssignModal />

      {/* Close notification panel on outside click */}
      {notifOpen && (
        <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
      )}
    </div>
  );
}
