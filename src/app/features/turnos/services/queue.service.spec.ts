import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { QueueService } from './queue.service';
import { QueueStatus } from '../models/queue-status.enum';

describe('QueueService — attendByAppointment', () => {
  let service: QueueService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(QueueService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // REGRESION (KAN-249): mismo bug que el walk-in, en el camino de los turnos programados.
  // "Atender" registraba el llamado y despues completaba la entry, pero la atencion recien se
  // crea en el paso 1 del wizard. En esa ventana el turno no estaba ni en la cola (COMPLETED)
  // ni tenia atencion que retomar — un back o un F5 lo destruian. La entry queda PENDING y la
  // completa el backend al crear la atencion.
  it('registra el llamado y NO completa la entry — si la atencion nunca se crea, sigue PENDING', async () => {
    const result$ = firstValueFrom(service.attendByAppointment(100));

    // El call se sigue registrando: incrementa callCount, sella lastCalledAt y refresca la TV.
    const call = httpMock.expectOne('/api/v1/turnos/queue/by-appointment/100/call');
    expect(call.request.method).toBe('POST');
    call.flush({ id: 50, lastCalledAt: '2026-07-16T10:00:00Z', callCount: 1, status: 'PENDING' });

    // Lo que NO tiene que pasar: el PATCH que completaba la entry antes de existir la atencion.
    // httpMock.verify() en el afterEach ademas falla si quedo cualquier request sin esperar.
    httpMock.expectNone('/api/v1/turnos/queue/50');

    const response = await result$;
    // El id del entry se sigue propagando: es el que viaja al wizard como queueEntryId.
    expect(response.id).toBe(50);
  });

  it('cancel sigue mandando el PATCH con CANCELED', async () => {
    const result$ = firstValueFrom(service.cancel(50));

    const req = httpMock.expectOne('/api/v1/turnos/queue/50');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ newStatus: QueueStatus.CANCELED });
    req.flush(null);

    await result$;
  });
});
