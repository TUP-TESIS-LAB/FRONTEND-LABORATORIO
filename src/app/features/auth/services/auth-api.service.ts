import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  LoginResponse,
  ResetPasswordRequest,
  ValidateTokenRequest,
} from '../models/auth.models';

const BASE = '/api/v1/auth';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  loginInternal(email: string, password: string): Promise<LoginResponse> {
    return firstValueFrom(
      this.http.post<LoginResponse>(`${BASE}/internal/login`, { email, password }),
    );
  }

  internalForgotPassword(email: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${BASE}/internal/password/forgot`, { email }),
    );
  }

  validateResetToken(token: string, tenantId: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${BASE}/password/validate-token`,
        { token } satisfies ValidateTokenRequest,
        { headers: new HttpHeaders({ 'X-Tenant-Id': tenantId }) },
      ),
    );
  }

  resetPassword(token: string, newPassword: string, tenantId: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${BASE}/password/reset`,
        { token, newPassword } satisfies ResetPasswordRequest,
        { headers: new HttpHeaders({ 'X-Tenant-Id': tenantId }) },
      ),
    );
  }

  setFirstLoginPassword(token: string, newPassword: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${BASE}/first-login/set-password-with-token`, { token, newPassword }),
    );
  }
}
