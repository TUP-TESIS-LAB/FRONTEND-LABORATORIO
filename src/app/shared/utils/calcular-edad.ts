/** Edad en años a partir de una fecha de nacimiento ISO (yyyy-MM-dd). null si no hay fecha. */
export function calcularEdad(birthDate: string | null, ref: Date = new Date()): number | null {
  if (!birthDate) return null;
  const nac = new Date(birthDate);
  if (Number.isNaN(nac.getTime())) return null;
  let edad = ref.getFullYear() - nac.getFullYear();
  const m = ref.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < nac.getDate())) edad--;
  return edad;
}
