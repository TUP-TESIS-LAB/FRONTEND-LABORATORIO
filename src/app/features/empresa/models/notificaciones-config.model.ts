/**
 * Destinatario de un evento — matchea `RecipientDto` del backend.
 *
 * - `ROLE` (ref = code del rol): destinatario aditivo/dinámico; le llega a todos los que
 *   tengan el rol, incluidos los usuarios nuevos.
 * - `USER` (ref = userId): destinatario puntual, por fuera de cualquier rol.
 * - `EXCLUDED_USER` (ref = userId): excepción; excluye a esa persona del fan-out aunque
 *   entre por un `ROLE`. La exclusión gana incluso sobre un `USER` explícito del mismo id.
 */
export interface Recipient {
  type: 'USER' | 'ROLE' | 'EXCLUDED_USER';
  ref: string;
}

/**
 * Fila del catálogo de configuración de notificaciones (tab "Notificaciones" de Empresa)
 * — matchea `NotificationConfigResponse` del backend.
 */
export interface EventConfig {
  eventType: string;
  title: string;
  enabled: boolean;
  hasTrigger: boolean;
  recipients: Recipient[];
  /** Módulo/sección del evento (`requiredSection` del backend) — para la columna/filtro Módulo. */
  section: string;
}

/** Usuario candidato a destinatario — matchea `EligibleUserDto` del backend. */
export interface EligibleUser {
  id: number;
  nombre: string;
  tieneAcceso: boolean;
}

/** Rol candidato a destinatario — matchea `EligibleRoleDto` del backend. */
export interface EligibleRole {
  code: string;
  label: string;
}

/** Respuesta de `GET /{eventType}/eligible` — matchea `EligibleRecipientsResponse` del backend. */
export interface EligibleRecipients {
  users: EligibleUser[];
  roles: EligibleRole[];
}
