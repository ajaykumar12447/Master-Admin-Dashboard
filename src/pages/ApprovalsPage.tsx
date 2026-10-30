import { useMemo, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useLoader } from '@/lib/useLoader';
import { useI18n } from '@/lib/i18n';
import { formatDate, formatDateTime } from '@/lib/format';
import type { AccessRequest } from '@/lib/types';
import { Button, Card, EmptyState, ErrorState, Field, Modal, Notice, PageHeader, Spinner } from '@/components/ui';
import { StatusBadge } from '@/components/StatusBadge';

type Tab = 'pending' | 'approved' | 'blocked';
type GrantableRole = 'admin' | 'support' | 'viewer';

const TABS: Tab[] = ['pending', 'approved', 'blocked'];

export function ApprovalsPage() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const canManage = profile?.role === 'owner' || profile?.role === 'admin';
  const { data, error, loading, reload } = useLoader(adminApi.accessRequests);
  const [tab, setTab] = useState<Tab>('pending');
  const [selected, setSelected] = useState<AccessRequest | null>(null);

  const counts = useMemo(() => {
    const result: Record<Tab, number> = { pending: 0, approved: 0, blocked: 0 };
    data?.forEach((request) => {
      result[request.status] += 1;
    });
    return result;
  }, [data]);

  const visible = useMemo(() => (data ?? []).filter((request) => request.status === tab), [data, tab]);

  if (!canManage) {
    return (
      <>
        <PageHeader title={t.access.title} subtitle={t.access.subtitle} />
        <Notice tone="amber">{t.access.managersOnly}</Notice>
      </>
    );
  }

  const tabLabel: Record<Tab, string> = {
    pending: t.access.tabPending,
    approved: t.access.tabApproved,
    blocked: t.access.tabBlocked,
  };

  return (
    <>
      <PageHeader title={t.access.title} subtitle={t.access.subtitle} />

      <div role="tablist" aria-label={t.access.title} className="mb-6 flex flex-wrap gap-2">
        {TABS.map((item) => {
          const active = tab === item;
          return (
            <button
              key={item}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item)}
              className={`flex min-h-[44px] items-center gap-2 rounded-lg px-4 text-sm font-semibold transition duration-200 ${
                active ? 'bg-teal-700 text-white shadow-sm' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tabLabel[item]}
              <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-700'}`}>
                {counts[item]}
              </span>
            </button>
          );
        })}
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data && (
        <Card className="overflow-hidden">
          {visible.length === 0 ? (
            <EmptyState text={t.access.empty} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {visible.map((request) => (
                <li key={request.user_id}>
                  <button
                    onClick={() => setSelected(request)}
                    className="flex w-full flex-col gap-2 px-4 py-4 text-left transition hover:bg-teal-50/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{request.email}</p>
                      <p className="text-xs text-slate-600">
                        {t.access.requested}: {formatDate(request.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={request.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {selected && (
        <AccessDetail
          key={selected.user_id}
          request={selected}
          isOwner={profile?.role === 'owner'}
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

function AccessDetail({
  request,
  isOwner,
  onClose,
  onChanged,
}: {
  request: AccessRequest;
  isOwner: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const [role, setRole] = useState<GrantableRole>('viewer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
      setBusy(false);
    }
  };

  const approve = () => run(() => adminApi.reviewAccessRequest(request.user_id, 'approved', role));
  const block = () => run(() => adminApi.reviewAccessRequest(request.user_id, 'blocked', null));

  const roleOptions: GrantableRole[] = isOwner ? ['admin', 'support', 'viewer'] : ['support', 'viewer'];

  return (
    <Modal open title={t.access.detail} onClose={onClose}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <dt className="text-slate-500">{t.email}</dt>
        <dd className="break-all text-slate-900">{request.email}</dd>
        <dt className="text-slate-500">{t.access.requested}</dt>
        <dd className="text-slate-900">{formatDateTime(request.created_at)}</dd>
        <dt className="text-slate-500">{t.users.status}</dt>
        <dd><StatusBadge status={request.status} /></dd>
        {request.decided_at && (
          <>
            <dt className="text-slate-500">{t.access.decided}</dt>
            <dd className="text-slate-900">{formatDateTime(request.decided_at)}</dd>
          </>
        )}
      </dl>

      {error && <div className="mt-4"><Notice tone="rose">{error}</Notice></div>}

      <div className="mt-6 space-y-4">
        {request.status !== 'approved' && (
          <>
            <Field label={t.access.grantRole}>
              <select
                className="field-input"
                value={role}
                onChange={(e) => setRole(e.target.value as GrantableRole)}
                disabled={busy}
              >
                {roleOptions.map((option) => (
                  <option key={option} value={option}>
                    {t.security.roleNames[option]}
                  </option>
                ))}
              </select>
            </Field>
            {!isOwner && <p className="text-xs text-slate-500">{t.access.ownerOnlyAdmin}</p>}
            <Button variant="primary" className="w-full" disabled={busy} onClick={() => void approve()}>
              {request.status === 'blocked' ? t.access.approveAgain : t.access.approve}
            </Button>
          </>
        )}
        {request.status !== 'blocked' && (
          <Button variant="danger" className="w-full" disabled={busy} onClick={() => void block()}>
            {t.access.block}
          </Button>
        )}
      </div>
    </Modal>
  );
}
