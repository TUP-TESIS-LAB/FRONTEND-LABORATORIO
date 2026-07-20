import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Printer, PrinterCreateInput, RegisteredPrinter } from '../models/printer.model';

@Injectable({ providedIn: 'root' })
export class PrinterService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/analitica/preanalitica/printers';

  list(): Observable<Printer[]> {
    return this.http.get<Printer[]>(this.base);
  }

  create(input: PrinterCreateInput): Observable<RegisteredPrinter> {
    return this.http.post<RegisteredPrinter>(this.base, input);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
