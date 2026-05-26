import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BranchContactService } from './branch-contact.service';

describe('BranchContactService', () => {
  let service: BranchContactService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BranchContactService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list calls GET on branches/{branchId}/contacts', () => {
    service.list(5).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/branches/5/contacts');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('create posts the input body', () => {
    const input = { contactType: 'PHONE' as const, value: '1234567890' };
    service.create(5, input).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/branches/5/contacts');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush({ id: 1, branchId: 5, ...input, active: true });
  });

  it('update sends PUT with body to contacts/{id}', () => {
    const input = { contactType: 'EMAIL' as const, value: 'test@lab.com' };
    service.update(5, 2, input).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/branches/5/contacts/2');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(input);
    req.flush({ id: 2, branchId: 5, ...input, active: true });
  });

  it('delete sends DELETE to contacts/{id}', () => {
    service.delete(5, 2).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/branches/5/contacts/2');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
