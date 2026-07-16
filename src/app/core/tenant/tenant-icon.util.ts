import { MARK_ICON_BASE64 } from './mark-icon-base64';

/**
 * Único punto de la regla de ícono del tenant (mismo criterio que
 * FRONTEND-PORTAL): si subió un logo propio se usa ese, en todos lados
 * (sidebar, favicon). Si no, el default es el mismo en todos lados:
 * círculo con su color primario + silueta neutra del tubo de ensayo.
 */
export function resolveTenantIcon(logoUrl: string | null | undefined, primaryColor: string): string {
  return logoUrl && logoUrl.length > 0 ? logoUrl : buildDefaultTenantIcon(primaryColor);
}

export function buildDefaultTenantIcon(color: string): string {
  // La imagen va embebida en base64 (no como referencia a un asset suelto):
  // como SVG data-URI usado de favicon, varios navegadores no resuelven
  // sub-recursos externos, y el logo queda invisible detrás del círculo.
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">` +
    `<circle cx="256" cy="256" r="256" fill="${color}"/>` +
    `<image href="data:image/png;base64,${MARK_ICON_BASE64}" width="512" height="512"/>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function mimeTypeForIcon(url: string): string {
  if (url.startsWith('data:image/svg+xml')) return 'image/svg+xml';
  if (url.startsWith('data:image/png')) return 'image/png';
  return url.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
}
