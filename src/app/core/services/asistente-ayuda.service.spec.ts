import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AsistenteAyudaService } from './asistente-ayuda.service';

const STORAGE_KEY = 'asistente-conv';
const ENDPOINT = '/api/v1/asistente/preguntas';

describe('AsistenteAyudaService', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [AsistenteAyudaService, provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(AsistenteAyudaService);
    const httpMock = TestBed.inject(HttpTestingController);
    return { service, httpMock };
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('envía history (turnos previos) + question y agrega la respuesta del asistente', () => {
    const { service, httpMock } = setup();

    service.send('¿cómo saco un turno?');

    const req = httpMock.expectOne(ENDPOINT);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.question).toBe('¿cómo saco un turno?');
    expect(req.request.body.history).toEqual([]); // primera pregunta: sin historial

    req.flush({ answer: 'Entrá a Turnos y creá uno nuevo.' });

    const msgs = service.messages();
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toEqual({ role: 'user', content: '¿cómo saco un turno?' });
    expect(msgs[1]).toEqual({ role: 'assistant', content: 'Entrá a Turnos y creá uno nuevo.' });
    expect(service.loading()).toBe(false);
    httpMock.verify();
  });

  it('en la segunda pregunta manda el historial previo', () => {
    const { service, httpMock } = setup();

    service.send('primera');
    httpMock.expectOne(ENDPOINT).flush({ answer: 'respuesta 1' });

    service.send('segunda');
    const req = httpMock.expectOne(ENDPOINT);
    expect(req.request.body.history).toEqual([
      { role: 'user', content: 'primera' },
      { role: 'assistant', content: 'respuesta 1' },
    ]);
    expect(req.request.body.question).toBe('segunda');
    req.flush({ answer: 'respuesta 2' });
    httpMock.verify();
  });

  it('mapea errores a español sin filtrar internals del backend', () => {
    const { service, httpMock } = setup();

    service.send('hola');
    httpMock.expectOne(ENDPOINT).flush(
      { message: 'lab.laboratorio.Boom NullPointerException' },
      { status: 503, statusText: 'Service Unavailable' },
    );

    expect(service.error()).toBe('El asistente no está disponible en este momento. Intentá más tarde.');
    expect(service.error()).not.toContain('lab.laboratorio');
    expect(service.error()).not.toContain('NullPointerException');
    expect(service.loading()).toBe(false);
    httpMock.verify();
  });

  it('descarta la conversación persistida si venció el TTL de 24h', () => {
    const stale = {
      messages: [{ role: 'user', content: 'viejo' }],
      updatedAt: Date.now() - 25 * 60 * 60 * 1000,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stale));

    const { service } = setup();

    expect(service.messages()).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('restaura la conversación vigente (<24h)', () => {
    const fresh = {
      messages: [{ role: 'user', content: 'hola' }],
      updatedAt: Date.now() - 1000,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));

    const { service } = setup();

    expect(service.messages()).toEqual([{ role: 'user', content: 'hola' }]);
  });

  it('clear() vacía la conversación y su copia persistida', () => {
    const { service, httpMock } = setup();
    service.send('hola');
    httpMock.expectOne(ENDPOINT).flush({ answer: 'buenas' });
    expect(service.messages()).toHaveLength(2);

    service.clear();

    expect(service.messages()).toEqual([]);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.messages).toEqual([]);
    httpMock.verify();
  });
});
