import { AttentionResponse, AttentionState } from '../../models/atencion.model';
import {
  selectAtencionKpis,
  selectFilteredAtenciones,
} from './atencion.selectors';
import { ATENCION_FEATURE_KEY, AtencionFeatureState, initialAtencionState } from './atencion.state';

function sample(over: Partial<AttentionResponse> = {}): AttentionResponse {
  return {
    id: over.id ?? 0,
    tenantId: 1,
    attentionNumber: over.attentionNumber ?? 'A-000',
    patientId: over.patientId ?? null,
    doctorId: null,
    branchId: 1,
    insurancePlanId: null,
    indications: null,
    paymentId: null,
    protocolId: null,
    extractorId: null,
    attentionBox: null,
    deskAttentionBox: null,
    prescriptionFileUrl: null,
    isUrgent: over.isUrgent ?? false,
    authorizationNumber: null,
    observations: null,
    cancellationReason: null,
    cancelledAtState: null,
    attentionState: over.attentionState ?? AttentionState.REGISTERING_GENERAL_DATA,
    mostAdvancedState: over.attentionState ?? AttentionState.REGISTERING_GENERAL_DATA,
    analysisAuthorizations: [],
    copaymentAmount: null,
    ...over,
  };
}

function wrap(over: Partial<AtencionFeatureState> = {}): { [ATENCION_FEATURE_KEY]: AtencionFeatureState } {
  return { [ATENCION_FEATURE_KEY]: { ...initialAtencionState, ...over } };
}

describe('atencion selectors', () => {
  describe('selectFilteredAtenciones', () => {
    it('returns the full list when there are no filters', () => {
      const list = [sample({ id: 1 }), sample({ id: 2 })];
      expect(selectFilteredAtenciones(wrap({ list }))).toEqual(list);
    });

    it('filters by state (multi-select)', () => {
      const list = [
        sample({ id: 1, attentionState: AttentionState.REGISTERING_GENERAL_DATA }),
        sample({ id: 2, attentionState: AttentionState.FINISHED }),
        sample({ id: 3, attentionState: AttentionState.CANCELED }),
      ];
      const result = selectFilteredAtenciones(wrap({
        list,
        filters: { search: '', states: [AttentionState.FINISHED, AttentionState.CANCELED] },
      }));
      expect(result.map(r => r.id)).toEqual([2, 3]);
    });

    it('search matches attentionNumber, patientId and id (case-insensitive)', () => {
      const list = [
        sample({ id: 10, attentionNumber: 'A-T010', patientId: 5555 }),
        sample({ id: 20, attentionNumber: 'A-T020', patientId: 6666 }),
      ];

      expect(selectFilteredAtenciones(wrap({ list, filters: { search: 'a-t020', states: [] } }))
        .map(r => r.id)).toEqual([20]);

      expect(selectFilteredAtenciones(wrap({ list, filters: { search: '5555', states: [] } }))
        .map(r => r.id)).toEqual([10]);

      expect(selectFilteredAtenciones(wrap({ list, filters: { search: '10', states: [] } }))
        .map(r => r.id)).toEqual([10]);
    });

    it('state filter and search filter combine with AND semantics', () => {
      const list = [
        sample({ id: 1, attentionNumber: 'A-001', attentionState: AttentionState.FINISHED }),
        sample({ id: 2, attentionNumber: 'A-002', attentionState: AttentionState.FINISHED }),
        sample({ id: 3, attentionNumber: 'A-001', attentionState: AttentionState.CANCELED }),
      ];
      const result = selectFilteredAtenciones(wrap({
        list,
        filters: { search: 'a-001', states: [AttentionState.FINISHED] },
      }));
      expect(result.map(r => r.id)).toEqual([1]);
    });

    it('returns empty when search has no match', () => {
      const list = [sample({ id: 1, attentionNumber: 'A-001' })];
      const result = selectFilteredAtenciones(wrap({
        list,
        filters: { search: 'nope', states: [] },
      }));
      expect(result).toEqual([]);
    });
  });

  describe('selectAtencionKpis', () => {
    it('counts total / pendientes / esperando-extracción / finalizadas / urgentes correctly', () => {
      const list = [
        sample({ id: 1,  attentionState: AttentionState.REGISTERING_GENERAL_DATA }),
        sample({ id: 2,  attentionState: AttentionState.REGISTERING_ANALYSES, isUrgent: true }),
        sample({ id: 3,  attentionState: AttentionState.AWAITING_EXTRACTION }),
        sample({ id: 4,  attentionState: AttentionState.AWAITING_EXTRACTION }),
        sample({ id: 5,  attentionState: AttentionState.FINISHED }),
        sample({ id: 6,  attentionState: AttentionState.CANCELED }),
        sample({ id: 7,  attentionState: AttentionState.FAILED }),
        sample({ id: 8,  attentionState: AttentionState.CANCELED, isUrgent: true }),
      ];
      const kpis = selectAtencionKpis(wrap({ list }));
      expect(kpis.total).toBe(8);
      expect(kpis.pendientes).toBe(4);          // not terminal: 1,2,3,4
      expect(kpis.esperandoExtraccion).toBe(2); // 3,4
      expect(kpis.finalizadas).toBe(1);         // 5
      expect(kpis.urgentes).toBe(1);            // 2 (urgente AND not terminal — 8 is canceled+urgent → excluded)
    });

    it('returns all-zero KPIs for empty list', () => {
      const kpis = selectAtencionKpis(wrap({ list: [] }));
      expect(kpis).toEqual({ total: 0, pendientes: 0, esperandoExtraccion: 0, finalizadas: 0, urgentes: 0 });
    });
  });
});
