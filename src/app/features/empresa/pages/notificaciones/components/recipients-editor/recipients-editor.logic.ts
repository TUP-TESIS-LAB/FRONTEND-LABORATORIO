import { EligibleUser, Recipient } from '../../../../models/notificaciones-config.model';

/** Fila de usuario en el editor: si recibiría el evento con la config actual y si está bloqueado. */
export interface RecipientUserRow {
  id: number;
  nombre: string;
  /** true si el usuario recibiría el evento (por rol o como USER explícito, y no excluido). */
  receives: boolean;
  /** true si el usuario no tiene acceso a la pantalla del evento — opción bloqueada. */
  disabled: boolean;
}

export const roleCodesOf = (recipients: Recipient[]): string[] =>
  recipients.filter((r) => r.type === 'ROLE').map((r) => r.ref);

export const userRefsOf = (recipients: Recipient[]): string[] =>
  recipients.filter((r) => r.type === 'USER').map((r) => r.ref);

export const excludedRefsOf = (recipients: Recipient[]): string[] =>
  recipients.filter((r) => r.type === 'EXCLUDED_USER').map((r) => r.ref);

/** Reconstruye la lista de recipients en orden estable: roles, luego usuarios, luego exclusiones. */
export function buildRecipients(
  roleCodes: string[],
  userRefs: string[],
  excludedRefs: string[],
): Recipient[] {
  return [
    ...roleCodes.map((code): Recipient => ({ type: 'ROLE', ref: code })),
    ...userRefs.map((ref): Recipient => ({ type: 'USER', ref })),
    ...excludedRefs.map((ref): Recipient => ({ type: 'EXCLUDED_USER', ref })),
  ];
}

/**
 * Filtra los usuarios de la card B según los filtros activos:
 * - `roleCodes`: si hay roles agregados, sólo los usuarios que tienen alguno de esos roles.
 * - `branchId`: si hay sucursal, sólo los usuarios de esa sucursal.
 * - `search`: coincidencia parcial (case-insensitive) por nombre.
 * Sin filtros, devuelve todos.
 */
export function filterUsers(
  users: EligibleUser[],
  f: { roleCodes: string[]; branchId: number | null; search: string },
): EligibleUser[] {
  const term = f.search.trim().toLowerCase();
  return users.filter(
    (u) =>
      (f.roleCodes.length === 0 || u.roleCodes.some((c) => f.roleCodes.includes(c))) &&
      (f.branchId == null || u.branchId === f.branchId) &&
      (term === '' || u.nombre.toLowerCase().includes(term)),
  );
}

/**
 * Estado "recibe" de cada usuario elegible. `enteredByRole` es por-usuario: el usuario entra por rol
 * sólo si alguno de sus `roleCodes` está entre los roles agregados (no el hack global de KAN-185).
 */
export function deriveUserRows(recipients: Recipient[], eligibleUsers: EligibleUser[]): RecipientUserRow[] {
  const roles = roleCodesOf(recipients);
  const users = userRefsOf(recipients);
  const excluded = excludedRefsOf(recipients);
  return eligibleUsers.map((u) => {
    const idStr = String(u.id);
    const byRole = u.roleCodes.some((c) => roles.includes(c));
    const receives = (byRole || users.includes(idStr)) && !excluded.includes(idStr);
    return { id: u.id, nombre: u.nombre, receives, disabled: !u.tieneAcceso };
  });
}

/** Usuario que recibe efectivamente el evento con la config actual, con su origen (rol o puntual). */
export interface AssignedUser {
  id: number;
  nombre: string;
  /** true si entra por un rol agregado; false si es destinatario puntual (`USER`). */
  viaRole: boolean;
}

/**
 * Resuelve el set de quiénes reciben ahora = (⋃ usuarios de los roles agregados) − exclusiones +
 * usuarios puntuales. Computado en cliente con los `roleCodes` reales de cada usuario.
 */
export function resolveAssigned(recipients: Recipient[], eligibleUsers: EligibleUser[]): AssignedUser[] {
  const roles = roleCodesOf(recipients);
  const explicit = userRefsOf(recipients);
  const excluded = excludedRefsOf(recipients);
  return eligibleUsers
    .map((u): AssignedUser | null => {
      const idStr = String(u.id);
      if (excluded.includes(idStr)) return null;
      const byRole = u.roleCodes.some((c) => roles.includes(c));
      if (byRole) return { id: u.id, nombre: u.nombre, viaRole: true };
      if (explicit.includes(idStr)) return { id: u.id, nombre: u.nombre, viaRole: false };
      return null;
    })
    .filter((x): x is AssignedUser => x !== null);
}

/**
 * Cambia el set de roles. Agregar un rol precarga sus usuarios tildados (limpia las exclusiones
 * vigentes); quitar el último rol deja las exclusiones inertes, así que también se limpian.
 */
export function applyRolesChange(recipients: Recipient[], newCodes: string[]): Recipient[] {
  const previous = roleCodesOf(recipients);
  const added = newCodes.some((c) => !previous.includes(c));
  const excluded = added || newCodes.length === 0 ? [] : excludedRefsOf(recipients);
  return buildRecipients(newCodes, userRefsOf(recipients), excluded);
}

/**
 * Tilda/destilda un usuario. `enteredByRole` es por-usuario: el usuario entra por rol sólo si
 * alguno de sus `roleCodes` está entre los roles agregados.
 * - Tildar: quita la exclusión; si no entra por rol, lo agrega como destinatario puntual (USER).
 * - Destildar: quita el USER explícito; si entra por rol, lo agrega como excepción (EXCLUDED_USER).
 */
export function applyUserToggle(recipients: Recipient[], user: EligibleUser, checked: boolean): Recipient[] {
  const idStr = String(user.id);
  const roleCodes = roleCodesOf(recipients);
  const enteredByRole = user.roleCodes.some((c) => roleCodes.includes(c));
  let users = userRefsOf(recipients);
  let excluded = excludedRefsOf(recipients);

  if (checked) {
    excluded = excluded.filter((x) => x !== idStr);
    if (!enteredByRole && !users.includes(idStr)) {
      users = [...users, idStr];
    }
  } else {
    users = users.filter((x) => x !== idStr);
    if (enteredByRole && !excluded.includes(idStr)) {
      excluded = [...excluded, idStr];
    }
  }

  return buildRecipients(roleCodes, users, excluded);
}
