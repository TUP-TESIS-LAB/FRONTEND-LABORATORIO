import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Pago, Cobertura, Movimiento } from '../models/financiero.model';

@Injectable()
export class FinancieroService {
  private readonly http = inject(HttpClient);
  getPagos(): Observable<Pago[]>             { return this.http.get<Pago[]>('/api/financiero/pagos'); }
  getCoberturas(): Observable<Cobertura[]>   { return this.http.get<Cobertura[]>('/api/financiero/coberturas'); }
  getMovimientos(): Observable<Movimiento[]> { return this.http.get<Movimiento[]>('/api/financiero/movimientos'); }
}
