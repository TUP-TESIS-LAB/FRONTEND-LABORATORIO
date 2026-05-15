import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/auth';

  resendEmailVerification(userId: number): Observable<void> {
    const params = new HttpParams().set('userId', userId);
    return this.http.post<void>(`${this.baseUrl}/email/resend`, null, { params });
  }

  generateFirstLoginToken(userId: number): Observable<string> {
    const params = new HttpParams().set('userId', userId);
    return this.http.post(`${this.baseUrl}/first-login/generate-token`, null, {
      params,
      responseType: 'text',
    });
  }
}
