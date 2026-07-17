import { createAction, props } from '@ngrx/store';

export const submitTotemEntry = createAction(
  '[Totem] Submit Entry',
  props<{ dni: string; slug: string; branchId: number }>()
);

export const submitTotemEntrySuccess = createAction(
  '[Totem] Submit Entry Success',
  props<{ queueNumber: string; hasAppointment: boolean }>()
);

export const submitTotemEntryFailure = createAction(
  '[Totem] Submit Entry Failure',
  props<{ message: string }>()
);

export const resetTotemView = createAction('[Totem] Reset View');
