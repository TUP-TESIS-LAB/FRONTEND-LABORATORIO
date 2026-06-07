import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SKIP_AUTH } from '../../../services/public-display.service';

export interface TotemCheckInResult {
  /** Código de llamado del back (`publicCode`), ej. ST-001 / CT-001. */
  queueNumber: string;
  hasAppointment: boolean;
}

@Injectable({ providedIn: 'root' })
export class TotemService {
  private http = inject(HttpClient);

  checkIn(slug: string, branchId: number, nationalId: string): Observable<TotemCheckInResult> {
    return this.http
      .post<{ publicCode: string; hasAppointment: boolean }>(
        `/public/totem/${slug}/${branchId}/check-in`,
        { nationalId },
        { context: new HttpContext().set(SKIP_AUTH, true) },
      )
      .pipe(map(res => ({ queueNumber: res.publicCode, hasAppointment: res.hasAppointment })));
  }
}
