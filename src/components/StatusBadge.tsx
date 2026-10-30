import { Badge } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

type Tone = 'teal' | 'amber' | 'rose' | 'sky' | 'emerald' | 'slate';

const toneFor: Record<string, Tone> = {
  submitted: 'sky',
  in_review: 'teal',
  completed: 'emerald',
  pending: 'amber',
  approved: 'emerald',
  rejected: 'rose',
  correction_requested: 'sky',
  active: 'emerald',
  suspended: 'amber',
  deactivated: 'rose',
  demo_paid: 'emerald',
  demo_unpaid: 'amber',
  expired: 'slate',
  cancelled: 'slate',
  open: 'sky',
  in_progress: 'teal',
  waiting_user: 'amber',
  resolved: 'emerald',
  closed: 'slate',
  info: 'sky',
  warning: 'amber',
  critical: 'rose',
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const label = (t.statuses as Record<string, string>)[status] ?? status;
  return <Badge tone={toneFor[status] ?? 'slate'}>{label}</Badge>;
}
