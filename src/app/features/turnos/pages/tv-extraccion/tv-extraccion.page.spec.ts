import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { TvExtraccionPage } from './tv-extraccion.page';
import { TvExtraccionMockService } from './tv-extraccion-mock.service';

describe('TvExtraccionPage', () => {
  let fixture: ComponentFixture<TvExtraccionPage>;
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
    // Esperar el primer fetch del mock (delay 30ms). 60ms da margen para CI.
    await new Promise(r => setTimeout(r, 60));
    fixture.detectChanges();
  });

  it('renders the hero with the most recent called publicCode and box', () => {
    const hero = fixture.nativeElement.querySelector('.hero');
    expect(hero).not.toBeNull();
    expect(hero.querySelector('.hero-label').textContent).toContain('Ahora llamando');
    expect(hero.querySelector('.hero-code').textContent.trim()).toMatch(/^EX-\d{3}$/);
    expect(hero.querySelector('.hero-box').textContent).toMatch(/→ Box [123]/);
  });

  it('renders up to 4 previous calls below the hero', () => {
    const items = fixture.nativeElement.querySelectorAll('.previous li');
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(4);
    expect(items[0].querySelector('.box').textContent).toMatch(/→ Box [123]/);
  });

  it('clicking the simulate button calls simulateNewCall on the mock', () => {
    const spy = vi.spyOn(mockService, 'simulateNewCall');
    const btn = fixture.nativeElement.querySelector('[data-testid="simulate-btn"]');
    expect(btn).not.toBeNull();
    btn.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
