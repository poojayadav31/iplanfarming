import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, LogOut, Sprout, Sun, MapPin, Sparkles, Users, ListChecks } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function DashboardShell({
  title,
  subtitle,
  children,
  backTo,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  backTo?: string;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const showBack = location.pathname !== '/dashboard' && location.pathname !== '/';

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login', { replace: true });
  };

  const NAV_ITEMS = [
    { to: '/today',      icon: <Sun className="h-5 w-5" />,       label: 'Today' },
    { to: '/dashboard',  icon: <MapPin className="h-5 w-5" />,    label: 'My Farms' },
    { to: '/insights',   icon: <Sparkles className="h-5 w-5" />,  label: 'Insights' },
    { to: '/community',  icon: <Users className="h-5 w-5" />,     label: 'Community' },
    { to: '/checklist',  icon: <ListChecks className="h-5 w-5" />,label: 'Checklist' },
  ];

  return (
    <div className="min-h-screen bg-stone-100 pb-20">
      <nav className="border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-700">
              <Sprout className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-base font-semibold text-stone-900">iPlanFarmHouse</p>
              <p className="text-xs text-stone-500">Organic farm planning</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-stone-900">{user?.name}</p>
              <p className="text-xs text-stone-500">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-stone-200 px-4 text-sm font-medium text-stone-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {showBack && (
          <button
            type="button"
            onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
            className="mb-4 flex min-h-10 items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}

        <div className="mb-6 rounded-[28px] bg-linear-to-r from-green-800 via-green-700 to-emerald-600 px-5 py-6 text-white shadow-lg sm:px-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-green-50 sm:text-base">{subtitle}</p>
        </div>

        {children}
      </main>

      {/* ── Global bottom nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-around px-2 py-2">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.startsWith(item.to));
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-semibold transition ${
                  active
                    ? 'bg-green-50 text-green-700'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
