import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useLoader } from '@/lib/useLoader';
import { useI18n } from '@/lib/i18n';
import { formatDate, formatDateTime } from '@/lib/format';
import type { AccountStatus, AppUser } from '@/lib/types';
import { Button, Card, EmptyState, ErrorState, Modal, Notice, PageHeader, Spinner } from '@/components/ui';
import { StatusBadge } from '@/components/StatusBadge';

export function UsersPage() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const canManage = profile?.role === 'owner' || profile?.role === 'admin';
  const { data, error, loading, reload } = useLoader(adminApi.appUsers);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<AppUser | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((u) =>
      [u.user_code, u.full_name, u.email, u.mobile].some((value) => value.toLowerCase().includes(q)),
    );
  }, [data, query]);

  return (
    <>
      <PageHeader title={t.users.title} subtitle={t.users.subtitle} />
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          className="field-input min-h-[44px] pl-10"
          type="search"
          placeholder={t.users.search}
          aria-label={t.users.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {!canManage && <p className="mb-4 text-sm text-slate-500">{t.common.readOnly}</p>}
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data && (
        <Card className="overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState text={t.users.empty} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((user) => (
                <li key={user.id}>
                  <button
                    onClick={() => setSelected(user)}
                    className="flex w-full flex-col gap-2 px-4 py-4 text-left transition hover:bg-teal-50/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{user.full_name}</p>
                      <p className="font-mono text-xs text-slate-600">{user.user_code}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 sm:justify-end">
                      <span>{formatDate(user.user_id_issued_at)}</span>
                      <StatusBadge status={user.account_status} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {selected && (
        <UserDetail
          key={selected.id}
          user={selected}
          canManage={canManage}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function UserDetail({
  user,
  canManage,
  onClose,
  onChanged,
}: {
  user: AppUser;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);

  const changeStatus = async (status: AccountStatus) => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.setAccountStatus(user.id, status);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
      setBusy(false);
    }
  };

  const startReset = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.requestPasswordReset(user.id);
      setResetDone(true);
      setBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
      setBusy(false);
    }
  };

  const actions: { status: AccountStatus; label: string; variant: 'primary' | 'secondary' | 'danger' }[] = [
    { status: 'active', label: t.users.setActive, variant: 'primary' },
    { status: 'suspended', label: t.users.suspend, variant: 'secondary' },
    { status: 'deactivated', label: t.users.deactivate, variant: 'danger' },
  ];

  return (
    <Modal open title={t.users.detail} onClose={onClose}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <dt className="text-slate-500">{t.users.code}</dt>
        <dd className="font-mono text-slate-900">{user.user_code}</dd>
        <dt className="text-slate-500">{t.users.name}</dt>
        <dd className="text-slate-900">{user.full_name}</dd>
        <dt className="text-slate-500">{t.email}</dt>
        <dd className="break-all text-slate-900">{user.email}</dd>
        <dt className="text-slate-500">{t.users.contact}</dt>
        <dd className="text-slate-900">{user.mobile}</dd>
        <dt className="text-slate-500">{t.users.issued}</dt>
        <dd className="text-slate-900">{formatDate(user.user_id_issued_at)}</dd>
        <dt className="text-slate-500">{t.users.status}</dt>
        <dd><StatusBadge status={user.account_status} /></dd>
        {user.password_reset_requested_at && (
          <>
            <dt className="text-slate-500">{t.users.resetRequested}</dt>
            <dd className="text-slate-900">{formatDateTime(user.password_reset_requested_at)}</dd>
          </>
        )}
      </dl>

      {error && <div className="mt-4"><Notice tone="rose">{error}</Notice></div>}
      {resetDone && <div className="mt-4"><Notice tone="emerald">{t.users.resetDone}</Notice></div>}

      {canManage && (
        <div className="mt-6 space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {actions
              .filter((a) => a.status !== user.account_status)
              .map((a) => (
                <Button key={a.status} variant={a.variant} disabled={busy} onClick={() => void changeStatus(a.status)}>
                  {a.label}
                </Button>
              ))}
          </div>
          <Button variant="secondary" className="w-full" disabled={busy || resetDone} onClick={() => void startReset()}>
            {t.users.resetPassword}
          </Button>
        </div>
      )}
    </Modal>
  );
}
