import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Study, ResultWithValidation, DetValidation, PostResult, ValidationOutcome, Page, StudyListItemResponse, StudyStatus } from '../models/postanalitica.model';

@Injectable({ providedIn: 'root' })
export class PostanaliticaApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/analitica/postanalitica';

  getStudy(protocolId: number): Observable<Study> {
    return this.http.get<Study>(`${this.base}/studies/${protocolId}`);
  }
  getResultsValidation(protocolId: number): Observable<ResultWithValidation[]> {
    return this.http.get<ResultWithValidation[]>(`${this.base}/studies/${protocolId}/results/validation`);
  }
  validateDetermination(resultId: number, determinationId: number, outcome: ValidationOutcome): Observable<DetValidation> {
    return this.http.post<DetValidation>(`${this.base}/results/${resultId}/validate`, { determinationId, outcome });
  }
  validateAll(resultId: number, outcome: ValidationOutcome): Observable<PostResult> {
    return this.http.post<PostResult>(`${this.base}/results/${resultId}/validate-all`, { outcome });
  }

  listStudies(status?: StudyStatus): Observable<Page<StudyListItemResponse>> {
    let params = new HttpParams().set('size', '200');
    if (status) params = params.set('status', status);
    return this.http.get<Page<StudyListItemResponse>>(`${this.base}/studies`, { params });
  }
}
