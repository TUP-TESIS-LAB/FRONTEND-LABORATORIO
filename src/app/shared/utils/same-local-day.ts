/**
 * True si `iso` (timestamp ISO-8601) cae en el mismo año-mes-día LOCAL que `now`.
 *
 * Se usa para acotar las listas operativas "del día actual" (atenciones, cola de
 * extracción, cola de espera) sin arrastrar registros de días previos. Comparamos
 * en hora LOCAL del operador, que es el día que él ve en pantalla, no UTC.
 *
 * Devuelve false si la fecha es nula, vacía o no parseable.
 */
export function isSameLocalDay(iso: string | null | undefined, now: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}
