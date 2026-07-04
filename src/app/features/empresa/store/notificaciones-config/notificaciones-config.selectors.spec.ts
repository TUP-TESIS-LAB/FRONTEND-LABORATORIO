import { selectEventConfigs, selectEligible, selectSaving } from './notificaciones-config.selectors';
import { NOTIF_CONFIG_FEATURE_KEY, NotifConfigState, initialNotifConfigState } from './notificaciones-config.state';
import { EligibleRecipients, EventConfig } from '../../models/notificaciones-config.model';

describe('notifConfig selectors', () => {
  const eventConfigs: EventConfig[] = [
    { eventType: 'HOME_VISIT_ASSIGNED', title: 't', enabled: true, hasTrigger: false, recipients: [] },
  ];
  const eligibleA: EligibleRecipients = { users: [{ id: 1, nombre: 'Ana', tieneAcceso: true }], roles: [] };

  const state: NotifConfigState = {
    ...initialNotifConfigState,
    eventConfigs,
    eligibleByEventType: { HOME_VISIT_ASSIGNED: eligibleA },
    saving: true,
  };

  const globalState = { [NOTIF_CONFIG_FEATURE_KEY]: state };

  it('selectEventConfigs devuelve la lista', () => {
    expect(selectEventConfigs.projector(state)).toEqual(eventConfigs);
  });

  it('selectSaving devuelve el flag', () => {
    expect(selectSaving.projector(state)).toBe(true);
  });

  it('selectEligible(eventType) devuelve el cache para ese evento', () => {
    expect(selectEligible('HOME_VISIT_ASSIGNED').projector(state)).toEqual(eligibleA);
  });

  it('selectEligible(eventType) devuelve undefined si no está cacheado', () => {
    expect(selectEligible('URGENT_SLA_AT_RISK').projector(state)).toBeUndefined();
  });

  it('los selectores leen del feature key registrado', () => {
    expect(selectEventConfigs(globalState)).toEqual(eventConfigs);
  });
});
