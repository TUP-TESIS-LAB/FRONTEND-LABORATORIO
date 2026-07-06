import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { withPolling, NotModified } from '@core/refresh';
import { EtagCacheService } from '@core/refresh/etag-cache.service';
import type { BranchOption } from '@features/analitica/models/extraction.model';
import type { BackendLabelStatus, LabelWorklistItem } from '../models/label-worklist.model';
import type { BranchWorkspace, RoutingResolveResponse } from '../models/routing.model';

@Injectable({ providedIn: 'root' })
export class MuestrasApiService {
  private readonly http = inject(HttpClient);
  private readonly etagCache = inject(EtagCacheService);
  private readonly base = '/api/v1/analitica/preanalitica/labels';

  /**
   * Polleable (ETag/304 via etagInterceptor).
   * @param status Estado o CSV de estados (e.g. 'REJECTED,LOST,DISCARDED').
   */
  getWorklist(status: string, branchId: number): Observable<LabelWorklistItem[] | NotModified> {
    return this.http.get<LabelWorklistItem[] | NotModified>(`${this.base}/worklist`, {
      context: withPolling(),
      params: new HttpParams().set('status', status).set('branchId', branchId),
    });
  }

  /**
   * Invalida el ETag cacheado del worklist para (status, branchId), forzando que el próximo
   * getWorklist traiga 200 con datos en vez de 304. Necesario al alternar tabs que comparten el
   * mismo slice del store (PROCESSING/DERIVED): sin esto, volver a un tab ya visitado daría 304 y
   * el slice quedaría con los datos del otro tab.
   */
  invalidateWorklistEtag(status: string, branchId: number): void {
    const url = `${this.base}/worklist?${new HttpParams().set('status', status).set('branchId', branchId)}`;
    this.etagCache.clear(EtagCacheService.buildKey('GET', url));
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

  /** backend: DiscardLabelsRequest { labelIds } — descarte físico (→ DISCARDED) */
  discard(labelIds: number[]): Observable<unknown> {
    return this.http.patch(`${this.base}/discard`, { labelIds });
  }

  resolveRouting(protocolIds: number[], branchId: number): Observable<RoutingResolveResponse> {
    return this.http.post<RoutingResolveResponse>('/api/v1/protocols/routing/resolve', { protocolIds, branchId });
  }

  /** Despacho atómico: tubo → PROCESSING + check-in. */
  dispatch(checkIns: { sampleId: number; sectionId: number }[]): Observable<unknown> {
    return this.http.post(`${this.base}/dispatch`, { checkIns });
  }

  /** Derivación: labels del tubo a otra sucursal (quedan IN_TRANSIT). */
  sendToBranch(labelIds: number[], destinationBranchId: number, observation?: string): Observable<unknown> {
    return this.http.post(`${this.base}/send-to-branch`, { labelIds, destinationBranchId, observation });
  }

  getBranchWorkspaces(branchId: number): Observable<BranchWorkspace[]> {
    return this.http.get<BranchWorkspace[]>(`/api/v1/sucursales/branches/${branchId}/workspaces`);
  }
}
