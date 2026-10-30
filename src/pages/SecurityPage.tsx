import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useLoader } from '@/lib/useLoader';
import { useI18n } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { Badge, Button, Card, EmptyState, ErrorState, Notice, PageHeader, Spinner } from '@/components/ui';
import { StatusBadge } from '@/components/StatusBadge';

async function loadSecurity() {
  const [alerts, audit, admins] = await Promise.all([adminApi.alerts(), adminApi.auditLogs(), adminApi.admins()]);
  return { alerts, audit, admins };
}

export function SecurityPage() {
  const { t } = useI18n();
  const { profile, sendPasswordReset } = useAuth();
  const canManage = profile?.role === 'owner' || profile?.role === 'admin';
  const { data, error, loading, reload } = useLoader(loadSecurity);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const resolve = async (id: string) => {
    setBusy(id);
    setActionError(null);
    try {
      await adminApi.resolveAlert(id);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(null);
    }
  };

  const requestOwnReset = async () => {
    if (!profile) return;
    setActionError(null);
    try {
      await sendPasswordReset(profile.email);
      setResetSent(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t.common.error);
    }
  };

  return (
    <>
      <PageHeader title={t.security.title} subtitle={t.security.subtitle} />
      {error && <ErrorState message={error} onRetry={reload} />}
      {actionError && <div className="mb-4"><Notice tone="rose">{actionError}</Notice></div>}
      {loading && !data && <Spinner />}
      {data && (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">{t.security.alerts}</h2>
            <Card className="overflow-hidden">
              {data.alerts.length === 0 ? (
                <EmptyState text={t.security.emptyAlerts} />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.alerts.map((a) => (
                    <li key={a.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={a.severity} />
                          {a.is_resolved && <Badge tone="emerald">{t.security.resolved}</Badge>}
                        </div>
                        <p className="mt-2 font-semibold text-slate-900">{a.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{a.body}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatDateTime(a.created_at)}</p>
                      </div>
                      {!a.is_resolved && canManage && (
                        <Button variant="secondary" className="min-h-[36px] py-1" loading={busy === a.id} onClick={() => void resolve(a.id)}>
                          {t.security.resolve}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">{t.security.roles}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-5">
                <p className="text-sm text-slate-600">{t.security.yourRole}</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {profile ? t.security.roleNames[profile.role] : '-'}
                </p>
                <p className="mt-2 text-sm text-slate-600">{profile && t.security.roleDescriptions[profile.role]}</p>
              </Card>
              <Card className="p-5">
                <p className="font-semibold text-slate-900">{t.security.passwordReset}</p>
                <p className="mt-1 text-sm text-slate-600">{t.security.passwordResetHelp}</p>
                <div className="mt-4 space-y-3">
                  {resetSent && <Notice tone="emerald">{t.resetSent}</Notice>}
                  <Button variant="secondary" disabled={resetSent} onClick={() => void requestOwnReset()}>
                    {t.security.sendLink}
                  </Button>
                </div>
              </Card>
            </div>
            <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
              {data.admins.map((admin) => (
                <li key={admin.user_id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="font-medium text-slate-900">{admin.display_name}</span>
                  <Badge tone="teal">{t.security.roleNames[admin.role]}</Badge>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">{t.security.audit}</h2>
            <Card className="overflow-hidden">
              {data.audit.length === 0 ? (
                <EmptyState text={t.security.emptyAudit} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">{t.security.when}</th>
                        <th className="px-4 py-3">{t.security.by}</th>
                        <th className="px-4 py-3">{t.security.action}</th>
                        <th className="px-4 py-3">{t.security.summary}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.audit.map((log) => (
                        <tr key={log.id}>
                          <td className="table-cell whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                          <td className="table-cell">{log.actor_name}</td>
                          <td className="table-cell font-mono text-xs">{log.action}</td>
                          <td className="table-cell">{log.summary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </section>
        </div>
      )}
    </>
  );
}
