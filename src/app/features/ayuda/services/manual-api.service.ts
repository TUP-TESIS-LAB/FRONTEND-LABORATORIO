import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Manual } from '../models/manual.model';

/**
 * Manual de uso del sistema. Devuelve solo los capítulos de los módulos que
 * tiene activos el laboratorio: el filtrado lo hace el backend, acá no se
 * decide qué mostrar.
 *
 * No es polleable: el contenido es estático, se pide una vez al abrir el
 * centro de ayuda.
 */
@Injectable({ providedIn: 'root' })
export class ManualApiService {
  private readonly http = inject(HttpClient);

  getManual(): Observable<Manual> {
    return this.http.get<Manual>('/api/v1/asistente/manual');
  }
}
