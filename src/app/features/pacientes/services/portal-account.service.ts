import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PortalAccountService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/empresa/patients';

  createAccount(patientId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${patientId}/account`, {});
  }

  resendAccess(patientId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${patientId}/account/resend`, {});
  }
}
