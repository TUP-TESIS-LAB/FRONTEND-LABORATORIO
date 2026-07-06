import { HttpErrorResponse } from '@angular/common/http';
import { notifConfigReducer } from './notificaciones-config.reducer';
import { initialNotifConfigState, NotifConfigState } from './notificaciones-config.state';
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

const eventConfig = (over: Partial<EventConfig> = {}): EventConfig => ({
  eventType: 'HOME_VISIT_ASSIGNED',
  title: 'Nuevo turno a domicilio asignado',
  enabled: false,
  hasTrigger: false,
  recipients: [],
  section: 'DOMICILIO',
  ...over,
});

describe('notifConfigReducer', () => {
  it('loadConfigsSuccess setea la lista y limpia el error', () => {
    const configs = [eventConfig()];
    const state = notifConfigReducer(
      { ...initialNotifConfigState, error: new HttpErrorResponse({ status: 500 }) },
      loadConfigsSuccess({ eventConfigs: configs }),
    );
    expect(state.eventConfigs).toEqual(configs);
    expect(state.error).toBeNull();
  });

  it('loadConfigsSuccess preserva section y recipients EXCLUDED_USER del response', () => {
    const configs = [
      eventConfig({
        section: 'FINANCIERO',
        recipients: [
          { type: 'ROLE', ref: 'EXTRACTOR' },
          { type: 'EXCLUDED_USER', ref: '11' },
        ],
      }),
    ];
    const state = notifConfigReducer(initialNotifConfigState, loadConfigsSuccess({ eventConfigs: configs }));
    expect(state.eventConfigs[0].section).toBe('FINANCIERO');
    expect(state.eventConfigs[0].recipients).toContainEqual({ type: 'EXCLUDED_USER', ref: '11' });
  });

  it('loadConfigsFailure guarda el error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const state = notifConfigReducer(initialNotifConfigState, loadConfigsFailure({ error }));
    expect(state.error).toBe(error);
  });

  it('loadConfigs no rompe el estado (no tiene payload)', () => {
    const state = notifConfigReducer(initialNotifConfigState, loadConfigs());
    expect(state.eventConfigs).toEqual([]);
  });

  it('updateConfig marca saving=true', () => {
    const state = notifConfigReducer(
      initialNotifConfigState,
      updateConfig({ eventType: 'HOME_VISIT_ASSIGNED', enabled: true, recipients: [] }),
    );
    expect(state.saving).toBe(true);
  });

  it('updateConfigSuccess limpia saving', () => {
    const state = notifConfigReducer(
      { ...initialNotifConfigState, saving: true },
      updateConfigSuccess(),
    );
    expect(state.saving).toBe(false);
  });

  it('updateConfigFailure limpia saving y guarda el error', () => {
    const error = new HttpErrorResponse({ status: 422 });
    const state = notifConfigReducer(
      { ...initialNotifConfigState, saving: true },
      updateConfigFailure({ error }),
    );
    expect(state.saving).toBe(false);
    expect(state.error).toBe(error);
  });

  it('loadEligibleSuccess cachea por eventType sin pisar otros eventos', () => {
    const eligibleA: EligibleRecipients = { users: [{ id: 1, nombre: 'Ana', tieneAcceso: true, roleCodes: [], branchId: null }], roles: [], branches: [] };
    const eligibleB: EligibleRecipients = { users: [], roles: [{ code: 'ADMINISTRADOR', label: 'Administrador' }], branches: [] };

    let state: NotifConfigState = notifConfigReducer(
      initialNotifConfigState,
      loadEligibleSuccess({ eventType: 'HOME_VISIT_ASSIGNED', eligible: eligibleA }),
    );
    state = notifConfigReducer(
      state,
      loadEligibleSuccess({ eventType: 'URGENT_SLA_AT_RISK', eligible: eligibleB }),
    );

    expect(state.eligibleByEventType['HOME_VISIT_ASSIGNED']).toEqual(eligibleA);
    expect(state.eligibleByEventType['URGENT_SLA_AT_RISK']).toEqual(eligibleB);
  });

  it('loadEligibleFailure guarda el error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const state = notifConfigReducer(initialNotifConfigState, loadEligibleFailure({ error }));
    expect(state.error).toBe(error);
  });

  it('loadEligible no rompe el estado (no tiene payload de resultado)', () => {
    const state = notifConfigReducer(
      initialNotifConfigState,
      loadEligible({ eventType: 'HOME_VISIT_ASSIGNED' }),
    );
    expect(state.eligibleByEventType).toEqual({});
  });
});
