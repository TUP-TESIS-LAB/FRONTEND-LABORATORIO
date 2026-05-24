import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Observable, of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import { SucursalEffects } from './sucursal.effects';
import { SucursalService } from '../services/sucursal.service';
import * as A from './sucursal.actions';
import { Sucursal } from '../models/sucursal.model';

const mockSucursal: Sucursal = {
  id: 1,
  code: 'SUC-001',
  description: 'Sucursal Central',
  status: 'ACTIVE',
  address: null,
  responsibleUserId: null,
  active: true,
};

describe('SucursalEffects', () => {
  let actions$: Observable<Action>;
  let effects: SucursalEffects;
  let service: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    toggleStatus: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let messageService: { add: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    service = {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      toggleStatus: vi.fn(),
      delete: vi.fn(),
    };
    messageService = { add: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        SucursalEffects,
        provideMockActions(() => actions$),
        { provide: SucursalService, useValue: service },
        { provide: MessageService, useValue: messageService },
      ],
    });

    effects = TestBed.inject(SucursalEffects);
  });

  describe('load$', () => {
    it('success: dispatches loadSucursalesSuccess with page content', () => {
      return new Promise<void>((resolve) => {
        service.list.mockReturnValue(of({ content: [mockSucursal], totalElements: 1, totalPages: 1, page: 0, size: 20 }));
        actions$ = of(A.loadSucursales());

        effects.load$.subscribe((action) => {
          expect(action).toEqual(A.loadSucursalesSuccess({ list: [mockSucursal] }));
          resolve();
        });
      });
    });

    it('failure: dispatches loadSucursalesFailure on HTTP error', () => {
      return new Promise<void>((resolve) => {
        const error = new Error('Network error');
        service.list.mockReturnValue(throwError(() => error));
        actions$ = of(A.loadSucursales());

        effects.load$.subscribe((action) => {
          expect(action).toEqual(A.loadSucursalesFailure({ error }));
          resolve();
        });
      });
    });
  });

  describe('add$', () => {
    it('success: dispatches addSucursalSuccess with returned sucursal', () => {
      return new Promise<void>((resolve) => {
        service.create.mockReturnValue(of(mockSucursal));
        const input = { code: 'SUC-001', description: 'Sucursal Central', status: 'ACTIVE' as const };
        actions$ = of(A.addSucursal({ input }));

        effects.add$.subscribe((action) => {
          expect(action).toEqual(A.addSucursalSuccess({ sucursal: mockSucursal }));
          expect(service.create).toHaveBeenCalledWith(input);
          resolve();
        });
      });
    });
  });
});
