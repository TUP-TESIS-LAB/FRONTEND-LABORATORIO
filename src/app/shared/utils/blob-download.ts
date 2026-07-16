import { HttpResponse } from '@angular/common/http';

/** Lee el nombre de archivo del Content-Disposition (o cae a un default) y descarga el blob. */
export function triggerDownload(res: HttpResponse<Blob>, fallbackFilename: string): void {
  const body = res.body;
  if (!body) throw new Error('empty body');
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const filename = filenameFromDisposition(disposition) ?? fallbackFilename;
  const url = URL.createObjectURL(body);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function filenameFromDisposition(disposition: string): string | null {
  // Soporta filename*=UTF-8''... y filename="...".
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(disposition);
  if (star?.[1]) return decodeURIComponent(star[1].replace(/['"]/g, '').trim());
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain?.[1]?.trim() ?? null;
}
