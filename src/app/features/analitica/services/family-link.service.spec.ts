import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { PatientGuardian } from '../models/patient-guardian.model';
import { FamilyLinkService } from './family-link.service';

const sampleGuardian = (over: Partial<PatientGuardian> = {}): PatientGuardian => ({
  userPatientId: 1,
  titularNombre: 'María García',
  titularDni: '22334455',
  bond: 'MADRE',
  status: 'CREATED',
  ...over,
});

describe('FamilyLinkService', () => {
  let http: { get: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> };
  let service: FamilyLinkService;

  beforeEach(() => {
    http = { get: vi.fn(), put: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        FamilyLinkService,
        { provide: HttpClient, useValue: http },
      ],
    });
    service = TestBed.inject(FamilyLinkService);
  });

  describe('getGuardians', () => {
    it('realiza GET al path correcto con el patientId', async () => {
      const guardians = [sampleGuardian()];
      http.get.mockReturnValue(of(guardians));

      const result = await firstValueFrom(service.getGuardians(42));

      expect(http.get).toHaveBeenCalledWith('/api/v1/user-patient/by-patient/42/guardians');
      expect(result).toEqual(guardians);
    });

    it('devuelve array vacío cuando el backend devuelve []', async () => {
      http.get.mockReturnValue(of([]));

      const result = await firstValueFrom(service.getGuardians(10));

      expect(result).toEqual([]);
    });
  });

  describe('verifyBond', () => {
    it('realiza PUT al path correcto con body { status: VERIFIED }', async () => {
      http.put.mockReturnValue(of({ userPatientId: 1, status: 'VERIFIED' }));

      await firstValueFrom(service.verifyBond(1, 'VERIFIED'));

      expect(http.put).toHaveBeenCalledWith(
        '/api/v1/user-patient/bonds/1/verify',
        { status: 'VERIFIED' },
      );
    });

    it('realiza PUT al path correcto con body { status: REJECTED }', async () => {
      http.put.mockReturnValue(of({ userPatientId: 5, status: 'REJECTED' }));

      await firstValueFrom(service.verifyBond(5, 'REJECTED'));

      expect(http.put).toHaveBeenCalledWith(
        '/api/v1/user-patient/bonds/5/verify',
        { status: 'REJECTED' },
      );
    });
  });
});
