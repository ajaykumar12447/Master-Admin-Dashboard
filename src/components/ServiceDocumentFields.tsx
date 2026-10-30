import { X, Paperclip } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { DOCUMENT_ACCEPT, MAX_DOCUMENT_BYTES, documentProblem } from '@/lib/serviceDocuments';

export type DocumentSlot = 'identity' | 'supporting';
export type DocumentSelection = Record<DocumentSlot, File | null>;

const SLOTS: DocumentSlot[] = ['identity', 'supporting'];

export function ServiceDocumentFields({
  files,
  consent,
  error,
  onFileChange,
  onConsentChange,
  onProblem,
}: {
  files: DocumentSelection;
  consent: boolean;
  error: string | null;
  onFileChange: (slot: DocumentSlot, file: File | null) => void;
  onConsentChange: (checked: boolean) => void;
  onProblem: (message: string | null) => void;
}) {
  const { t } = useI18n();
  const labels: Record<DocumentSlot, string> = { identity: t.site.docIdentity, supporting: t.site.docSupporting };
  const hasFiles = SLOTS.some((slot) => files[slot] !== null);

  const handleChange = (slot: DocumentSlot, file: File | null) => {
    if (!file) {
      onFileChange(slot, null);
      return;
    }
    const problem = documentProblem(file);
    if (problem === 'type') {
      onProblem(t.site.docTypeError);
      return;
    }
    if (problem === 'size') {
      onProblem(t.site.docSizeError);
      return;
    }
    onProblem(null);
    onFileChange(slot, file);
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div>
        <p className="text-sm font-semibold text-slate-900">{t.site.docsTitle}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          {t.site.docsBody} {Math.round(MAX_DOCUMENT_BYTES / (1024 * 1024))} MB.
        </p>
      </div>

      {SLOTS.map((slot) => {
        const file = files[slot];
        const inputId = `document-${slot}`;
        return (
          <div key={slot} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
              {labels[slot]}
            </label>
            {file ? (
              <div className="flex min-w-0 items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-800 ring-1 ring-slate-200">
                <Paperclip className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
                <span className="min-w-0 truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => handleChange(slot, null)}
                  aria-label={t.site.docRemove}
                  className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <input
                id={inputId}
                type="file"
                accept={DOCUMENT_ACCEPT}
                onChange={(e) => {
                  handleChange(slot, e.target.files?.[0] ?? null);
                  e.target.value = '';
                }}
                className="text-sm text-slate-600 file:mr-3 file:min-h-[40px] file:cursor-pointer file:rounded-lg file:border-0 file:bg-white file:px-4 file:text-sm file:font-semibold file:text-slate-800 file:ring-1 file:ring-slate-300 hover:file:bg-slate-100"
              />
            )}
          </div>
        );
      })}

      {hasFiles && (
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-700">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => onConsentChange(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
          />
          <span>{t.site.docConsent}</span>
        </label>
      )}
      {error && <p className="text-sm text-rose-700">{error}</p>}
    </div>
  );
}
