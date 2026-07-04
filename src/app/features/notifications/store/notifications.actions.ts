import { HttpErrorResponse } from '@angular/common/http';
import { createAction, props } from '@ngrx/store';
import { NotificationInbox } from '../models/notification.model';

// --- Load inbox (polling) ---------------------------------------------------
export const loadInbox = createAction('[Notifications] Load Inbox');
export const loadInboxSuccess = createAction(
  '[Notifications API] Load Success',
  props<{ inbox: NotificationInbox }>(),
);
export const loadInboxNotModified = createAction('[Notifications API] Load Not Modified');
export const loadInboxFailure = createAction(
  '[Notifications API] Load Failure',
  props<{ error: HttpErrorResponse }>(),
);

// --- Mutations ---------------------------------------------------------------
export const markRead = createAction('[Notifications] Mark Read', props<{ id: number }>());
export const markAllRead = createAction('[Notifications] Mark All Read');

/** Se dispara tras cualquier mutación (con éxito o no, es optimista) y re-dispara loadInbox. */
export const mutateSuccess = createAction('[Notifications API] Mutate Success');
