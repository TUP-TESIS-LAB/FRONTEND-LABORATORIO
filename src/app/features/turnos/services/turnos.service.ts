import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Turno } from '../models/turno.model';

@Injectable()
export class TurnosService {
  private readonly http = inject(HttpClient);
  getTurnos(fecha: string): Observable<Turno[]> {
    return this.http.get<Turno[]>(`/api/turnos?fecha=${fecha}`);
  }
}
