import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { NotModified, isNotModified, withPolling } from '@core/refresh';
import {
  AwaitingExtractionItem,
  BoxAssignment,
  BoxOccupancyItem,
  BranchExtractor,
  BranchOption,
  CancelExtractionRequest,
  ExtractionStats,
  InExtractionItem,
} from '../models/extraction.model';

/**
 * Forma cruda que devuelve el backend para una asignación de box: usa
 * {@code extractorUserId}, mientras el modelo de dominio del front usa
 * {@code extractorId}. El service traduce wire → modelo (ver mapBoxAssignment).
 */
interface BoxAssignmentWire {
  boxNumber: number;
  extractorUserId: number | null;
  extractorFullName: string | null;
}

function mapBoxAssignment(w: BoxAssignmentWire): BoxAssignment {
  return {
    boxNumber: w.boxNumber,
    extractorId: w.extractorUserId ?? null,
    extractorFullName: w.extractorFullName ?? null,
  };
}

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

  /** Extractores disponibles en una sucursal. */
  getBranchExtractors(branchId: number): Observable<BranchExtractor[] | NotModified> {
    return this.http.get<BranchExtractor[] | NotModified>(
      `${this.base}/branches/${branchId}/extractors`,
      { context: withPolling() },
    );
  }

  /** Asignaciones actuales de extractores a boxes de una sucursal. */
  getBoxAssignments(branchId: number): Observable<BoxAssignment[] | NotModified> {
    return this.http
      .get<BoxAssignmentWire[] | NotModified>(
        `${this.base}/branches/${branchId}/box-assignments`,
        { context: withPolling() },
      )
      .pipe(map((res) => (isNotModified(res) ? res : res.map(mapBoxAssignment))));
  }

  /** Persiste la configuración de boxes de una sucursal. */
  saveBoxAssignments(
    branchId: number,
    boxes: { boxNumber: number; extractorUserId: number | null }[],
  ): Observable<BoxAssignment[]> {
    return this.http
      .put<BoxAssignmentWire[]>(
        `${this.base}/branches/${branchId}/box-assignments`,
        { boxes },
      )
      .pipe(map((res) => res.map(mapBoxAssignment)));
  }

  assignExtractor(id: number, boxNumber: number, branchId: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/attentions/${id}/assign/extractor`, { branchId, boxNumber });
  }

  unassignExtraction(id: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/attentions/${id}/unassign`, null);
  }

  /**
   * "No se presentó": libera la extracción de vuelta a la cola (AWAITING_EXTRACTION).
   * Requiere motivo obligatorio (min 5 chars).
   */
  cancelExtraction(id: number, reason: string): Observable<void> {
    const body: CancelExtractionRequest = { reason };
    return this.http.patch<void>(`${this.base}/attentions/${id}/cancel-extraction`, body);
  }

  /**
   * "Cancelar extracción": cancelación TERMINAL — la atención pasa a CANCELED y
   * muere el flujo (NO vuelve a la cola). Motivo obligatorio (min 5 chars).
   */
  cancelAttention(id: number, reason: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/attentions/${id}/cancel-attention`, {
      cancellationReason: reason,
    });
  }

  endExtraction(id: number, observation?: string): Observable<void> {
    // observation: el BE lo persistira en un PR aparte. Mientras tanto lo mandamos
    // en el body (campo extra inofuso). Solo lo incluimos si vino con contenido.
    const body = observation ? { observation } : {};
    return this.http.patch<void>(`${this.base}/attentions/${id}/end-extraction`, body);
  }
}
