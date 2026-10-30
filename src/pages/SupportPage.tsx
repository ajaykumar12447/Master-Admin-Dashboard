import { useMemo, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useLoader } from '@/lib/useLoader';
import { useI18n } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import type { ServiceApplication, Ticket, TicketReply, TicketStatus } from '@/lib/types';
import { Button, Card, EmptyState, ErrorState, Field, Modal, Notice, PageHeader, Spinner } from '@/components/ui';
import { ServiceApplicationItem } from '@/components/ServiceApplicationItem';
import { StatusBadge } from '@/components/StatusBadge';

const STATUSES: TicketStatus[] = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'];

async function loadTickets() {
  const [tickets, replies, applications] = await Promise.all([
    adminApi.tickets(),
    adminApi.ticketReplies(),
    adminApi.serviceApplications(),
  ]);
  return { tickets, replies, applications };
}

export function SupportPage() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const canReply = profile?.role !== 'viewer' && profile !== null;
  const { data, error, loading, reload } = useLoader(loadTickets);
  const [selected, setSelected] = useState<Ticket | null>(null);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    data?.tickets.forEach((tk) => map.set(tk.status, (map.get(tk.status) ?? 0) + 1));
    return map;
  }, [data]);

  return (
    <>
      <PageHeader title={t.support.title} subtitle={t.support.subtitle} />
      {!canReply && <p className="mb-4 text-sm text-slate-500">{t.common.readOnly}</p>}
      <div className="mb-6 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <span key={s} className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
            <StatusBadge status={s} />
            {counts.get(s) ?? 0}
          </span>
        ))}
      </div>
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data && (
        <Card className="overflow-hidden">
          {data.tickets.length === 0 ? (
            <EmptyState text={t.support.empty} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.tickets.map((tk) => (
                <li key={tk.id}>
                  <button
                    onClick={() => setSelected(tk)}
                    className="flex w-full flex-col gap-2 px-4 py-4 text-left transition hover:bg-teal-50/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        <span className="font-mono text-xs text-slate-500">{tk.ticket_no}</span> · {tk.subject}
                      </p>
                      <p className="text-sm text-slate-600">
                        {tk.requester_name} · {t.support.categories[tk.category]}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <span className="whitespace-nowrap">{formatDateTime(tk.created_at)}</span>
                      <StatusBadge status={tk.status} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {data && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-slate-900">{t.support.applicationsTitle}</h2>
          <p className="mt-1 text-sm text-slate-600">{t.support.applicationsBody}</p>
          <Card className="mt-4 overflow-hidden">
            {data.applications.length === 0 ? (
              <EmptyState text={t.support.applicationsEmpty} />
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.applications.map((app: ServiceApplication) => (
                  <ServiceApplicationItem key={app.id} app={app} />
                ))}
              </ul>
            )}
          </Card>
        </section>
      )}

      {selected && data && (
        <TicketDetail
          key={selected.id}
          ticket={selected}
          replies={data.replies.filter((r: TicketReply) => r.ticket_id === selected.id)}
          canReply={canReply}
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

function TicketDetail({
  ticket,
  replies,
  canReply,
  onClose,
  onChanged,
}: {
  ticket: Ticket;
  replies: TicketReply[];
  canReply: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.replyToTicket(ticket.id, body, status);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
      setBusy(false);
    }
  };

  return (
    <Modal open title={`${ticket.ticket_no} · ${ticket.subject}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.support.original}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-800">{ticket.message}</p>
          <p className="mt-1 text-xs text-slate-500">{ticket.requester_name} · {formatDateTime(ticket.created_at)}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.support.conversation}</p>
          {replies.length === 0 ? (
            <p className="mt-1 text-sm text-slate-500">{t.support.noReplies}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {replies.map((r) => (
                <li key={r.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <p className="text-sm text-slate-800">{r.body}</p>
                  <p className="mt-1 text-xs text-slate-500">{r.author_name} · {formatDateTime(r.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {canReply && (
          <>
            <Field label={t.support.updateStatus}>
              <select className="field-input" value={status} onChange={(e) => setStatus(e.target.value as TicketStatus)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{t.statuses[s]}</option>
                ))}
              </select>
            </Field>
            <Field label={t.support.reply}>
              <textarea
                className="field-input min-h-[88px]"
                placeholder={t.support.replyPlaceholder}
                maxLength={1000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </Field>
            {error && <Notice tone="rose">{error}</Notice>}
            <Button className="w-full" loading={busy} onClick={() => void save()}>{t.support.send}</Button>
          </>
        )}
      </div>
    </Modal>
  );
}
