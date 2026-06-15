import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import { BranchTotemConfig, UpsertBranchTotemConfigRequest } from '../models/branch-totem-config.model';

@Injectable({ providedIn: 'root' })
export class BranchTotemConfigService {
  private readonly http = inject(HttpClient);

  private base(branchId: number): string {
    return `/api/v1/sucursales/branches/${branchId}/totem-config`;
  }

  get(branchId: number): Observable<BranchTotemConfig | null> {
    return this.http.get<BranchTotemConfig>(this.base(branchId)).pipe(
      catchError((err: HttpErrorResponse) => err.status === 404 ? of(null) : throwError(() => err)),
    );
  }

  upsert(branchId: number, body: UpsertBranchTotemConfigRequest): Observable<BranchTotemConfig> {
    return this.http.put<BranchTotemConfig>(this.base(branchId), body);
  }
}
