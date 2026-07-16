import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { ExtractionDisplayService } from './extraction-display.service';
import { SKIP_AUTH } from './public-display.service';
import { ExtractionDisplaySnapshot } from '../models/extraction-display.model';

describe('ExtractionDisplayService', () => {
  let service: ExtractionDisplayService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ExtractionDisplayService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs the snapshot from correct URL with SKIP_AUTH and polling context', async () => {
    const mockSnapshot: ExtractionDisplaySnapshot = {
      tenantName: 'Demo Lab',
      branchName: 'Sucursal Centro',
      entries: [],
    };

    const result$ = firstValueFrom(service.fetchSnapshot('demo', 10));
    const req = httpMock.expectOne('/public/display/extraccion/demo/10');

    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(SKIP_AUTH)).toBe(true);

    req.flush(mockSnapshot);

    const snapshot = await result$;
    expect(snapshot).toEqual(mockSnapshot);
  });
});
