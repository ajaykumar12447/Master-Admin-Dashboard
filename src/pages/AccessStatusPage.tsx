import { Clock, ShieldOff, TriangleAlert, LogOut } from 'lucide-react';
import { useAuth, type AuthStatus } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui';

type WaitingStatus = Extract<AuthStatus, 'pending' | 'blocked' | 'unavailable'>;

const VIEWS: Record<WaitingStatus, { icon: typeof Clock; tone: string; titleKey: 'pendingTitle' | 'blockedTitle' | 'unavailableTitle'; bodyKey: 'pendingBody' | 'blockedBody' | 'unavailableBody' }> = {
  pending: { icon: Clock, tone: 'bg-amber-100 text-amber-800', titleKey: 'pendingTitle', bodyKey: 'pendingBody' },
  blocked: { icon: ShieldOff, tone: 'bg-rose-100 text-rose-800', titleKey: 'blockedTitle', bodyKey: 'blockedBody' },
  unavailable: { icon: TriangleAlert, tone: 'bg-slate-200 text-slate-700', titleKey: 'unavailableTitle', bodyKey: 'unavailableBody' },
};

export function AccessStatusPage({ status }: { status: WaitingStatus }) {
  const { t } = useI18n();
  const { signOut } = useAuth();
  const view = VIEWS[status];
  const Icon = view.icon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="card-surface w-full max-w-md animate-fade-up p-6 text-center sm:p-8">
        <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${view.tone}`}>
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">{t.access[view.titleKey]}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{t.access[view.bodyKey]}</p>
        <Button variant="secondary" className="mt-6 w-full" onClick={() => void signOut()}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {t.signOut}
        </Button>
      </div>
    </div>
  );
}
