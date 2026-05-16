import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Rol } from '../models/rol.model';

@Injectable({ providedIn: 'root' })
export class RolesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/role';

  list(): Observable<Rol[]> {
    return this.http.get<Rol[]>(this.baseUrl);
  }
}
