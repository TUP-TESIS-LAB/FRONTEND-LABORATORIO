import { createAction, props } from '@ngrx/store';
import {
  AgendaConfig,
  CreateAgendaConfigRequest,
  UpdateAgendaConfigRequest,
} from '../../models/agenda-config.model';

export const loadAgendas = createAction(
  '[Agendas] Load',
  props<{ branchId: number }>()
);
export const loadAgendasSuccess = createAction(
  '[Agendas] Load Success',
  props<{ branchId: number; configs: AgendaConfig[] }>()
);
export const loadAgendasFailure = createAction(
  '[Agendas] Load Failure',
  props<{ branchId: number; error: unknown }>()
);

export const createAgenda = createAction(
  '[Agendas] Create',
  props<{ request: CreateAgendaConfigRequest }>()
);
export const createAgendaSuccess = createAction(
  '[Agendas] Create Success',
  props<{ branchId: number; id: number }>()
);
export const createAgendaFailure = createAction(
  '[Agendas] Create Failure',
  props<{ error: unknown }>()
);

export const updateAgenda = createAction(
  '[Agendas] Update',
  props<{ id: number; branchId: number; request: UpdateAgendaConfigRequest }>()
);
export const updateAgendaSuccess = createAction(
  '[Agendas] Update Success',
  props<{ id: number; branchId: number }>()
);
export const updateAgendaFailure = createAction(
  '[Agendas] Update Failure',
  props<{ error: unknown }>()
);

export const deleteAgenda = createAction(
  '[Agendas] Delete',
  props<{ id: number; branchId: number }>()
);
export const deleteAgendaSuccess = createAction(
  '[Agendas] Delete Success',
  props<{ id: number; branchId: number }>()
);
export const deleteAgendaFailure = createAction(
  '[Agendas] Delete Failure',
  props<{ error: unknown }>()
);
