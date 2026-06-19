/**
 * Filtro compartido por los tabs del Nomenclador NBU (catálogo y precio particular).
 * Búsqueda por código / nombre / código NBU + filtro por familia (multi-select).
 */
export interface NbuFilterableRow {
  shortCode: string;
  name: string;
  nbuCode: string | null;
  familyName: string | null;
}

export function matchesFilter(
  row: NbuFilterableRow,
  search: string,
  families: readonly string[],
): boolean {
  const q = search.trim().toLowerCase();
  const okSearch =
    !q ||
    row.shortCode.toLowerCase().includes(q) ||
    row.name.toLowerCase().includes(q) ||
    (row.nbuCode?.toLowerCase().includes(q) ?? false);
  const okFamily =
    families.length === 0 || (row.familyName != null && families.includes(row.familyName));
  return okSearch && okFamily;
}
