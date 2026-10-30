import { useEffect, useState, type FormEvent } from 'react';
import { adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useLoader } from '@/lib/useLoader';
import { useI18n } from '@/lib/i18n';
import { formatInr } from '@/lib/format';
import type { AppKey, Feature, IntegrationSetting } from '@/lib/types';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Notice, PageHeader, Spinner } from '@/components/ui';

async function loadPanel(appKey: AppKey) {
  const [features, integrations] = await Promise.all([adminApi.features(), adminApi.integrations()]);
  return {
    features: features.filter((f) => f.app_target === appKey),
    integration: integrations.find((i) => i.app_key === appKey) ?? null,
  };
}

export function AppControlPage({ appKey }: { appKey: AppKey }) {
  const { t } = useI18n();
  const { profile } = useAuth();
  const canManage = profile?.role === 'owner' || profile?.role === 'admin';
  const copy = appKey === 'kyc' ? t.apps.kyc : t.apps.services;
  const { data, error, loading, reload } = useLoader(() => loadPanel(appKey));

  return (
    <>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />
      {!canManage && <p className="mb-4 text-sm text-slate-500">{t.common.readOnly}</p>}
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data && (
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">{t.apps.features}</h2>
            {data.features.length === 0 ? (
              <EmptyState text={t.common.noAccess} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {data.features.map((feature) => (
                  <FeatureToggle key={feature.id} feature={feature} canManage={canManage} onChanged={reload} />
                ))}
              </div>
            )}
          </section>

          {data.integration && (
            <IntegrationForm
              key={data.integration.app_key}
              integration={data.integration}
              canManage={canManage}
              onSaved={reload}
            />
          )}
        </div>
      )}
    </>
  );
}

function FeatureToggle({ feature, canManage, onChanged }: { feature: Feature; canManage: boolean; onChanged: () => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.setFeatureEnabled(feature.id, !feature.is_enabled);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-900">{feature.name}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{feature.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="amber">{t.common.demo}</Badge>
            <Badge tone="slate">{t.apps.price}: {formatInr(feature.price_inr)}</Badge>
          </div>
        </div>
        <button
          role="switch"
          aria-checked={feature.is_enabled}
          aria-label={feature.name}
          disabled={!canManage || busy}
          onClick={() => void toggle()}
          className={`relative h-7 w-12 shrink-0 rounded-full transition duration-200 disabled:opacity-50 ${
            feature.is_enabled ? 'bg-teal-700' : 'bg-slate-300'
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition duration-200 ${
              feature.is_enabled ? 'left-6' : 'left-1'
            }`}
          />
        </button>
      </div>
      <p className="mt-3 text-xs font-medium text-slate-600">{feature.is_enabled ? t.apps.enabled : t.apps.disabled}</p>
      {error && <div className="mt-3"><Notice tone="rose">{error}</Notice></div>}
    </Card>
  );
}

function IntegrationForm({
  integration,
  canManage,
  onSaved,
}: {
  integration: IntegrationSetting;
  canManage: boolean;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [baseUrl, setBaseUrl] = useState(integration.base_url ?? '');
  const [notes, setNotes] = useState(integration.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = baseUrl.trim();
    if (trimmed && !trimmed.startsWith('https://')) {
      setError(t.apps.invalidUrl);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminApi.updateIntegration(integration.app_key, trimmed, notes);
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{t.apps.connection}</h2>
        <Badge tone={integration.connection_status === 'configured' ? 'emerald' : 'slate'}>
          {integration.connection_status === 'configured' ? t.apps.configured : t.apps.notConfigured}
        </Badge>
      </div>
      <Notice tone="amber">{t.apps.notice}</Notice>
      <form onSubmit={submit} className="mt-5 space-y-5">
        <Field label={t.apps.baseUrl}>
          <input
            className="field-input"
            type="url"
            placeholder="https://"
            value={baseUrl}
            disabled={!canManage}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </Field>
        <Field label={t.apps.notes}>
          <textarea
            className="field-input min-h-[80px]"
            value={notes}
            disabled={!canManage}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">{t.apps.secretNames}</p>
          <ul className="flex flex-wrap gap-2">
            {integration.secret_names.map((name) => (
              <li key={name}>
                <code className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">{name}</code>
              </li>
            ))}
          </ul>
        </div>
        {error && <Notice tone="rose">{error}</Notice>}
        {saved && <Notice tone="emerald">{t.apps.saved}</Notice>}
        {canManage && (
          <Button type="submit" loading={busy} className="w-full sm:w-auto">
            {t.apps.save}
          </Button>
        )}
      </form>
    </Card>
  );
}
