export type ValidationOutcome = 'PASS' | 'WARNING' | 'FAIL';
export type ResultStatus = 'PENDING' | 'VALIDATING' | 'VALIDATED' | 'REJECTED' | 'SIGNED';
export type StudyStatus = 'PENDING' | 'PARTIALLY_SIGNED' | 'READY_FOR_SIGNATURE' | 'CLOSED';

export interface Study {
  id: number; protocolId: number; patientId: number;
  currentStatus: StudyStatus; expectedResultsCount: number; signedResultsCount: number;
}
export interface PostResult { id: number; studyId: number; analyticResultId: number; status: ResultStatus; sectionId: number; }
export interface DetValidation {
  id: number; resultId: number; determinationId: number;
  aggregateOutcome: ValidationOutcome | null; manualOutcome: ValidationOutcome | null;
}
export interface ResultWithValidation { result: PostResult; validations: { validation: DetValidation }[]; }

export interface ValidationRow { determinationId: number; name: string; aggregateOutcome: ValidationOutcome | null; manualOutcome: ValidationOutcome | null; }
export interface ValidationResultVM { resultId: number; status: ResultStatus; rows: ValidationRow[]; }
export interface ValidationView { protocolId: number; studyStatus: StudyStatus | null; results: ValidationResultVM[]; }

export interface BuildValidationViewInput {
  protocolId: number;
  study: Study | null;
  resultsWithValidation: ResultWithValidation[];
  nameByDeterminationId: Record<number, string>;
}

export function buildValidationView(input: BuildValidationViewInput): ValidationView {
  const { protocolId, study, resultsWithValidation, nameByDeterminationId } = input;
  const results: ValidationResultVM[] = resultsWithValidation.map(rwv => ({
    resultId: rwv.result.id,
    status: rwv.result.status,
    rows: rwv.validations.map(v => ({
      determinationId: v.validation.determinationId,
      name: nameByDeterminationId[v.validation.determinationId] ?? `#${v.validation.determinationId}`,
      aggregateOutcome: v.validation.aggregateOutcome,
      manualOutcome: v.validation.manualOutcome,
    })),
  }));
  return { protocolId, studyStatus: study?.currentStatus ?? null, results };
}
