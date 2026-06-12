import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { withPolling, NotModified } from '@core/refresh';
import type { BranchOption } from '@features/analitica/models/extraction.model';
import type { BackendLabelStatus, LabelWorklistItem } from '../models/label-worklist.model';

@Injectable({ providedIn: 'root' })
export class MuestrasApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/analitica/preanalitica/labels';

  /** Polleable (ETag/304 via etagInterceptor). */
  getWorklist(status: BackendLabelStatus, branchId: number): Observable<LabelWorklistItem[] | NotModified> {
    return this.http.get<LabelWorklistItem[] | NotModified>(`${this.base}/worklist`, {
      context: withPolling(),
      params: new HttpParams().set('status', status).set('branchId', branchId),
    });
  }

  getMyBranches(): Observable<BranchOption[]> {
    return this.http.get<BranchOption[]>('/api/v1/me/branches');
  }

  /** backend: UpdateLabelStatusRequest { labelIds, targetStatus, protocolId? } */
  updateStatus(labelIds: number[], targetStatus: BackendLabelStatus): Observable<unknown> {
    return this.http.put(`${this.base}/status`, { labelIds, targetStatus });
  }

  /** backend: RejectLabelsRequest { labelIds, protocolId?, reason } — reason sin @NotBlank */
  reject(labelIds: number[], reason: string): Observable<unknown> {
    return this.http.post(`${this.base}/reject`, { labelIds, reason });
  }

  /** backend: POST /lost/{labelId} — sin body en el controller */
  markLost(labelId: number): Observable<unknown> {
    return this.http.post(`${this.base}/lost/${labelId}`, null);
  }

  /** backend: RollbackLabelStatusRequest { labelIds, targetStatus?, protocolId? } */
  rollback(labelIds: number[]): Observable<unknown> {
    return this.http.patch(`${this.base}/status/rollback`, { labelIds });
  }
}
