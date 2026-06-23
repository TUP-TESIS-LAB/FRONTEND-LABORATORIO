import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PatientGuardian } from '../models/patient-guardian.model';

export interface RegisterGuardianBody {
  firstName: string;
  lastName: string;
  email: string;
  document: string;
  patientId: number;
  bond: string;
}

@Injectable({ providedIn: 'root' })
export class FamilyLinkService {
  private readonly http = inject(HttpClient);

  getGuardians(patientId: number): Observable<PatientGuardian[]> {
    return this.http.get<PatientGuardian[]>(`/api/v1/user-patient/by-patient/${patientId}/guardians`);
  }

  verifyBond(userPatientId: number, status: 'VERIFIED' | 'REJECTED'): Observable<unknown> {
    return this.http.put(`/api/v1/user-patient/bonds/${userPatientId}/verify`, { status });
  }

  registerGuardian(body: RegisterGuardianBody): Observable<unknown> {
    return this.http.post('/api/v1/user-patient/register-guardian', body);
  }
}
