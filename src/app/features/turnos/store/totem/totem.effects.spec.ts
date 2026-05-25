import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Observable, of, throwError } from 'rxjs';
import { TotemEffects } from './totem.effects';
import { TotemService } from '../../pages/totem/services/totem.service';
import { submitTotemEntry, submitTotemEntrySuccess, submitTotemEntryFailure } from './totem.actions';

describe('TotemEffects.submitTotemEntry$', () => {
  let actions$: Observable<Action>;
  let effects: TotemEffects;
  let totemService: { lookupPatientByDni: ReturnType<typeof vi.fn>; registerQueueEntry: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    totemService = { lookupPatientByDni: vi.fn(), registerQueueEntry: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        TotemEffects,
        provideMockActions(() => actions$),
        { provide: TotemService, useValue: totemService },
      ],
    });
    effects = TestBed.inject(TotemEffects);
  });

  it('success: looks up patient by DNI, then registers queue entry', () => {
    return new Promise<void>((resolve) => {
      totemService.lookupPatientByDni.mockReturnValue(of({ id: 500, firstName: 'Lucia', lastName: 'Pérez', dni: '12345678' }));
      totemService.registerQueueEntry.mockReturnValue(of({ queueNumber: 'A-001', queueEntryId: 50 }));

      actions$ = of(submitTotemEntry({ dni: '12345678', branchId: 10 }));

      effects.submitTotemEntry$.subscribe(action => {
        expect(action).toEqual(submitTotemEntrySuccess({
          queueNumber: 'A-001',
          patientFirstName: 'Lucia',
          patientLastName: 'Pérez',
        }));
        expect(totemService.lookupPatientByDni).toHaveBeenCalledWith('12345678');
        expect(totemService.registerQueueEntry).toHaveBeenCalledWith({ nationalId: '12345678', patientId: 500, branchId: 10 });
        resolve();
      });
    });
  });

  it('failure on lookup 404: dispatches PATIENT_NOT_FOUND', () => {
    return new Promise<void>((resolve) => {
      totemService.lookupPatientByDni.mockReturnValue(throwError(() => ({ status: 404 })));
      actions$ = of(submitTotemEntry({ dni: '99999999', branchId: 10 }));

      effects.submitTotemEntry$.subscribe(action => {
        expect(action.type).toBe(submitTotemEntryFailure.type);
        expect((action as any).reason).toBe('PATIENT_NOT_FOUND');
        expect(totemService.registerQueueEntry).not.toHaveBeenCalled();
        resolve();
      });
    });
  });
});
