import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { TvExtraccionPage } from './tv-extraccion.page';
import { ExtractionDisplayService } from '../../services/extraction-display.service';
import { PollingService } from '@core/refresh';
import { PublicDisplayService } from '../../services/public-display.service';
import { ExtractionDisplaySnapshot } from '../../models/extraction-display.model';

const mockSnapshot: ExtractionDisplaySnapshot = {
  tenantName: 'Demo Lab',
  branchName: 'Sucursal Centro',
  entries: [
    { publicCode: 'EX-001', displayStatus: 'CALLED', boxNumber: 2, calledAt: '2026-06-08T10:00:00Z' },
    { publicCode: 'EX-002', displayStatus: 'WAITING', boxNumber: null, calledAt: null },
  ],
};

describe('TvExtraccionPage', () => {
  let fixture: ComponentFixture<TvExtraccionPage>;

  beforeEach(async () => {
    const pollingMock: Partial<PollingService> = {
      startPolling: vi.fn((opts: any) => {
        opts.poll().subscribe();
        return { stop: vi.fn(), pokeNow: vi.fn(), setActive: vi.fn() };
      }),
    };

    await TestBed.configureTestingModule({
      imports: [TvExtraccionPage],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ tenantSlug: 'lab-demo', branchId: '1001' }) },
          },
        },
        {
          provide: ExtractionDisplayService,
          useValue: { fetchSnapshot: vi.fn(() => of(mockSnapshot)) },
        },
        { provide: PollingService, useValue: pollingMock },
        {
          provide: PublicDisplayService,
          useValue: { listPublicBranches: vi.fn(() => of([])) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TvExtraccionPage);
    fixture.detectChanges();
    fixture.detectChanges();
  });

  it('shows a CALLED entry with publicCode and box number', () => {
    const items = fixture.nativeElement.querySelectorAll('.proximos li');
    expect(items.length).toBeGreaterThan(0);
    const first = items[0];
    expect(first.querySelector('.code').textContent.trim()).toBe('EX-001');
    expect(first.querySelector('.box').textContent).toContain('Box 2');
  });

  it('ya no muestra la sección "En espera" (la TV de extracción se ve como la de turnos)', () => {
    expect(fixture.nativeElement.querySelector('.en-espera')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('En espera');
  });

  it('does not contain a simulate button', () => {
    expect(fixture.nativeElement.textContent).not.toContain('Simular llamada');
    expect(fixture.nativeElement.querySelector('[data-testid="simulate-btn"]')).toBeNull();
  });
});
