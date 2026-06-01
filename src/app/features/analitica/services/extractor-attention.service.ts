import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NotModified, withPolling } from '@core/refresh';
import {
  AssignExtractorRequest,
  AwaitingExtractionItem,
  BoxOccupancyItem,
  BranchOption,
  CancelExtractionRequest,
  ExtractionStats,
  InExtractionItem,
} from '../models/extraction.model';

@Injectable({ providedIn: 'root' })
export class ExtractorAttentionService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1';

  /** Sucursales asignadas al usuario actual. */
  getMyBranches(): Observable<BranchOption[] | NotModified> {
    return this.http.get<BranchOption[] | NotModified>(
      `${this.base}/me/branches`,
      { context: withPolling() },
    );
  }

  /** Ocupación actual de boxes en una sucursal. */
  getBoxOccupancy(branchId: number): Observable<BoxOccupancyItem[] | NotModified> {
    return this.http.get<BoxOccupancyItem[] | NotModified>(
      `${this.base}/branches/${branchId}/extraction-boxes/occupancy`,
      { context: withPolling() },
    );
  }

  getAwaiting(branchId: number): Observable<AwaitingExtractionItem[] | NotModified> {
    return this.http.get<AwaitingExtractionItem[] | NotModified>(
      `${this.base}/attentions/awaiting-extraction`,
      { context: withPolling(), params: new HttpParams().set('branchId', branchId) },
    );
  }

  getMine(branchId: number): Observable<InExtractionItem[] | NotModified> {
    return this.http.get<InExtractionItem[] | NotModified>(
      `${this.base}/attentions/in-extraction`,
      { context: withPolling(), params: new HttpParams().set('branchId', branchId) },
    );
  }

  getStats(branchId: number): Observable<ExtractionStats | NotModified> {
    return this.http.get<ExtractionStats | NotModified>(
      `${this.base}/attentions/extraction-stats`,
      { context: withPolling(), params: new HttpParams().set('branchId', branchId) },
    );
  }

  assignExtractor(id: number, box: number, branchId: number): Observable<void> {
    const body: AssignExtractorRequest = { attentionBox: box, branchId };
    return this.http.patch<void>(`${this.base}/attentions/${id}/assign/extractor`, body);
  }

  /** Cancelar requiere motivo obligatorio (min 5 chars). */
  cancelExtraction(id: number, reason: string): Observable<void> {
    const body: CancelExtractionRequest = { reason };
    return this.http.patch<void>(`${this.base}/attentions/${id}/cancel-extraction`, body);
  }

  endExtraction(id: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/attentions/${id}/end-extraction`, {});
  }
}
