import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { WorksheetTemplate, SaveWorksheetTemplateBody } from '../models/worksheet-template.model';

@Injectable({ providedIn: 'root' })
export class WorksheetTemplatesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/analitica/worksheets/templates';

  listTemplates(): Observable<WorksheetTemplate[]> {
    return this.http.get<WorksheetTemplate[]>(this.base);
  }

  createTemplate(body: SaveWorksheetTemplateBody): Observable<WorksheetTemplate> {
    return this.http.post<WorksheetTemplate>(this.base, body);
  }

  updateTemplate(id: number, body: SaveWorksheetTemplateBody): Observable<WorksheetTemplate> {
    return this.http.put<WorksheetTemplate>(`${this.base}/${id}`, body);
  }
}
