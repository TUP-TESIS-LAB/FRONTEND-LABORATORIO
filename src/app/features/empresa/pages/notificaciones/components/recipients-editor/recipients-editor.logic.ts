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
 * Estado "recibe" de cada usuario elegible. Como el endpoint `eligible` no discrimina usuarios
 * por rol, "entra por rol" = hay ≥1 rol agregado (todos los elegibles cuentan como del rol).
 */
export function deriveUserRows(recipients: Recipient[], eligibleUsers: EligibleUser[]): RecipientUserRow[] {
  const enteredByRole = roleCodesOf(recipients).length > 0;
  const users = userRefsOf(recipients);
  const excluded = excludedRefsOf(recipients);
  return eligibleUsers.map((u) => {
    const idStr = String(u.id);
    const receives = (enteredByRole || users.includes(idStr)) && !excluded.includes(idStr);
    return { id: u.id, nombre: u.nombre, receives, disabled: !u.tieneAcceso };
  });
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
 * Tilda/destilda un usuario:
 * - Tildar: quita la exclusión; si no entra por rol, lo agrega como destinatario puntual (USER).
 * - Destildar: quita el USER explícito; si entra por rol, lo agrega como excepción (EXCLUDED_USER).
 */
export function applyUserToggle(recipients: Recipient[], id: number, checked: boolean): Recipient[] {
  const idStr = String(id);
  const roleCodes = roleCodesOf(recipients);
  const enteredByRole = roleCodes.length > 0;
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
