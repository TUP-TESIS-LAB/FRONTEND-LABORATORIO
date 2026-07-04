/** Destinatario de un evento — matchea `RecipientDto` del backend. */
export interface Recipient {
  type: 'USER' | 'ROLE';
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
