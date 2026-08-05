import { describe, it, expect } from 'vitest';
import { printerReducer } from './printer.reducer';
import { initialPrinterState } from './printer.state';
import * as A from './printer.actions';
import { RegisteredPrinter } from '../models/printer.model';

describe('printerReducer', () => {
  it('stores items on load success', () => {
    const s = printerReducer(initialPrinterState,
      A.loadPrintersSuccess({ items: [{ id: 1, name: 'Z1', branchId: 2, ipAddress: '10.0.0.1', port: 9100 }] }));
    expect(s.items).toHaveLength(1);
    expect(s.loading).toBe(false);
  });

  it('keeps the token from add success so the dialog can show it once', () => {
    const printer: RegisteredPrinter = { id: 1, name: 'Z1', branchId: 2, ipAddress: '10.0.0.1', port: 9100, printerToken: 'tok-abc' };
    const s = printerReducer(initialPrinterState, A.addPrinterSuccess({ printer }));
    expect(s.lastRegisteredToken).toBe('tok-abc');
    expect(s.items.map(p => p.id)).toContain(1);
  });

  it('clears the token so it cannot be shown again', () => {
    const withToken = { ...initialPrinterState, lastRegisteredToken: 'tok-abc' };
    const s = printerReducer(withToken, A.clearLastToken());
    expect(s.lastRegisteredToken).toBeNull();
  });

  it('removes a printer on delete success', () => {
    const withItem = { ...initialPrinterState, items: [{ id: 1, name: 'Z1', branchId: 2, ipAddress: '10.0.0.1', port: 9100 }] };
    const s = printerReducer(withItem, A.deletePrinterSuccess({ id: 1 }));
    expect(s.items).toHaveLength(0);
  });
});
