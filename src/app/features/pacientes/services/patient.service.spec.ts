import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PatientService } from './patient.service';
import { Patient, CreatePatientRequest } from '../models/patient.model';

const mockPatient: Patient = {
  id: 1, dni: '32456789', firstName: 'María', lastName: 'García',
  birthDate: '1991-03-15', gender: 'FEMALE', sexAtBirth: 'FEMALE',
  status: 'COMPLETE', contacts: [], addresses: [], coverages: [], active: true,
};

describe('PatientService', () => {
  let service: PatientService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PatientService],
    });
    service = TestBed.inject(PatientService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('search builds query params including q', () => {
    service.search({ q: 'gar', state: 'active', page: 0, size: 20 }).subscribe();
    const req = httpMock.expectOne(
      (r) =>
        r.url === '/api/v1/analitica/patients/search' &&
        r.params.get('state') === 'active' &&
        r.params.get('page') === '0' &&
        r.params.get('size') === '20' &&
        r.params.get('q') === 'gar',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });
  });

  it('search omits q when undefined', () => {
    service.search({ state: 'active', page: 0, size: 20 }).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/analitica/patients/search');
    expect(req.request.params.has('q')).toBe(false);
    req.flush({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });
  });

  it('getById hits /{id}', () => {
    service.getById(1).subscribe((p) => expect(p).toEqual(mockPatient));
    const req = httpMock.expectOne('/api/v1/analitica/patients/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockPatient);
  });

  it('existsByDni unwraps { exists }', () => {
    let result: boolean | undefined;
    service.existsByDni('32456789').subscribe((r) => (result = r));
    const req = httpMock.expectOne(
      (r) => r.url === '/api/v1/analitica/patients/exists' && r.params.get('dni') === '32456789',
    );
    req.flush({ exists: true });
    expect(result).toBe(true);
  });

  it('create POSTs body', () => {
    const body: CreatePatientRequest = {
      dni: '32456789', firstName: 'María', lastName: 'García',
      birthDate: '1991-03-15', gender: 'FEMALE', sexAtBirth: 'FEMALE',
      contacts: [], addresses: [], coverages: [],
    };
    service.create(body).subscribe();
    const req = httpMock.expectOne('/api/v1/analitica/patients');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(mockPatient);
  });

  it('update PUTs to /{id}', () => {
    service.update(1, {
      firstName: 'María', lastName: 'García', birthDate: '1991-03-15',
      gender: 'FEMALE', sexAtBirth: 'FEMALE', contacts: [], addresses: [], coverages: [],
    }).subscribe();
    const req = httpMock.expectOne('/api/v1/analitica/patients/1');
    expect(req.request.method).toBe('PUT');
    req.flush(mockPatient);
  });

  it('toggleActive PATCHes { deleted } to /{id}', () => {
    service.toggleActive(1, true).subscribe();
    const req = httpMock.expectOne('/api/v1/analitica/patients/1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ deleted: true });
    req.flush(null);
  });
});
