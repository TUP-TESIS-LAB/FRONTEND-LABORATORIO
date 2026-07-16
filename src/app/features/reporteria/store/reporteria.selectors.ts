import { createFeatureSelector, createSelector } from '@ngrx/store';
import { REPORTERIA_FEATURE_KEY, ReporteriaState } from './reporteria.state';

export const selectReporteriaState = createFeatureSelector<ReporteriaState>(REPORTERIA_FEATURE_KEY);

export const selectReportId = createSelector(selectReporteriaState, (s) => s.reportId);
export const selectReportQuery = createSelector(selectReporteriaState, (s) => s.query);
export const selectReportContent = createSelector(selectReporteriaState, (s) => s.content);
export const selectReportTotalElements = createSelector(selectReporteriaState, (s) => s.totalElements);
export const selectReportLoading = createSelector(selectReporteriaState, (s) => s.loading);
export const selectReportError = createSelector(selectReporteriaState, (s) => s.error);
export const selectReportErrorStatus = createSelector(selectReporteriaState, (s) => s.errorStatus);
export const selectReportExporting = createSelector(selectReporteriaState, (s) => s.exporting);
export const selectReportExportError = createSelector(selectReporteriaState, (s) => s.exportError);
