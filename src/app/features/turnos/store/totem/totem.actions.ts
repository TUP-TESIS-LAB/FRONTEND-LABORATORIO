import { createAction, props } from '@ngrx/store';

export const submitTotemEntry = createAction(
  '[Totem] Submit Entry',
  props<{ dni: string; branchId: number }>()
);

export const submitTotemEntrySuccess = createAction(
  '[Totem] Submit Entry Success',
  props<{ queueNumber: string; patientFirstName: string | null; patientLastName: string | null }>()
);

export const submitTotemEntryFailure = createAction(
  '[Totem] Submit Entry Failure',
  props<{ reason: 'UNKNOWN' }>()
);

export const resetTotemView = createAction('[Totem] Reset View');
