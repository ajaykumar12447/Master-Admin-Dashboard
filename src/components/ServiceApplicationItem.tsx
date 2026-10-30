import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import type { ServiceApplication } from '@/lib/types';
import { ApplicationDocuments } from '@/components/ApplicationDocuments';
import { StatusBadge } from '@/components/StatusBadge';

export function ServiceApplicationItem({ app }: { app: ServiceApplication }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="px-4 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">
            <span className="font-mono text-xs text-slate-500">{app.ticket_no}</span> · {t.support.serviceLabels[app.service]} · {t.support.applicationTypeLabels[app.application_type]}
          </p>
          <p className="text-sm text-slate-600">
            {app.applicant_name} · {t.support.mobile} {app.mobile} · {t.support.city} {app.city}, {app.state}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span className="whitespace-nowrap">{formatDateTime(app.created_at)}</span>
          <StatusBadge status={app.status} />
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {t.support.documentsButton}
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="animate-fade-up mt-4 rounded-xl bg-slate-50 p-4">
          <ApplicationDocuments ticketNo={app.ticket_no} />
        </div>
      )}
    </li>
  );
}
