import { adminApi } from '@/lib/api';
import { useLoader } from '@/lib/useLoader';
import { useI18n } from '@/lib/i18n';
import { formatInr } from '@/lib/format';
import { Badge, Card, EmptyState, ErrorState, Notice, PageHeader, Spinner } from '@/components/ui';
import { StatusBadge } from '@/components/StatusBadge';

async function loadPackages() {
  const [packages, features, entitlements, appUsers] = await Promise.all([
    adminApi.packages(),
    adminApi.features(),
    adminApi.entitlements(),
    adminApi.appUsers(),
  ]);
  const priceById = new Map<string, { name: string; price: number }>();
  packages.forEach((p) => priceById.set(p.id, { name: p.name, price: p.price_inr }));
  features.forEach((f) => priceById.set(f.id, { name: f.name, price: f.price_inr }));
  const codeById = new Map(appUsers.map((u) => [u.id, u.user_code]));
  return {
    packages,
    features,
    entitlements: entitlements.map((e) => {
      const item = priceById.get(e.package_id ?? e.feature_id ?? '');
      return {
        ...e,
        itemName: item?.name ?? '-',
        price: item?.price ?? 0,
        userCode: codeById.get(e.app_user_id) ?? '-',
      };
    }),
  };
}

export function PackagesPage() {
  const { t } = useI18n();
  const { data, error, loading, reload } = useLoader(loadPackages);

  return (
    <>
      <PageHeader title={t.packages.title} subtitle={t.packages.subtitle} />
      <Notice tone="amber">{t.packages.noRealPayments}</Notice>
      {error && <div className="mt-6"><ErrorState message={error} onRetry={reload} /></div>}
      {loading && !data && <div className="mt-6"><Spinner /></div>}
      {data && (
        <div className="mt-6 space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">{t.packages.packages}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {data.packages.map((p) => (
                <Card key={p.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{p.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{p.description}</p>
                    </div>
                    <Badge tone="amber">{t.common.demo}</Badge>
                  </div>
                  <p className="mt-4 text-2xl font-bold text-slate-900">{formatInr(p.price_inr)}</p>
                  <p className="mt-1 text-xs text-slate-500">{p.is_active ? t.statuses.active : t.statuses.cancelled}</p>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">{t.packages.features}</h2>
            <Card className="overflow-hidden">
              <ul className="divide-y divide-slate-100">
                {data.features.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="font-medium text-slate-900">{f.name}</span>
                    <span className="text-slate-700">{formatInr(f.price_inr)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">{t.packages.entitlements}</h2>
            <Card className="overflow-hidden">
              {data.entitlements.length === 0 ? (
                <EmptyState text={t.packages.empty} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">{t.packages.user}</th>
                        <th className="px-4 py-3">{t.packages.item}</th>
                        <th className="px-4 py-3">{t.packages.price}</th>
                        <th className="px-4 py-3">{t.packages.payment}</th>
                        <th className="px-4 py-3">{t.packages.packageStatus}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.entitlements.map((e) => (
                        <tr key={e.id}>
                          <td className="table-cell font-mono text-xs">{e.userCode}</td>
                          <td className="table-cell">{e.itemName}</td>
                          <td className="table-cell">{formatInr(e.price)}</td>
                          <td className="table-cell"><StatusBadge status={e.payment_status} /></td>
                          <td className="table-cell"><StatusBadge status={e.status} /></td>
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
