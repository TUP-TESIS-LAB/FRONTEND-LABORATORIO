import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NotModified, withPolling } from '@core/refresh';
import {
  AssignExtractorRequest,
  AwaitingExtractionItem,
  ExtractionStats,
  InExtractionItem,
} from '../models/extraction.model';

@Injectable({ providedIn: 'root' })
export class ExtractorAttentionService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/attentions';

  getAwaiting(): Observable<AwaitingExtractionItem[] | NotModified> {
    return this.http.get<AwaitingExtractionItem[] | NotModified>(
      `${this.base}/awaiting-extraction`,
      { context: withPolling() },
    );
  }

  getMine(): Observable<InExtractionItem[] | NotModified> {
    return this.http.get<InExtractionItem[] | NotModified>(
      `${this.base}/in-extraction`,
      { context: withPolling() },
    );
  }

  getStats(): Observable<ExtractionStats | NotModified> {
    return this.http.get<ExtractionStats | NotModified>(
      `${this.base}/extraction-stats`,
      { context: withPolling() },
    );
  }

  assignExtractor(id: number, box: number): Observable<void> {
    const body: AssignExtractorRequest = { attentionBox: box };
    return this.http.patch<void>(`${this.base}/${id}/assign/extractor`, body);
  }

  cancelExtraction(id: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/cancel-extraction`, {});
  }

  endExtraction(id: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/end-extraction`, {});
  }
}
