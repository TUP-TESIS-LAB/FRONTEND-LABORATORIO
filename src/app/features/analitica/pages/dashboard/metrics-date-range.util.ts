/** ISO date (yyyy-MM-dd) de `d`, en horario local — evita corrimientos de timezone. */
function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Rango por defecto de los 3 tabs del dashboard de métricas: últimos 30 días, hoy incluido. */
export function defaultMetricDateRange(): { dateFrom: string; dateTo: string } {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
  return { dateFrom: toIsoDate(from), dateTo: toIsoDate(today) };
}
