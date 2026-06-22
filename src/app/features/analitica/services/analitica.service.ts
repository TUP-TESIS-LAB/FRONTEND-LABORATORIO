import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Protocolo } from '../models/analitica.model';

@Injectable({ providedIn: 'root' })
export class AnaliticaService {
  private readonly http = inject(HttpClient);
  getProtocolos(): Observable<Protocolo[]> { return this.http.get<Protocolo[]>('/api/analitica/protocolos'); }
}
