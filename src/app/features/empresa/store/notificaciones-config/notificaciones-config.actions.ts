import { HttpErrorResponse } from '@angular/common/http';
import { createAction, props } from '@ngrx/store';

import { EligibleRecipients, EventConfig, Recipient } from '../../models/notificaciones-config.model';

// --- Load configs (catálogo completo) ---------------------------------------
export const loadConfigs = createAction('[Notificaciones Config Page] Load Configs');
export const loadConfigsSuccess = createAction(
  '[Notificaciones Config API] Load Configs Success',
  props<{ eventConfigs: EventConfig[] }>(),
);
export const loadConfigsFailure = createAction(
  '[Notificaciones Config API] Load Configs Failure',
  props<{ error: HttpErrorResponse }>(),
);

// --- Update config (mutación pesimista) -------------------------------------
export const updateConfig = createAction(
  '[Notificaciones Config Page] Update Config',
  props<{ eventType: string; enabled: boolean; recipients: Recipient[] }>(),
);
export const updateConfigSuccess = createAction('[Notificaciones Config API] Update Config Success');
export const updateConfigFailure = createAction(
  '[Notificaciones Config API] Update Config Failure',
  props<{ error: HttpErrorResponse }>(),
);

// --- Load eligible recipients (picker por evento) ---------------------------
export const loadEligible = createAction(
  '[Notificaciones Config Page] Load Eligible',
  props<{ eventType: string }>(),
);
export const loadEligibleSuccess = createAction(
  '[Notificaciones Config API] Load Eligible Success',
  props<{ eventType: string; eligible: EligibleRecipients }>(),
);
export const loadEligibleFailure = createAction(
  '[Notificaciones Config API] Load Eligible Failure',
  props<{ error: HttpErrorResponse }>(),
);
