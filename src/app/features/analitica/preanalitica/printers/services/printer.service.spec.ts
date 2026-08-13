import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PrinterService } from './printer.service';
import { PrinterCreateInput } from '../models/printer.model';

describe('PrinterService', () => {
  let svc: PrinterService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PrinterService],
    });
    svc = TestBed.inject(PrinterService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list → GET /api/v1/analitica/preanalitica/printers sin barra final', () => {
    svc.list().subscribe();
    const req = http.expectOne('/api/v1/analitica/preanalitica/printers');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('create → POST /api/v1/analitica/preanalitica/printers sin barra final con el body', () => {
    const input: PrinterCreateInput = { name: 'Zebra 1', branchId: 3, ipAddress: '192.168.0.10', port: 9100 };
    svc.create(input).subscribe();
    const req = http.expectOne('/api/v1/analitica/preanalitica/printers');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush({ id: 1, ...input, printerToken: 'token-123' });
  });

  it('delete → DELETE /api/v1/analitica/preanalitica/printers/1', () => {
    svc.delete(1).subscribe();
    const req = http.expectOne('/api/v1/analitica/preanalitica/printers/1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
