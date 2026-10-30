import { useState, type FormEvent } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { TicketCategory } from '@/lib/types';
import { Button, Field, Notice } from '@/components/ui';

const CATEGORIES: TicketCategory[] = ['kyc_query', 'payment', 'technical', 'complaint', 'other'];

const EMPTY_FORM = { name: '', contact: '', category: 'kyc_query' as TicketCategory, subject: '', message: '' };

export function HelplineForm() {
  const { t } = useI18n();
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketNo, setTicketNo] = useState<string | null>(null);

  const update = (field: keyof typeof EMPTY_FORM) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const validate = (): string | null => {
    if (form.name.trim().length < 2) return t.site.invalidName;
    if (form.contact.trim().length < 5) return t.site.invalidContact;
    if (form.subject.trim().length < 3) return t.site.invalidSubject;
    if (form.message.trim().length < 10) return t.site.invalidMessage;
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
      const number = await adminApi.submitHelpline({
        name: form.name.trim(),
        contact: form.contact.trim(),
        category: form.category,
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      setTicketNo(number);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  };

  if (ticketNo) {
    return (
      <div className="animate-fade-up py-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" />
        <h3 className="mt-4 text-lg font-bold text-slate-900">{t.site.sentTitle}</h3>
        <p className="mt-2 text-sm text-slate-600">
          {t.site.sentBody} <span className="font-mono font-semibold text-slate-900">{ticketNo}</span>
        </p>
        <Button variant="secondary" className="mt-6" onClick={() => setTicketNo(null)}>
          {t.site.sendAnother}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t.site.name}>
          <input className="field-input" autoComplete="name" value={form.name} onChange={(e) => update('name')(e.target.value)} />
        </Field>
        <Field label={t.site.contact}>
          <input className="field-input" autoComplete="email" value={form.contact} onChange={(e) => update('contact')(e.target.value)} />
        </Field>
      </div>
      <Field label={t.site.category}>
        <select className="field-input" value={form.category} onChange={(e) => update('category')(e.target.value)}>
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {t.site.categories[item]}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.site.subject}>
        <input className="field-input" value={form.subject} onChange={(e) => update('subject')(e.target.value)} />
      </Field>
      <Field label={t.site.message}>
        <textarea
          className="field-input min-h-[120px]"
          rows={4}
          value={form.message}
          onChange={(e) => update('message')(e.target.value)}
        />
      </Field>
      {error && <Notice tone="rose">{error}</Notice>}
      <Button type="submit" loading={busy} disabled={busy} className="w-full sm:w-auto">
        <Send className="h-4 w-4" aria-hidden="true" />
        {busy ? t.site.sending : t.site.send}
      </Button>
    </form>
  );
}
