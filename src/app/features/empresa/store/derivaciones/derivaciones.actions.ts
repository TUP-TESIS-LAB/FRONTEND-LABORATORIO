import { createAction, props } from '@ngrx/store';

import { ExternalLab, ExternalLabRequest, ExternalLabState } from '../../models/external-lab.model';

// --- Page (intents desde la UI) ---------------------------------------------
export const enter = createAction('[Empresa Derivaciones Page] Enter');
export const setState = createAction(
  '[Empresa Derivaciones Page] Set State',
  props<{ state: ExternalLabState }>(),
);
export const create = createAction(
  '[Empresa Derivaciones Page] Create',
  props<{ req: ExternalLabRequest }>(),
);
export const update = createAction(
  '[Empresa Derivaciones Page] Update',
  props<{ id: number; req: ExternalLabRequest }>(),
);
export const toggle = createAction(
  '[Empresa Derivaciones Page] Toggle',
  props<{ id: number; deleted: boolean }>(),
);

// --- API (resultados) -------------------------------------------------------
export const loadSuccess = createAction(
  '[Empresa Derivaciones API] Load Success',
  props<{ labs: ExternalLab[] }>(),
);
export const loadFailure = createAction(
  '[Empresa Derivaciones API] Load Failure',
  props<{ error: string }>(),
);
export const mutateSuccess = createAction('[Empresa Derivaciones API] Mutate Success');
export const mutateFailure = createAction(
  '[Empresa Derivaciones API] Mutate Failure',
  props<{ error: string }>(),
);
