import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { NotificacionesConfigApiService } from './notificaciones-config-api.service';
import { EligibleRecipients, EventConfig, Recipient } from '../models/notificaciones-config.model';

describe('NotificacionesConfigApiService', () => {
  let service: NotificacionesConfigApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NotificacionesConfigApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotificacionesConfigApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getConfigs pega GET /api/v1/notification-configs', () => {
    const configs: EventConfig[] = [
      {
        eventType: 'HOME_VISIT_ASSIGNED',
        title: 'Nuevo turno a domicilio asignado',
        enabled: false,
        hasTrigger: false,
        recipients: [],
        section: 'DOMICILIO',
      },
    ];

    let result: EventConfig[] | undefined;
    service.getConfigs().subscribe((r) => (result = r));

    const req = http.expectOne('/api/v1/notification-configs');
    expect(req.request.method).toBe('GET');
    req.flush(configs);

    expect(result).toEqual(configs);
  });

  it('updateConfig pega PUT /api/v1/notification-configs/{eventType} con el body', () => {
    const recipients: Recipient[] = [{ type: 'ROLE', ref: 'ADMINISTRADOR' }];

    service.updateConfig('HOME_VISIT_ASSIGNED', { enabled: true, recipients }).subscribe();

    const req = http.expectOne({
      method: 'PUT',
      url: '/api/v1/notification-configs/HOME_VISIT_ASSIGNED',
    });
    expect(req.request.body).toEqual({ enabled: true, recipients });
    req.flush(null);
  });

  it('getEligible pega GET /api/v1/notification-configs/{eventType}/eligible', () => {
    const eligible: EligibleRecipients = {
      users: [{ id: 1, nombre: 'Ana Lopez', tieneAcceso: true }],
      roles: [{ code: 'ADMINISTRADOR', label: 'Administrador' }],
    };

    let result: EligibleRecipients | undefined;
    service.getEligible('URGENT_SLA_AT_RISK').subscribe((r) => (result = r));

    const req = http.expectOne('/api/v1/notification-configs/URGENT_SLA_AT_RISK/eligible');
    expect(req.request.method).toBe('GET');
    req.flush(eligible);

    expect(result).toEqual(eligible);
  });
});
