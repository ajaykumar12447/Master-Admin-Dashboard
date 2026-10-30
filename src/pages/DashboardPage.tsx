import { useMemo } from 'react';
import { adminApi } from '@/lib/api';
import { useLoader } from '@/lib/useLoader';
import { useI18n } from '@/lib/i18n';
import { formatInr } from '@/lib/format';
import { Card, ErrorState, Notice, PageHeader, Spinner, StatCard } from '@/components/ui';

async function loadDashboard() {
  const [registrations, appUsers, packages, features, entitlements, tickets, alerts] = await Promise.all([
    adminApi.registrations(),
    adminApi.appUsers(),
    adminApi.packages(),
    adminApi.features(),
    adminApi.entitlements(),
    adminApi.tickets(),
    adminApi.alerts(),
  ]);
  return { registrations, appUsers, packages, features, entitlements, tickets, alerts };
}

export function DashboardPage() {
  const { t } = useI18n();
  const { data, error, loading, reload } = useLoader(loadDashboard);

  const stats = useMemo(() => {
    if (!data) return null;
    const issuedRequestIds = new Set(data.appUsers.map((u) => u.registration_request_id));
    const priceById = new Map<string, number>();
    data.packages.forEach((p) => priceById.set(p.id, p.price_inr));
    data.features.forEach((f) => priceById.set(f.id, f.price_inr));
    const paid = data.entitlements.filter((e) => e.payment_status === 'demo_paid');
    const collected = paid.reduce((sum, e) => sum + (priceById.get(e.package_id ?? e.feature_id ?? '') ?? 0), 0);
    return {
      totalUsers: data.appUsers.length,
      pendingRequests: data.registrations.filter((r) => r.review_status === 'pending').length,
      approved: data.registrations.filter((r) => r.review_status === 'approved').length,
      active: data.appUsers.filter((u) => u.account_status === 'active').length,
      suspended: data.appUsers.filter((u) => u.account_status === 'suspended').length,
      pendingIds: data.registrations.filter((r) => r.review_status === 'approved' && !issuedRequestIds.has(r.id)).length,
      paid: paid.length,
      unpaid: data.entitlements.length - paid.length,
      collected,
      openTickets: data.tickets.filter((x) => x.status !== 'resolved' && x.status !== 'closed').length,
      unresolvedAlerts: data.alerts.filter((a) => !a.is_resolved).length,
    };
  }, [data]);

  return (
    <>
      <PageHeader title={t.dashboard.title} subtitle={t.dashboard.subtitle} />

      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !stats && <Spinner />}

      {stats && (
        <div className="space-y-8">
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard label={t.dashboard.totalUsers} value={stats.totalUsers} />
            <StatCard label={t.dashboard.pendingRequests} value={stats.pendingRequests} />
            <StatCard label={t.dashboard.approved} value={stats.approved} />
            <StatCard label={t.dashboard.active} value={stats.active} />
            <StatCard label={t.dashboard.suspended} value={stats.suspended} />
            <StatCard label={t.dashboard.pendingIds} value={stats.pendingIds} />
          </section>

          <Notice tone="amber">{t.dashboard.issuanceNotice}</Notice>

          <section className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <h2 className="text-base font-semibold text-slate-900">{t.dashboard.paymentSummary}</h2>
              <dl className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs text-slate-500">{t.dashboard.demoCollected}</dt>
                  <dd className="mt-1 text-xl font-bold text-slate-900">{formatInr(stats.collected)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">{t.dashboard.paidEntries}</dt>
                  <dd className="mt-1 text-xl font-bold text-slate-900">{stats.paid}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">{t.dashboard.unpaidEntries}</dt>
                  <dd className="mt-1 text-xl font-bold text-slate-900">{stats.unpaid}</dd>
                </div>
              </dl>
            </Card>
            <Card className="p-5">
              <h2 className="text-base font-semibold text-slate-900">{t.dashboard.supportSummary}</h2>
              <dl className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs text-slate-500">{t.dashboard.openTickets}</dt>
                  <dd className="mt-1 text-xl font-bold text-slate-900">{stats.openTickets}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">{t.dashboard.unresolvedAlerts}</dt>
                  <dd className="mt-1 text-xl font-bold text-slate-900">{stats.unresolvedAlerts}</dd>
                </div>
              </dl>
            </Card>
          </section>
        </div>
      )}
    </>
  );
}
