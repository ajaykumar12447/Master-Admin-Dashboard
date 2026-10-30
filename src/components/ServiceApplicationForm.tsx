import { useState, type FormEvent } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { ApplicationService, ApplicationType } from '@/lib/types';
import { Button, Field, Notice } from '@/components/ui';
import { ServiceDocumentFields, type DocumentSelection } from '@/components/ServiceDocumentFields';

const EMPTY_FORM = { name: '', mobile: '', email: '', city: '', state: '' };
const EMPTY_FILES: DocumentSelection = { identity: null, supporting: null };

const MOBILE_PATTERN = /^[6-9]\d{9}$/;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function ServiceApplicationForm({ service }: { service: ApplicationService }) {
  const { t } = useI18n();
  const [form, setForm] = useState(EMPTY_FORM);
  const [applicationType, setApplicationType] = useState<ApplicationType>('new');
  const [files, setFiles] = useState<DocumentSelection>(EMPTY_FILES);
  const [consent, setConsent] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ticketNo: string; uploadFailed: boolean } | null>(null);

  const update = (field: keyof typeof EMPTY_FORM) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const selectedFiles = [files.identity, files.supporting].filter((file): file is File => file !== null);
  const hasFiles = selectedFiles.length > 0;

  const validate = (): string | null => {
    if (form.name.trim().length < 2) return t.site.invalidName;
    if (!MOBILE_PATTERN.test(form.mobile.replace(/\s/g, ''))) return t.site.invalidMobile;
    if (form.email.trim() && (form.email.trim().length > 120 || !EMAIL_PATTERN.test(form.email.trim()))) {
      return t.site.invalidEmail;
    }
    if (form.city.trim().length < 2) return t.site.invalidCity;
    if (form.state.trim().length < 2) return t.site.invalidState;
    if (hasFiles && !consent) return t.site.docConsentRequired;
    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ticketNo = await adminApi.submitServiceApplication({
        service,
        applicationType,
        name: form.name.trim(),
        mobile: form.mobile.replace(/\s/g, ''),
        email: form.email.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        documentsConsent: hasFiles && consent,
      });
      let uploadFailed = false;
      for (const file of selectedFiles) {
        try {
          await adminApi.uploadServiceDocument(ticketNo, file);
        } catch {
          uploadFailed = true;
        }
      }
      setResult({ ticketNo, uploadFailed });
      setForm(EMPTY_FORM);
      setApplicationType('new');
      setFiles(EMPTY_FILES);
      setConsent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="animate-fade-up py-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" />
        <h3 className="mt-4 text-lg font-bold text-slate-900">{t.site.sentTitle}</h3>
        <p className="mt-2 text-sm text-slate-600">
          {t.site.applicationSentBody} <span className="font-mono font-semibold text-slate-900">{result.ticketNo}</span>
        </p>
        {result.uploadFailed && (
          <div className="mt-4 text-left">
            <Notice tone="rose">{t.site.docUploadPartial}</Notice>
          </div>
        )}
        <Button variant="secondary" className="mt-6" onClick={() => setResult(null)}>
          {t.site.sendAnother}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <Field label={t.site.applyType}>
        <select
          className="field-input"
          value={applicationType}
          onChange={(e) => setApplicationType(e.target.value as ApplicationType)}
        >
          <option value="new">{t.site.typeNew}</option>
          <option value="correction">{t.site.typeCorrection}</option>
        </select>
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t.site.name}>
          <input className="field-input" autoComplete="name" value={form.name} onChange={(e) => update('name')(e.target.value)} />
        </Field>
        <Field label={t.site.mobile}>
          <input
            className="field-input"
            inputMode="tel"
            autoComplete="tel"
            value={form.mobile}
            onChange={(e) => update('mobile')(e.target.value)}
          />
        </Field>
        <Field label={t.site.emailOptional}>
          <input
            className="field-input"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => update('email')(e.target.value)}
          />
        </Field>
        <Field label={t.site.city}>
          <input className="field-input" autoComplete="address-level2" value={form.city} onChange={(e) => update('city')(e.target.value)} />
        </Field>
        <Field label={t.site.state}>
          <input className="field-input" autoComplete="address-level1" value={form.state} onChange={(e) => update('state')(e.target.value)} />
        </Field>
      </div>
      <ServiceDocumentFields
        files={files}
        consent={consent}
        error={documentError}
        onFileChange={(slot, file) => setFiles((current) => ({ ...current, [slot]: file }))}
        onConsentChange={setConsent}
        onProblem={setDocumentError}
      />
      <p className="text-xs leading-relaxed text-slate-500">{t.site.applyNote}</p>
      {error && <Notice tone="rose">{error}</Notice>}
      <Button type="submit" loading={busy} disabled={busy} className="w-full sm:w-auto">
        <Send className="h-4 w-4" aria-hidden="true" />
        {busy ? t.site.submittingApplication : t.site.submitApplication}
      </Button>
    </form>
  );
}
