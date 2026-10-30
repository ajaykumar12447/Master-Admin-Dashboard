import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useLoader } from '@/lib/useLoader';
import { useI18n } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import type { AppUser, Registration, ReviewStatus } from '@/lib/types';
import { Button, Card, EmptyState, ErrorState, Field, Modal, Notice, PageHeader, Spinner } from '@/components/ui';
import { StatusBadge } from '@/components/StatusBadge';

type Decision = Exclude<ReviewStatus, 'pending'>;

async function loadRegistrations() {
  const [registrations, appUsers] = await Promise.all([adminApi.registrations(), adminApi.appUsers()]);
  return { registrations, appUsers };
}

export function RegistrationsPage() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const canManage = profile?.role === 'owner' || profile?.role === 'admin';
  const { data, error, loading, reload } = useLoader(loadRegistrations);
  const [selected, setSelected] = useState<Registration | null>(null);

  const issuedFor = (req: Registration, users: AppUser[]) => users.find((u) => u.registration_request_id === req.id) ?? null;

  return (
    <>
      <PageHeader title={t.registrations.title} subtitle={t.registrations.subtitle} />
      <Notice tone="amber">{t.registrations.issuanceNotice}</Notice>
      <div className="mt-6">
        {!canManage && <p className="mb-4 text-sm text-slate-500">{t.common.readOnly}</p>}
        {error && <ErrorState message={error} onRetry={reload} />}
        {loading && !data && <Spinner />}
        {data && (
          <Card className="overflow-hidden">
            {data.registrations.length === 0 ? (
              <EmptyState text={t.registrations.empty} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">{t.registrations.name}</th>
                      <th className="px-4 py-3">{t.registrations.submitted}</th>
                      <th className="px-4 py-3">{t.registrations.status}</th>
                      <th className="px-4 py-3">{t.registrations.userId}</th>
                      <th className="px-4 py-3"><span className="sr-only">{t.registrations.detail}</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.registrations.map((req) => {
                      const issued = issuedFor(req, data.appUsers);
                      return (
                        <tr key={req.id} className="transition hover:bg-teal-50/40">
                          <td className="table-cell font-medium text-slate-900">
                            {req.applicant_name}
                            <div className="text-xs font-normal text-slate-500">{req.city ?? '-'}</div>
                          </td>
                          <td className="table-cell">{formatDate(req.submitted_at)}</td>
                          <td className="table-cell"><StatusBadge status={req.review_status} /></td>
                          <td className="table-cell">
                            {issued ? (
                              <span className="font-mono text-xs">{issued.user_code}</span>
                            ) : req.review_status === 'approved' ? (
                              <span className="text-xs text-amber-800">{t.registrations.awaitingIssue}</span>
                            ) : (
                              <span className="text-xs text-slate-500">{t.registrations.notIssued}</span>
                            )}
                          </td>
                          <td className="table-cell text-right">
                            <Button variant="secondary" className="min-h-[36px] py-1" onClick={() => setSelected(req)}>
                              {t.registrations.detail}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {selected && data && (
        <RegistrationDetail
          key={selected.id}
          request={selected}
          issued={issuedFor(selected, data.appUsers)}
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

function RegistrationDetail({
  request,
  issued,
  canManage,
  onClose,
  onChanged,
}: {
  request: Registration;
  issued: AppUser | null;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const isDecided = request.review_status !== 'pending';

  const decide = async (decision: Decision) => {
    if (decision !== 'approved' && !note.trim()) {
      setError(t.registrations.noteRequired);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminApi.reviewRegistration(request.id, decision, note);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
      setBusy(false);
    }
  };

  const issue = async () => {
    setBusy(true);
    setError(null);
    try {
      const code = await adminApi.issueUserId(request.id);
      setIssuedCode(code);
      setBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
      setBusy(false);
    }
  };

  return (
    <Modal open title={t.registrations.detail} onClose={onClose}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <dt className="text-slate-500">{t.registrations.name}</dt>
        <dd className="font-medium text-slate-900">{request.applicant_name}</dd>
        <dt className="text-slate-500">{t.email}</dt>
        <dd className="break-all text-slate-900">{request.email}</dd>
        <dt className="text-slate-500">{t.registrations.city}</dt>
        <dd className="text-slate-900">{request.city ?? '-'}</dd>
        <dt className="text-slate-500">{t.registrations.submitted}</dt>
        <dd className="text-slate-900">{formatDate(request.submitted_at)}</dd>
        <dt className="text-slate-500">{t.registrations.status}</dt>
        <dd><StatusBadge status={request.review_status} /></dd>
        <dt className="text-slate-500">{t.registrations.userId}</dt>
        <dd className="font-mono text-slate-900">{issued?.user_code ?? issuedCode ?? t.registrations.notIssued}</dd>
        {issued && (
          <>
            <dt className="text-slate-500">{t.registrations.issuedOn}</dt>
            <dd className="text-slate-900">{formatDate(issued.user_id_issued_at)}</dd>
          </>
        )}
      </dl>

      {request.review_note && (
        <div className="mt-4">
          <Notice tone="sky">{request.review_note}</Notice>
        </div>
      )}

      {error && <div className="mt-4"><Notice tone="rose">{error}</Notice></div>}

      {issuedCode && (
        <div className="mt-4">
          <Notice tone="emerald">{t.registrations.issued} {issuedCode}</Notice>
        </div>
      )}

      {canManage && !issued && !issuedCode && !isDecided && (
        <div className="mt-6 space-y-4">
          <Field label={t.registrations.noteLabel}>
            <textarea
              className="field-input min-h-[88px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
          </Field>
          <div className="grid gap-2 sm:grid-cols-3">
            <Button disabled={busy} onClick={() => void decide('approved')}>{t.registrations.approve}</Button>
            <Button variant="secondary" disabled={busy} onClick={() => void decide('correction_requested')}>
              {t.registrations.requestCorrection}
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => void decide('rejected')}>{t.registrations.reject}</Button>
          </div>
        </div>
      )}

      {canManage && request.review_status === 'approved' && !issued && !issuedCode && (
        <div className="mt-6 space-y-3">
          <Notice tone="amber">{t.registrations.issuanceNotice}</Notice>
          <Button className="w-full" loading={busy} onClick={() => void issue()}>{t.registrations.issueId}</Button>
        </div>
      )}
    </Modal>
  );
}
