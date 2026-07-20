import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PrintersListPage } from './printers-list.page';
import { SucursalService } from '@features/sucursales/services/sucursal.service';
import { selectPrinters, selectPrintersLoading, selectLastRegisteredToken } from '../../store/printer.selectors';
import * as A from '../../store/printer.actions';

describe('PrintersListPage', () => {
  let store: MockStore;
  let component: PrintersListPage;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PrintersListPage],
      providers: [
        provideMockStore({ selectors: [
          { selector: selectPrinters, value: [] },
          { selector: selectPrintersLoading, value: false },
          { selector: selectLastRegisteredToken, value: null },
        ] }),
        { provide: SucursalService, useValue: { list: () => of({ content: [] }) } },
        ConfirmationService,
        MessageService,
      ],
    });
    store = TestBed.inject(MockStore);
    component = TestBed.createComponent(PrintersListPage).componentInstance;
    vi.spyOn(store, 'dispatch');
  });

  it('dispatches addPrinter with the form values on submit', () => {
    component['form'].setValue({ name: 'Z1', branchId: 2, ipAddress: '10.0.0.1', port: 9100 });
    component.submit();
    expect(store.dispatch).toHaveBeenCalledWith(A.addPrinter({ input: { name: 'Z1', branchId: 2, ipAddress: '10.0.0.1', port: 9100 } }));
  });

  it('does not dispatch when the form is invalid', () => {
    component['form'].setValue({ name: '', branchId: null, ipAddress: 'nope', port: 9100 });
    component.submit();
    expect(store.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: A.addPrinter.type }));
  });

  it('clears the token when the token dialog closes', () => {
    component.onTokenDialogClose();
    expect(store.dispatch).toHaveBeenCalledWith(A.clearLastToken());
  });
});
