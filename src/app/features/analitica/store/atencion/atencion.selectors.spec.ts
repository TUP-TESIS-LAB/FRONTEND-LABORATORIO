import { AttentionResponse, AttentionState } from '../../models/atencion.model';
import {
  selectAtencionKpis,
  selectFilteredAtenciones,
  selectTodayAtenciones,
  summarizeAtenciones,
} from './atencion.selectors';

/** ISO local (sin Z) a las 10:00 del día de `d`. */
function localIsoAt10(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T10:00:00`;
}
import { ATENCION_FEATURE_KEY, AtencionFeatureState, initialAtencionState } from './atencion.state';

function sample(over: Partial<AttentionResponse> = {}): AttentionResponse {
  return {
    id: over.id ?? 0,
    tenantId: 1,
    attentionNumber: over.attentionNumber ?? 'A-000',
    publicCode: null,
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
    extractionCancellationReason: null,
    cancelledAtState: null,
    attentionState: over.attentionState ?? AttentionState.REGISTERING_GENERAL_DATA,
    mostAdvancedState: over.attentionState ?? AttentionState.REGISTERING_GENERAL_DATA,
    analysisAuthorizations: [],
    copaymentAmount: null,
    patientFullName: over.patientFullName ?? null,
    patientDni: over.patientDni ?? null,
    createdAt: over.createdAt ?? null,
    updatedAt: over.updatedAt ?? null,
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

    it('orders by createdAt DESCENDING (most recent first); nulls last', () => {
      const list = [
        sample({ id: 1, createdAt: '2026-06-01T10:00:00Z' }),
        sample({ id: 2, createdAt: '2026-06-09T10:00:00Z' }),
        sample({ id: 3, createdAt: null }),
        sample({ id: 4, createdAt: '2026-06-05T10:00:00Z' }),
      ];
      expect(selectFilteredAtenciones(wrap({ list })).map(r => r.id)).toEqual([2, 4, 1, 3]);
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
      expect(result.map(r => r.id).sort()).toEqual([2, 3]);
    });

    it('search matches patient full name and DNI (case-insensitive), plus attentionNumber', () => {
      const list = [
        sample({ id: 10, attentionNumber: 'A-T010', patientFullName: 'Ada Lovelace', patientDni: '12345678' }),
        sample({ id: 20, attentionNumber: 'A-T020', patientFullName: 'Alan Turing', patientDni: '87654321' }),
      ];

      expect(selectFilteredAtenciones(wrap({ list, filters: { search: 'turing', states: [] } }))
        .map(r => r.id)).toEqual([20]);

      expect(selectFilteredAtenciones(wrap({ list, filters: { search: '12345678', states: [] } }))
        .map(r => r.id)).toEqual([10]);

      expect(selectFilteredAtenciones(wrap({ list, filters: { search: 'a-t020', states: [] } }))
        .map(r => r.id)).toEqual([20]);
    });

    it('state filter and search filter combine with AND semantics', () => {
      const list = [
        sample({ id: 1, patientFullName: 'Ada', attentionState: AttentionState.FINISHED }),
        sample({ id: 2, patientFullName: 'Bob', attentionState: AttentionState.FINISHED }),
        sample({ id: 3, patientFullName: 'Ada', attentionState: AttentionState.CANCELED }),
      ];
      const result = selectFilteredAtenciones(wrap({
        list,
        filters: { search: 'ada', states: [AttentionState.FINISHED] },
      }));
      expect(result.map(r => r.id)).toEqual([1]);
    });

    it('returns empty when search has no match', () => {
      const list = [sample({ id: 1, patientFullName: 'Ada' })];
      const result = selectFilteredAtenciones(wrap({
        list,
        filters: { search: 'nope', states: [] },
      }));
      expect(result).toEqual([]);
    });
  });

  describe('selectTodayAtenciones', () => {
    it('solo deja las atenciones creadas HOY (descarta días previos y sin fecha)', () => {
      const now = new Date();
      const ayer = new Date(now); ayer.setDate(now.getDate() - 1);
      const list = [
        sample({ id: 1, createdAt: localIsoAt10(now) }),   // hoy
        sample({ id: 2, createdAt: localIsoAt10(ayer) }),  // ayer
        sample({ id: 3, createdAt: null }),                // sin fecha
      ];
      expect(selectTodayAtenciones(wrap({ list })).map(r => r.id)).toEqual([1]);
    });
  });

  describe('summarizeAtenciones / selectAtencionKpis', () => {
    const NOW = new Date('2026-06-09T18:00:00');

    it('counts canceladasHoy (CANCELED + updatedAt today) and finalizadas', () => {
      const list = [
        sample({ id: 1, attentionState: AttentionState.CANCELED, updatedAt: '2026-06-09T09:00:00' }), // hoy
        sample({ id: 2, attentionState: AttentionState.CANCELED, updatedAt: '2026-06-08T23:00:00' }), // ayer
        sample({ id: 3, attentionState: AttentionState.CANCELED, updatedAt: null }),                  // sin fecha
        sample({ id: 4, attentionState: AttentionState.FINISHED }),
        sample({ id: 5, attentionState: AttentionState.FINISHED }),
        sample({ id: 6, attentionState: AttentionState.REGISTERING_ANALYSES }),
      ];
      const kpis = summarizeAtenciones(list, NOW);
      expect(kpis.canceladasHoy).toBe(1);
      expect(kpis.finalizadas).toBe(2);
    });

    it('returns all-zero KPIs for empty list', () => {
      expect(summarizeAtenciones([], NOW)).toEqual({ canceladasHoy: 0, finalizadas: 0 });
      expect(selectAtencionKpis(wrap({ list: [] }))).toEqual({ canceladasHoy: 0, finalizadas: 0 });
    });
  });
});
