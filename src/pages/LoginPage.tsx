import { useState, type FormEvent } from 'react';
import { ArrowLeft, KeyRound, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Button, Field, Notice } from '@/components/ui';

const MIN_PASSWORD_LENGTH = 10;

type Mode = 'signin' | 'forgot' | 'signup';

export function LoginPage() {
  const { t } = useI18n();
  const { signIn, signUp, sendPasswordReset } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
    setPassword('');
    setConfirmPassword('');
  };

  const runAction = async (action: () => Promise<void>, onSuccess?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  };

  const handleSignIn = (event: FormEvent) => {
    event.preventDefault();
    void runAction(() => signIn(email.trim(), password));
  };

  const handleSignUp = (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t.passwordTooShort);
      return;
    }
    void runAction(() => signUp(email.trim(), password), () => {
      setPassword('');
      setConfirmPassword('');
      setInfo(t.accountCreated);
    });
  };

  const handleForgot = (event: FormEvent) => {
    event.preventDefault();
    void runAction(() => sendPasswordReset(email.trim()), () => setInfo(t.resetSent));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-teal-300 shadow-lg">
            <ShieldCheck className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t.appName}</h1>
          <p className="mt-2 text-sm text-slate-600">{t.privateAdmin}</p>
        </div>

        <div className="card-surface p-6 sm:p-8">
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="mt-1 space-y-5">
              <Field label={t.email}>
                <input
                  className="field-input"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label={t.password}>
                <input
                  className="field-input"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              {error && <Notice tone="rose">{error}</Notice>}
              <Button type="submit" loading={busy} className="w-full">
                {busy ? t.signingIn : t.signIn}
              </Button>
              <Button type="button" variant="secondary" onClick={() => switchMode('signup')} className="w-full">
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                {t.createAccount}
              </Button>
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="w-full rounded-lg py-2 text-sm font-medium text-teal-800 hover:underline"
              >
                {t.forgotPassword}
              </button>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="mt-1 space-y-5">
              <Field label={t.email}>
                <input
                  className="field-input"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label={t.password}>
                <input
                  className="field-input"
                  type="password"
                  autoComplete="new-password"
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
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </Field>
              {error && <Notice tone="rose">{error}</Notice>}
              {info && <Notice tone="emerald">{info}</Notice>}
              {!info && (
                <Button type="submit" loading={busy} className="w-full">
                  {busy ? t.creatingAccount : t.createAccount}
                </Button>
              )}
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-slate-700 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {t.haveAccount} {t.backToSignIn}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="mt-1 space-y-5">
              <Field label={t.email}>
                <input
                  className="field-input"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              {error && <Notice tone="rose">{error}</Notice>}
              {info && <Notice tone="emerald">{info}</Notice>}
              <Button type="submit" loading={busy} className="w-full">
                <Mail className="h-4 w-4" aria-hidden="true" />
                {t.sendResetLink}
              </Button>
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-slate-700 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {t.backToSignIn}
              </button>
            </form>
          )}
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
          {t.demoNotice}
        </p>
      </div>
    </div>
  );
}
