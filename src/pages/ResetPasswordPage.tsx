import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { Button, Field, Notice } from '@/components/ui';
import { Link } from '@/lib/router';
import { useAuth } from '@/lib/auth';

const MIN_PASSWORD_LENGTH = 10;

export function ResetPasswordPage() {
  const { t } = useI18n();
  const { updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasRecoverySession(data.session !== null));
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t.passwordTooShort);
      return;
    }
    if (password !== confirm) {
      setError(t.passwordMismatch);
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      await signOut();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="card-surface w-full max-w-md animate-fade-up p-6 sm:p-8">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-teal-300">
          <KeyRound className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">{t.setNewPassword}</h1>

        {done ? (
          <div className="mt-6 space-y-4">
            <Notice tone="emerald">{t.passwordUpdated}</Notice>
            <Link to="/login" className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800">
              {t.backToSignIn}
            </Link>
          </div>
        ) : hasRecoverySession === false ? (
          <div className="mt-6 space-y-4">
            <Notice tone="amber">{t.resetLinkMissing}</Notice>
            <Link to="/login" className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">
              {t.backToSignIn}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <Field label={t.newPassword}>
              <input
                className="field-input"
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Field label={t.confirmPassword}>
              <input
                className="field-input"
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
            {error && <Notice tone="rose">{error}</Notice>}
            <Button type="submit" loading={busy} className="w-full">
              {t.savePassword}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
