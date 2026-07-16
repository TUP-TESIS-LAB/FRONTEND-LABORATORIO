import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  SmtpConfig,
  GuardarSmtpConfigPayload,
  EnviarTestEmailPayload,
  TestEmailResult,
} from '../models/smtp-config.model';

@Injectable({ providedIn: 'root' })
export class SmtpConfigApiService {
  private readonly http = inject(HttpClient);

  get(): Observable<SmtpConfig> {
    return this.http.get<SmtpConfig>('/api/v1/empresa/smtp');
  }

  save(payload: GuardarSmtpConfigPayload): Observable<SmtpConfig> {
    return this.http.put<SmtpConfig>('/api/v1/empresa/smtp', payload);
  }

  sendTest(payload: EnviarTestEmailPayload): Observable<TestEmailResult> {
    return this.http.post<TestEmailResult>('/api/v1/empresa/smtp/test', payload);
  }
}
