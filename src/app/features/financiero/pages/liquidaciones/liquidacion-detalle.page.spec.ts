import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { LiquidacionDetallePage } from './liquidacion-detalle.page';
import {
  selectLiqSelected, selectLiqDetailLoading, selectLiqDetailError,
  selectLiqLifecycleInProgress, selectLiqInsurersIndex,
} from '../../store/financiero.selectors';
import { TokenService } from '@core/auth/token.service';
import { SettlementDetail } from '../../models/liquidaciones.model';

const detail: SettlementDetail = {
  id: 1, insurerId: 7, settlementNumber: 100, status: 'PENDING', type: 'SIMPLE',
  periodFrom: '2026-01-01', periodTo: '2026-01-31', informedDate: null, informedAmount: null,
  paymentId: null, createdAt: '2026-02-01T10:00:00',
  plans: [{ planId: 3, agreements: [{ agreementId: 9, agreementSubtotal: 1500, providedServiceIds: [1, 2], rules: [] }] }],
};

/**
 * Minimal template that exercises only the action-gating logic (isAdmin + status).
 * Uses overrideTemplate to avoid NG0950 from input.required() in
 * EstadoLiquidacionPillComponent and PrimeNG/signal rendering issues in JSDOM.
 * Pattern established in cobros.page.spec.ts and liquidaciones-list.page.spec.ts.
 */
const minimalTemplate = `
  <div class="fin-liq-det">
    @if (liq(); as l) {
      @if (isAdmin() && l.status === 'PENDING') {
        <div class="liq-actions">
          <button class="fin-btn fin-btn--success" type="button" data-testid="btn-informar" (click)="modal.set('informar')">
            Informar
          </button>
          <button class="fin-btn fin-btn--danger" type="button" data-testid="btn-anular" (click)="modal.set('anular')">
            Anular
          </button>
        </div>
      } @else if (isAdmin() && l.status === 'INFORMED') {
        <div class="liq-actions">
          <button class="fin-btn fin-btn--danger" type="button" data-testid="btn-anular" (click)="modal.set('anular')">
            Anular
          </button>
        </div>
      }
    }
  </div>
`;

function setup(status: SettlementDetail['status'], roles: string[]) {
  return TestBed.configureTestingModule({
    imports: [LiquidacionDetallePage],
    providers: [
      provideNoopAnimations(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } },
      { provide: TokenService, useValue: { getRoles: () => roles } },
      provideMockStore({
        selectors: [
          { selector: selectLiqSelected, value: { ...detail, status } },
          { selector: selectLiqDetailLoading, value: false },
          { selector: selectLiqDetailError, value: null },
          { selector: selectLiqLifecycleInProgress, value: false },
          { selector: selectLiqInsurersIndex, value: new Map([[7, 'IOMA']]) },
        ],
      }),
    ],
  })
    .overrideTemplate(LiquidacionDetallePage, minimalTemplate)
    .compileComponents();
}

describe('LiquidacionDetallePage — smoke', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('muestra acciones Informar y Anular en estado PENDING para ADMIN', async () => {
    await setup('PENDING', ['ADMINISTRADOR']);
    const fixture = TestBed.createComponent(LiquidacionDetallePage);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-informar"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-anular"]'))).toBeTruthy();
  });

  it('no muestra acciones de mutación si el rol no es ADMIN', async () => {
    await setup('PENDING', ['SECRETARIA']);
    const fixture = TestBed.createComponent(LiquidacionDetallePage);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-informar"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-anular"]'))).toBeNull();
  });

  it('en estado BILLED no muestra acciones de lifecycle', async () => {
    await setup('BILLED', ['ADMINISTRADOR']);
    const fixture = TestBed.createComponent(LiquidacionDetallePage);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-informar"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-anular"]'))).toBeNull();
  });
});
