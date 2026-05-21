import { createReducer, on } from '@ngrx/store';
import * as A from './agendas.actions';
import { initialAgendasState } from './agendas.state';

export const agendasReducer = createReducer(
  initialAgendasState,

  on(A.loadAgendas, (s, { branchId }) => ({
    ...s, pending: true, loadingBranch: branchId, error: null,
  })),
  on(A.loadAgendasSuccess, (s, { branchId, configs }) => ({
    ...s,
    configsByBranch: { ...s.configsByBranch, [branchId]: configs },
    pending: false,
    loadingBranch: null,
    error: null,
  })),
  on(A.loadAgendasFailure, (s, { error }) => ({
    ...s, pending: false, loadingBranch: null, error,
  })),

  on(A.createAgenda, A.updateAgenda, A.deleteAgenda, (s) => ({
    ...s, pending: true, error: null,
  })),

  on(A.createAgendaSuccess, A.updateAgendaSuccess, (s) => ({
    ...s, pending: false, error: null,
  })),

  on(A.deleteAgendaSuccess, (s, { id, branchId }) => ({
    ...s,
    configsByBranch: {
      ...s.configsByBranch,
      [branchId]: (s.configsByBranch[branchId] ?? []).filter(a => a.id !== id),
    },
    pending: false,
    error: null,
  })),

  on(A.createAgendaFailure, A.updateAgendaFailure, A.deleteAgendaFailure, (s, { error }) => ({
    ...s, pending: false, error,
  })),
);
