import { createReducer, on } from '@ngrx/store';
import { initialPrinterState } from './printer.state';
import * as A from './printer.actions';

export const printerReducer = createReducer(
  initialPrinterState,
  on(A.loadPrinters, s => ({ ...s, loading: true })),
  on(A.loadPrintersSuccess, (s, { items }) => ({ ...s, items, loading: false })),
  on(A.loadPrintersFailure, s => ({ ...s, loading: false })),
  on(A.addPrinterSuccess, (s, { printer }) => ({
    ...s,
    items: [...s.items, { id: printer.id, name: printer.name, branchId: printer.branchId, ipAddress: printer.ipAddress, port: printer.port }],
    lastRegisteredToken: printer.printerToken,
  })),
  on(A.clearLastToken, s => ({ ...s, lastRegisteredToken: null })),
  on(A.deletePrinterSuccess, (s, { id }) => ({ ...s, items: s.items.filter(p => p.id !== id) })),
);
