import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CoveragePlansService } from './coverage-plans.service';
import { CoveragePlanOption } from '../models/coverage-plans.catalog';

describe('CoveragePlansService', () => {
  let service: CoveragePlansService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), CoveragePlansService],
    });
    service = TestBed.inject(CoveragePlansService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs /api/v1/coverages/plans with state=active', () => {
    service.getActivePlans().subscribe();
    const req = httpMock.expectOne(
      (r) =>
        r.url === '/api/v1/coverages/plans' &&
        r.params.get('state') === 'active' &&
        r.params.get('size') === '100',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ content: [] });
  });

  it('maps content[] → { planId, label }', () => {
    let result: CoveragePlanOption[] | undefined;
    service.getActivePlans().subscribe((plans) => (result = plans));

    const req = httpMock.expectOne((r) => r.url === '/api/v1/coverages/plans');
    req.flush({
      content: [
        { id: 1, name: 'Particular', active: true },
        { id: 2, name: 'OSDE 210', active: true },
      ],
    });

    expect(result).toEqual<CoveragePlanOption[]>([
      { planId: 1, label: 'Particular' },
      { planId: 2, label: 'OSDE 210' },
    ]);
  });

  it('maps empty content to empty array', () => {
    let result: CoveragePlanOption[] | undefined;
    service.getActivePlans().subscribe((plans) => (result = plans));

    const req = httpMock.expectOne((r) => r.url === '/api/v1/coverages/plans');
    req.flush({ content: [] });

    expect(result).toEqual([]);
  });
});
