import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BranchScheduleService } from './branch-schedule.service';

describe('BranchScheduleService', () => {
  let service: BranchScheduleService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BranchScheduleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list calls GET on branches/{branchId}/schedules', () => {
    service.list(7).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/branches/7/schedules');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('create posts the input body', () => {
    const input = {
      dayFrom: 'MONDAY' as const,
      dayTo: 'FRIDAY' as const,
      fromTime: '09:00',
      toTime: '17:00',
      scheduleType: 'FULL_DAY' as const,
    };
    service.create(7, input).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/branches/7/schedules');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush({ id: 1, branchId: 7, ...input, active: true });
  });

  it('update sends PUT with body to schedules/{id}', () => {
    const input = {
      dayFrom: 'TUESDAY' as const,
      dayTo: 'SATURDAY' as const,
      fromTime: '08:00',
      toTime: '16:00',
      scheduleType: 'MORNING' as const,
    };
    service.update(7, 3, input).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/branches/7/schedules/3');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(input);
    req.flush({ id: 3, branchId: 7, ...input, active: true });
  });

  it('delete sends DELETE to schedules/{id}', () => {
    service.delete(7, 3).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/branches/7/schedules/3');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
