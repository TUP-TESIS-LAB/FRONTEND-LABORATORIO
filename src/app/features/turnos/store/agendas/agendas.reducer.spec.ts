import { describe, expect, it } from 'vitest';
import * as A from './agendas.actions';
import { agendasReducer } from './agendas.reducer';
import { initialAgendasState } from './agendas.state';
import { AgendaConfig } from '../../models/agenda-config.model';

const sampleAgenda: AgendaConfig = {
  id: 1,
  branchId: 7,
  tenantId: 1,
  startTime: '08:00',
  endTime: '12:00',
  slotDurationMinutes: 15,
  patientsPerSlot: 2,
  appointmentsCount: 0,
  isRecurring: true,
  validFromDate: '2026-06-01',
  validToDate: null,
  recurringDaysOfWeek: 'MONDAY,TUESDAY',
};

describe('agendasReducer', () => {
  it('loadAgendas marks pending + loadingBranch', () => {
    const next = agendasReducer(initialAgendasState, A.loadAgendas({ branchId: 7 }));
    expect(next.pending).toBe(true);
    expect(next.loadingBranch).toBe(7);
    expect(next.error).toBeNull();
  });

  it('loadAgendasSuccess stores configs under branchId', () => {
    const intermediate = agendasReducer(initialAgendasState, A.loadAgendas({ branchId: 7 }));
    const next = agendasReducer(
      intermediate,
      A.loadAgendasSuccess({ branchId: 7, configs: [sampleAgenda] })
    );
    expect(next.configsByBranch[7]).toEqual([sampleAgenda]);
    expect(next.pending).toBe(false);
    expect(next.loadingBranch).toBeNull();
  });

  it('loadAgendasFailure clears pending + stores error', () => {
    const intermediate = agendasReducer(initialAgendasState, A.loadAgendas({ branchId: 7 }));
    const next = agendasReducer(
      intermediate,
      A.loadAgendasFailure({ branchId: 7, error: { status: 503 } })
    );
    expect(next.pending).toBe(false);
    expect(next.loadingBranch).toBeNull();
    expect(next.error).toEqual({ status: 503 });
  });

  it('deleteAgendaSuccess removes the agenda from configsByBranch', () => {
    const stateWithData = agendasReducer(
      initialAgendasState,
      A.loadAgendasSuccess({ branchId: 7, configs: [sampleAgenda, { ...sampleAgenda, id: 2 }] })
    );
    const next = agendasReducer(stateWithData, A.deleteAgendaSuccess({ id: 1, branchId: 7 }));
    expect(next.configsByBranch[7]).toEqual([{ ...sampleAgenda, id: 2 }]);
  });

  it('createAgendaSuccess does not insert (effects trigger reload instead)', () => {
    const next = agendasReducer(
      initialAgendasState,
      A.createAgendaSuccess({ branchId: 7, id: 99 })
    );
    expect(next.configsByBranch[7]).toBeUndefined();
    expect(next.pending).toBe(false);
  });

  it('createAgenda / updateAgenda / deleteAgenda set pending=true', () => {
    expect(agendasReducer(initialAgendasState, A.createAgenda({ request: {} as any })).pending).toBe(true);
    expect(agendasReducer(initialAgendasState, A.updateAgenda({ id: 1, branchId: 7, request: {} as any })).pending).toBe(true);
    expect(agendasReducer(initialAgendasState, A.deleteAgenda({ id: 1, branchId: 7 })).pending).toBe(true);
  });
});
