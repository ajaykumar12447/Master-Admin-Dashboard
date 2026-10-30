import { useEffect, type ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { navigate, usePathname } from '@/lib/router';
import { AppShell } from '@/components/AppShell';
import { LoginPage } from '@/pages/LoginPage';
import { PublicHomePage } from '@/pages/PublicHomePage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { RegistrationsPage } from '@/pages/RegistrationsPage';
import { UsersPage } from '@/pages/UsersPage';
import { AppControlPage } from '@/pages/AppControlPage';
import { PackagesPage } from '@/pages/PackagesPage';
import { SupportPage } from '@/pages/SupportPage';
import { SecurityPage } from '@/pages/SecurityPage';
import { ApprovalsPage } from '@/pages/ApprovalsPage';
import { AccessStatusPage } from '@/pages/AccessStatusPage';
import { Spinner } from '@/components/ui';

const PROTECTED_ROUTES: Record<string, () => ReactNode> = {
  '/dashboard': () => <DashboardPage />,
  '/registrations': () => <RegistrationsPage />,
  '/approvals': () => <ApprovalsPage />,
  '/users': () => <UsersPage />,
  '/apps/kyc': () => <AppControlPage appKey="kyc" />,
  '/apps/services': () => <AppControlPage appKey="services" />,
  '/packages': () => <PackagesPage />,
  '/support': () => <SupportPage />,
  '/security': () => <SecurityPage />,
};

function AdminGate() {
  const { t } = useI18n();
  const { status } = useAuth();
  const path = usePathname();

  useEffect(() => {
    if (status === 'admin' && (path === '/' || path === '/login' || !(path in PROTECTED_ROUTES))) {
      navigate('/dashboard', { replace: true });
    }
  }, [status, path]);

  if (path === '/reset-password') return <ResetPasswordPage />;
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-sm text-slate-600">
        <Spinner />
        <p>{t.common.loading}</p>
      </div>
    );
  }
  if (status === 'pending' || status === 'blocked' || status === 'unavailable') {
    return <AccessStatusPage status={status} />;
  }
  if (status !== 'admin') return path === '/login' ? <LoginPage /> : <PublicHomePage />;

  const render = PROTECTED_ROUTES[path] ?? PROTECTED_ROUTES['/dashboard'];
  return <AppShell path={path in PROTECTED_ROUTES ? path : '/dashboard'}>{render()}</AppShell>;
}

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <AdminGate />
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
