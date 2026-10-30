export const DOCUMENT_BUCKET = 'service-documents';
export const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
};

export const DOCUMENT_ACCEPT = Object.keys(EXTENSIONS).join(',');

export type DocumentProblem = 'type' | 'size';

export function documentProblem(file: File): DocumentProblem | null {
  if (!(file.type in EXTENSIONS)) return 'type';
  if (file.size > MAX_DOCUMENT_BYTES) return 'size';
  return null;
}

export function documentPath(ticketNo: string, file: File): string {
  return `${ticketNo}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
}
