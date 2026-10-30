import { useState, type ReactNode } from 'react';
import { Languages, LayoutDashboard, LifeBuoy, LogOut, Menu, Package, ShieldCheck, AppWindow, ClipboardCheck, UserCheck, Users, X } from 'lucide-react';
import { Link } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { DemoBadge } from '@/components/ui';

interface NavItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface AppShellProps {
  path: string;
  children: ReactNode;
}

export function AppShell({ path, children }: AppShellProps) {
  const { t, lang, setLang } = useI18n();
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const canManage = profile?.role === 'owner' || profile?.role === 'admin';

  const items: NavItem[] = [
    { path: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { path: '/registrations', label: t.nav.registrations, icon: ClipboardCheck },
    ...(canManage ? [{ path: '/approvals', label: t.nav.approvals, icon: UserCheck }] : []),
    { path: '/users', label: t.nav.users, icon: Users },
    { path: '/apps/kyc', label: t.nav.app1, icon: AppWindow },
    { path: '/apps/services', label: t.nav.app2, icon: AppWindow },
    { path: '/packages', label: t.nav.packages, icon: Package },
    { path: '/support', label: t.nav.support, icon: LifeBuoy },
    { path: '/security', label: t.nav.security, icon: ShieldCheck },
  ];

  const navList = (onNavigate?: () => void) => (
    <nav aria-label={t.appName} className="flex flex-col gap-1">
      {items.map((item) => {
        const active = path === item.path;
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            onNavigate={onNavigate}
            className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition duration-200 ${
              active ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-teal-300">
        <ShieldCheck className="h-6 w-6" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900">{t.appName}</p>
        <p className="text-xs text-slate-500">{t.privateAdmin}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-6 border-r border-slate-200 bg-white p-5 lg:flex">
        {brand}
        <div className="flex-1 overflow-y-auto">{navList()}</div>
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setMenuOpen(false)}>
          <aside
            className="animate-fade-up flex h-full w-72 max-w-[85%] flex-col gap-6 bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              {brand}
              <button onClick={() => setMenuOpen(false)} className="rounded-lg p-2 hover:bg-slate-100" aria-label={t.common.close2}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{navList(() => setMenuOpen(false))}</div>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMenuOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
                aria-label={t.common.menu}
              >
                <Menu className="h-6 w-6" />
              </button>
              <DemoBadge />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
                className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Languages className="h-4 w-4" aria-hidden="true" />
                {t.common.language}
              </button>
              <button
                onClick={() => void signOut()}
                className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t.signOut}</span>
              </button>
            </div>
          </div>
          <div className="hidden px-6 pb-3 text-xs text-slate-500 sm:block">
            {profile?.displayName} · {profile?.email}
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
            {t.demoNotice}
          </p>
          {children}
        </main>
      </div>
    </div>
  );
}
