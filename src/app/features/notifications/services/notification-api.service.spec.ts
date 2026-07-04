import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { POLLING_REQUEST } from '@core/refresh';
import { NotificationApiService } from './notification-api.service';
import { NotificationInbox } from '../models/notification.model';

describe('NotificationApiService', () => {
  let service: NotificationApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), NotificationApiService],
    });
    service = TestBed.inject(NotificationApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getInbox usa withPolling y pega a /api/v1/notifications', async () => {
    const mockInbox: NotificationInbox = { items: [], unreadCount: 0 };

    const result$ = firstValueFrom(service.getInbox());
    const req = httpMock.expectOne((r) => r.url === '/api/v1/notifications');

    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(POLLING_REQUEST)).toBe(true);

    req.flush(mockInbox);

    expect(await result$).toEqual(mockInbox);
  });

  it('markRead pega POST /{id}/read', async () => {
    const promise = firstValueFrom(service.markRead(5));
    const req = httpMock.expectOne({ method: 'POST', url: '/api/v1/notifications/5/read' });
    req.flush(null);
    await promise;
  });

  it('markAllRead pega POST /read-all', async () => {
    const promise = firstValueFrom(service.markAllRead());
    const req = httpMock.expectOne({ method: 'POST', url: '/api/v1/notifications/read-all' });
    req.flush(null);
    await promise;
  });
});
