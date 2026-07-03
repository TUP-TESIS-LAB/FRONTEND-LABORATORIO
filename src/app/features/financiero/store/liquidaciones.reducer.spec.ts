import { describe, it, expect } from 'vitest';
import { financieroReducer } from './financiero.reducer';
import { initialFinancieroState } from './financiero.state';
import {
  loadSettlements, loadSettlementsSuccess, loadSettlementsNotModified, loadSettlementsFailure,
  loadSettlementSuccess, generateSettlement, generateSettlementFailure,
  cancelSettlementSuccess, loadInsurerPlansSuccess,
} from './financiero.actions';
import { SettlementSummary, SettlementDetail } from '../models/liquidaciones.model';

const summary: SettlementSummary = {
  settlementId: 1, insurerId: 7, settlementNumber: 100, status: 'PENDING', type: 'SIMPLE',
  periodFrom: '2026-01-01', periodTo: '2026-01-31', totalAmount: 48000,
};
const detail: SettlementDetail = {
  id: 1, insurerId: 7, settlementNumber: 100, status: 'PENDING', type: 'SIMPLE',
  periodFrom: '2026-01-01', periodTo: '2026-01-31',
  informedDate: null, informedAmount: null, paymentId: null, plans: [], createdAt: '2026-02-01T10:00:00',
};

describe('financieroReducer — slice liquidaciones', () => {
  it('loadSettlements prende listLoading y limpia error', () => {
    const s = financieroReducer(initialFinancieroState, loadSettlements({ filters: {} }));
    expect(s.liquidaciones.listLoading).toBe(true);
    expect(s.liquidaciones.listError).toBeNull();
  });

  it('loadSettlementsSuccess guarda la lista y apaga loading', () => {
    const s = financieroReducer(initialFinancieroState, loadSettlementsSuccess({ items: [summary] }));
    expect(s.liquidaciones.list).toEqual([summary]);
    expect(s.liquidaciones.listLoading).toBe(false);
  });

  it('loadSettlementsNotModified solo apaga loading sin tocar la lista', () => {
    const seeded = financieroReducer(initialFinancieroState, loadSettlementsSuccess({ items: [summary] }));
    const loading = financieroReducer(seeded, loadSettlements({ filters: {} }));
    const s = financieroReducer(loading, loadSettlementsNotModified());
    expect(s.liquidaciones.list).toEqual([summary]);
    expect(s.liquidaciones.listLoading).toBe(false);
  });

  it('loadSettlementsFailure guarda el error', () => {
    const s = financieroReducer(initialFinancieroState, loadSettlementsFailure({ error: 'boom' }));
    expect(s.liquidaciones.listError).toBe('boom');
    expect(s.liquidaciones.listLoading).toBe(false);
  });

  it('loadSettlementSuccess guarda el detalle seleccionado', () => {
    const s = financieroReducer(initialFinancieroState, loadSettlementSuccess({ settlement: detail }));
    expect(s.liquidaciones.selected).toEqual(detail);
    expect(s.liquidaciones.detailLoading).toBe(false);
  });

  it('generateSettlement prende generating; failure lo apaga y guarda error', () => {
    const gen = financieroReducer(initialFinancieroState, generateSettlement({ body: { insurerId: 7, period: { from: '2026-01-01', to: '2026-01-31' }, specialRules: [], excludedAnalysisIdsByPs: null } }));
    expect(gen.liquidaciones.generating).toBe(true);
    const fail = financieroReducer(gen, generateSettlementFailure({ error: 'sin pendientes' }));
    expect(fail.liquidaciones.generating).toBe(false);
    expect(fail.liquidaciones.generateError).toBe('sin pendientes');
  });

  it('cancelSettlementSuccess apaga lifecycleInProgress', () => {
    const s = financieroReducer(initialFinancieroState, cancelSettlementSuccess({ id: 1 }));
    expect(s.liquidaciones.lifecycleInProgress).toBe(false);
  });

  it('loadInsurerPlansSuccess guarda los planes (id + nombre + iva + arancel + convenio) de la OS elegida', () => {
    const plans = [
      { id: 3, name: 'Plan A', iva: 21, arancel: 1500, hasActiveAgreement: true },
      { id: 4, name: 'Plan B', iva: 0, arancel: 0, hasActiveAgreement: false },
    ];
    const s = financieroReducer(initialFinancieroState, loadInsurerPlansSuccess({ plans }));
    expect(s.liquidaciones.insurerPlans).toEqual(plans);
  });
});
