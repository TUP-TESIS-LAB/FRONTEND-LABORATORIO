import { describe, expect, it } from 'vitest';
import { buildValidationView } from './postanalitica.model';
import type { Study, ResultWithValidation } from './postanalitica.model';

const study: Study = { id: 7, protocolId: 9, patientId: 20002, currentStatus: 'PENDING', expectedResultsCount: 1, signedResultsCount: 0 };
const rwv: ResultWithValidation[] = [{
  result: { id: 1, studyId: 7, analyticResultId: 50, status: 'VALIDATING', sectionId: 80012 },
  validations: [
    { validation: { id: 100, resultId: 1, determinationId: 500, aggregateOutcome: 'PASS', manualOutcome: null } },
    { validation: { id: 101, resultId: 1, determinationId: 501, aggregateOutcome: 'WARNING', manualOutcome: 'PASS' } },
  ],
}];
const nameByDeterminationId = { 500: 'Colesterol Total', 501: 'Triglicéridos' };

describe('buildValidationView', () => {
  it('ensambla study + results + nombres', () => {
    const v = buildValidationView({ protocolId: 9, study, resultsWithValidation: rwv, nameByDeterminationId });
    expect(v.protocolId).toBe(9);
    expect(v.studyStatus).toBe('PENDING');
    expect(v.results).toHaveLength(1);
    expect(v.results[0].resultId).toBe(1);
    expect(v.results[0].status).toBe('VALIDATING');
    expect(v.results[0].rows[0]).toEqual({ determinationId: 500, name: 'Colesterol Total', aggregateOutcome: 'PASS', manualOutcome: null });
    expect(v.results[0].rows[1].manualOutcome).toBe('PASS');
  });

  it('study null → studyStatus null', () => {
    const v = buildValidationView({ protocolId: 9, study: null, resultsWithValidation: [], nameByDeterminationId: {} });
    expect(v.studyStatus).toBeNull();
    expect(v.results).toEqual([]);
  });

  it('nombre faltante → #id', () => {
    const v = buildValidationView({ protocolId: 9, study, resultsWithValidation: rwv, nameByDeterminationId: {} });
    expect(v.results[0].rows[0].name).toBe('#500');
  });
});
