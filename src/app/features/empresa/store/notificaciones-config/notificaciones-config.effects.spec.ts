import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, firstValueFrom } from 'rxjs';

import { NotifConfigEffects } from './notificaciones-config.effects';
import { NotificacionesConfigApiService } from '../../services/notificaciones-config-api.service';
import {
  loadConfigs,
  loadConfigsSuccess,
  loadConfigsFailure,
  updateConfig,
  updateConfigSuccess,
  updateConfigFailure,
  loadEligible,
  loadEligibleSuccess,
  loadEligibleFailure,
} from './notificaciones-config.actions';
import { EventConfig, EligibleRecipients } from '../../models/notificaciones-config.model';

describe('NotifConfigEffects', () => {
  let actions$: Observable<Action>;
  let api: {
    getConfigs: ReturnType<typeof vi.fn>;
    updateConfig: ReturnType<typeof vi.fn>;
    getEligible: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = { getConfigs: vi.fn(), updateConfig: vi.fn(), getEligible: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        NotifConfigEffects,
        provideMockActions(() => actions$),
        { provide: NotificacionesConfigApiService, useValue: api },
      ],
    });
  });

  it('loadConfigs$ dispatches success', async () => {
    const eventConfigs: EventConfig[] = [
      { eventType: 'HOME_VISIT_ASSIGNED', title: 't', enabled: false, hasTrigger: false, recipients: [], section: 'DOMICILIO' },
    ];
    api.getConfigs.mockReturnValue(of(eventConfigs));
    actions$ = of(loadConfigs());
    const effects = TestBed.inject(NotifConfigEffects);

    const action = await firstValueFrom(effects.loadConfigs$);
    expect(action).toEqual(loadConfigsSuccess({ eventConfigs }));
  });

  it('loadConfigs$ dispatches failure', async () => {
    const error = new HttpErrorResponse({ status: 500 });
    api.getConfigs.mockReturnValue(throwError(() => error));
    actions$ = of(loadConfigs());
    const effects = TestBed.inject(NotifConfigEffects);

    const action = await firstValueFrom(effects.loadConfigs$);
    expect(action).toEqual(loadConfigsFailure({ error }));
  });

  it('updateConfig$ pega al service con concatMap y dispatches success', async () => {
    api.updateConfig.mockReturnValue(of(undefined));
    actions$ = of(updateConfig({ eventType: 'HOME_VISIT_ASSIGNED', enabled: true, recipients: [] }));
    const effects = TestBed.inject(NotifConfigEffects);

    const action = await firstValueFrom(effects.updateConfig$);
    expect(api.updateConfig).toHaveBeenCalledWith('HOME_VISIT_ASSIGNED', { enabled: true, recipients: [] });
    expect(action).toEqual(updateConfigSuccess());
  });

  it('updateConfig$ dispatches failure', async () => {
    const error = new HttpErrorResponse({ status: 422 });
    api.updateConfig.mockReturnValue(throwError(() => error));
    actions$ = of(updateConfig({ eventType: 'HOME_VISIT_ASSIGNED', enabled: true, recipients: [] }));
    const effects = TestBed.inject(NotifConfigEffects);

    const action = await firstValueFrom(effects.updateConfig$);
    expect(action).toEqual(updateConfigFailure({ error }));
  });

  it('reloadAfterUpdate$ re-dispara loadConfigs tras un updateConfigSuccess', async () => {
    actions$ = of(updateConfigSuccess());
    const effects = TestBed.inject(NotifConfigEffects);

    const action = await firstValueFrom(effects.reloadAfterUpdate$);
    expect(action).toEqual(loadConfigs());
  });

  it('loadEligible$ dispatches success', async () => {
    const eligible: EligibleRecipients = { users: [], roles: [], branches: [] };
    api.getEligible.mockReturnValue(of(eligible));
    actions$ = of(loadEligible({ eventType: 'URGENT_SLA_AT_RISK' }));
    const effects = TestBed.inject(NotifConfigEffects);

    const action = await firstValueFrom(effects.loadEligible$);
    expect(api.getEligible).toHaveBeenCalledWith('URGENT_SLA_AT_RISK');
    expect(action).toEqual(loadEligibleSuccess({ eventType: 'URGENT_SLA_AT_RISK', eligible }));
  });

  it('loadEligible$ dispatches failure', async () => {
    const error = new HttpErrorResponse({ status: 500 });
    api.getEligible.mockReturnValue(throwError(() => error));
    actions$ = of(loadEligible({ eventType: 'URGENT_SLA_AT_RISK' }));
    const effects = TestBed.inject(NotifConfigEffects);

    const action = await firstValueFrom(effects.loadEligible$);
    expect(action).toEqual(loadEligibleFailure({ error }));
  });
});
