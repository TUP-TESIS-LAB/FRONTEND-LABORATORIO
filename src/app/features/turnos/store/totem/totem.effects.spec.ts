import { describe, expect, it, vi } from 'vitest';
import { of, throwError, firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Observable } from 'rxjs';
import { TotemEffects } from './totem.effects';
import { TotemService } from '../../pages/totem/services/totem.service';
import * as A from './totem.actions';

describe('TotemEffects', () => {
  function setup(action: Action, serviceMock: Partial<TotemService>) {
    let actions$: Observable<Action>;
    TestBed.configureTestingModule({
      providers: [
        TotemEffects,
        provideMockActions(() => actions$),
        { provide: TotemService, useValue: serviceMock },
      ],
    });
    actions$ = of(action);
    return TestBed.inject(TotemEffects);
  }

  it('emits success on check-in', async () => {
    const svc = { checkIn: vi.fn().mockReturnValue(of({ queueNumber: 'ST-001', hasAppointment: false })) };
    const effects = setup(A.submitTotemEntry({ dni: '12345678', slug: 'lab-demo', branchId: 10 }), svc);
    const out = await firstValueFrom(effects.submitTotemEntry$);
    expect(out).toEqual(A.submitTotemEntrySuccess({ queueNumber: 'ST-001', hasAppointment: false }));
    expect(svc.checkIn).toHaveBeenCalledWith('lab-demo', 10, '12345678');
  });

  it('emits failure on error', async () => {
    const svc = { checkIn: vi.fn().mockReturnValue(throwError(() => new Error('x'))) };
    const effects = setup(A.submitTotemEntry({ dni: '12345678', slug: 'lab-demo', branchId: 10 }), svc);
    const out = await firstValueFrom(effects.submitTotemEntry$);
    expect(out).toEqual(A.submitTotemEntryFailure({ reason: 'UNKNOWN' }));
  });
});
