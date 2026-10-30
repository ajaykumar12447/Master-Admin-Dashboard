import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useLoader } from '@/lib/useLoader';
import { Notice, Spinner } from '@/components/ui';

export function ApplicationDocuments({ ticketNo }: { ticketNo: string }) {
  const { t } = useI18n();
  const { data: paths, error, loading } = useLoader(() => adminApi.listServiceDocuments(ticketNo));
  const [openingPath, setOpeningPath] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  const open = async (path: string) => {
    setOpeningPath(path);
    setOpenError(null);
    try {
      const url = await adminApi.serviceDocumentLink(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setOpenError(t.support.documentOpenError);
    } finally {
      setOpeningPath(null);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <Notice tone="rose">{t.support.documentsError}</Notice>;
  if (!paths || paths.length === 0) return <p className="text-sm text-slate-500">{t.support.documentsEmpty}</p>;

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {paths.map((path, index) => (
          <li key={path} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
            <span className="text-sm text-slate-800">
              {t.support.documentFile} {index + 1}
            </span>
            <button
              type="button"
              onClick={() => void open(path)}
              disabled={openingPath !== null}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 disabled:opacity-50"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              {openingPath === path ? t.support.documentOpening : t.support.documentOpen}
            </button>
          </li>
        ))}
      </ul>
      {openError && <Notice tone="rose">{openError}</Notice>}
    </div>
  );
}
