import { describe, it, expect } from 'vitest';
import {
  selectReportId, selectReportQuery, selectReportContent, selectReportTotalElements,
  selectReportLoading, selectReportError, selectReportExporting, selectReportExportError,
} from './reporteria.selectors';
import { REPORTERIA_FEATURE_KEY, initialReporteriaState } from './reporteria.state';

describe('reporteria selectors', () => {
  const state = {
    [REPORTERIA_FEATURE_KEY]: {
      ...initialReporteriaState,
      reportId: 'R-PAC-01',
      content: [{ id: 1 }],
      totalElements: 5,
      loading: true,
      error: 'x',
      exporting: true,
      exportError: 'y',
    },
  };

  it('lee cada slice del estado', () => {
    expect(selectReportId(state)).toBe('R-PAC-01');
    expect(selectReportQuery(state)).toEqual(initialReporteriaState.query);
    expect(selectReportContent(state)).toEqual([{ id: 1 }]);
    expect(selectReportTotalElements(state)).toBe(5);
    expect(selectReportLoading(state)).toBe(true);
    expect(selectReportError(state)).toBe('x');
    expect(selectReportExporting(state)).toBe(true);
    expect(selectReportExportError(state)).toBe('y');
  });
});
