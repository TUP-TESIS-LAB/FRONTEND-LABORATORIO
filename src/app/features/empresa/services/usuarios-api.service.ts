import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Usuario,
  CrearUsuarioPayload,
  ActualizarUsuarioPayload,
  CrearUsuarioRespuesta,
  CambiarEstadoPayload,
  BuscarUsuariosParams,
} from '../models/usuario.model';
import { PaginatedResponse } from '../models/paginated.model';

@Injectable({ providedIn: 'root' })
export class UsuariosApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/user';

  search(params: BuscarUsuariosParams): Observable<PaginatedResponse<Usuario>> {
    let httpParams = new HttpParams()
      .set('isExternal', 'false')
      .set('page', params.page ?? 0)
      .set('size', params.size ?? 20);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.isActive !== undefined) httpParams = httpParams.set('isActive', params.isActive);
    if (params.roleIds && params.roleIds.length > 0) {
      for (const id of params.roleIds) httpParams = httpParams.append('roleIds', id);
    }
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);

    return this.http.get<PaginatedResponse<Usuario>>(`${this.baseUrl}/search`, { params: httpParams });
  }

  getById(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.baseUrl}/${id}`);
  }

  create(payload: CrearUsuarioPayload): Observable<CrearUsuarioRespuesta> {
    return this.http.post<CrearUsuarioRespuesta>(`${this.baseUrl}/internal`, payload);
  }

  update(id: number, payload: ActualizarUsuarioPayload): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.baseUrl}/${id}`, payload);
  }

  toggleStatus(id: number, payload: CambiarEstadoPayload): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.baseUrl}/${id}/status`, payload);
  }
}
