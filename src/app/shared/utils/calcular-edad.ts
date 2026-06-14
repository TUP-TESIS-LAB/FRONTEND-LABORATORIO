/** Edad en años a partir de una fecha de nacimiento ISO (yyyy-MM-dd). null si no hay fecha. */
export function calcularEdad(birthDate: string | null, ref: Date = new Date()): number | null {
  if (!birthDate) return null;
  const [y, m, d] = birthDate.split('-').map(Number);
  if (!y || !m || !d) return null;
  const nac = new Date(y, m - 1, d);
  if (Number.isNaN(nac.getTime())) return null;
  let edad = ref.getFullYear() - nac.getFullYear();
  const diffMes = ref.getMonth() - nac.getMonth();
  if (diffMes < 0 || (diffMes === 0 && ref.getDate() < nac.getDate())) edad--;
  return edad;
}
