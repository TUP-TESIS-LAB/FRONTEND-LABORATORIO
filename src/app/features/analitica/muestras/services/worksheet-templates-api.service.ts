import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { WorksheetTemplate, SaveWorksheetTemplateBody, WorksheetForm } from '../models/worksheet-template.model';

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

  /** GAP-P3: formulario enriquecido (análisis de la planilla con su nombre). */
  getForm(id: number): Observable<WorksheetForm> {
    return this.http.get<WorksheetForm>(`${this.base}/${id}/form`);
  }

  /** GAP-P4: baja (soft delete) de una plantilla. */
  deleteTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
