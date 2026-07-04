import { HttpErrorResponse } from '@angular/common/http';
import { EligibleRecipients, EventConfig } from '../../models/notificaciones-config.model';

export interface NotifConfigState {
  eventConfigs: EventConfig[];
  /** Candidatos elegibles por evento, cacheados por eventType (poblar el picker de destinatarios). */
  eligibleByEventType: Record<string, EligibleRecipients>;
  /** Flag único compartido — en true mientras hay un `updateConfig` pesimista en curso. */
  saving: boolean;
  error: HttpErrorResponse | null;
}

export const initialNotifConfigState: NotifConfigState = {
  eventConfigs: [],
  eligibleByEventType: {},
  saving: false,
  error: null,
};

export const NOTIF_CONFIG_FEATURE_KEY = 'notifConfig';
