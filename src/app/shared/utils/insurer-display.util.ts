/**
 * Etiqueta "SIGLA — Nombre" para selects de obra social (KAN-246).
 * Si no hay sigla (no debería pasar — acronym es NOT NULL en el back), degrada
 * a mostrar solo el nombre en vez de dejar un " — " colgando.
 */
export function insurerDisplayLabel(insurer: { name: string; acronym?: string | null }): string {
  const acronym = insurer.acronym?.trim();
  return acronym ? `${acronym} — ${insurer.name}` : insurer.name;
}
