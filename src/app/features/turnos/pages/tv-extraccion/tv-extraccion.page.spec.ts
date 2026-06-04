import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { TvExtraccionPage } from './tv-extraccion.page';
import { TvExtraccionMockService } from './tv-extraccion-mock.service';

describe('TvExtraccionPage', () => {
  let fixture: any;
  let mockService: TvExtraccionMockService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [TvExtraccionPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ tenantSlug: 'lab-demo', branchId: '1001' }) },
          },
        },
      ],
    });
    fixture = TestBed.createComponent(TvExtraccionPage);
    mockService = TestBed.inject(TvExtraccionMockService);
    fixture.detectChanges();
    // Esperar el primer fetch del mock (delay 30ms).
    await new Promise(r => setTimeout(r, 60));
    fixture.detectChanges();
  });

  it('renders the EXTRACCIÓN badge', () => {
    const badge = fixture.nativeElement.querySelector('.tv-badge--extraccion');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain('EXTRACCIÓN');
  });

  it('renders entries with → Box N text', () => {
    const boxes = fixture.nativeElement.querySelectorAll('.proximos li .box');
    expect(boxes.length).toBeGreaterThan(0);
    expect(boxes[0].textContent).toMatch(/→ Box [123]/);
  });

  it('clicking the simulate button calls simulateNewCall on the mock', () => {
    const spy = vi.spyOn(mockService, 'simulateNewCall');
    const btn = fixture.nativeElement.querySelector('[data-testid="simulate-btn"]');
    expect(btn).not.toBeNull();
    btn.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
