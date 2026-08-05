import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PRINTER_FEATURE_KEY, PrinterState } from './printer.state';

const selectFeature = createFeatureSelector<PrinterState>(PRINTER_FEATURE_KEY);
export const selectPrinters = createSelector(selectFeature, s => s.items);
export const selectPrintersLoading = createSelector(selectFeature, s => s.loading);
export const selectLastRegisteredToken = createSelector(selectFeature, s => s.lastRegisteredToken);
