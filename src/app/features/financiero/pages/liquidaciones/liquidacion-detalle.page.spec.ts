import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Subject } from 'rxjs';
import type { Action } from '@ngrx/store';
import { vi } from 'vitest';
import { informSettlementSuccess, cancelSettlementSuccess } from '../../store/financiero.actions';
import { LiquidacionDetallePage } from './liquidacion-detalle.page';
import {
  selectLiqSelected, selectLiqDetailLoading, selectLiqDetailError,
  selectLiqLifecycleInProgress, selectLiqInsurersIndex, selectLiqExporting,
} from '../../store/financiero.selectors';
import { TokenService } from '@core/auth/token.service';
import { SettlementDetail } from '../../models/liquidaciones.model';
import { EstadoLiquidacionPillComponent } from '../../components/estado-liquidacion-pill.component';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';

const detail: SettlementDetail = {
  id: 1, insurerId: 7, settlementNumber: 100, status: 'PENDING', type: 'SIMPLE',
  periodFrom: '2026-01-01', periodTo: '2026-01-31', informedDate: null, informedAmount: null,
  paymentId: null, createdAt: '2026-02-01T10:00:00',
  plans: [{ planId: 3, agreements: [{ agreementId: 9, agreementSubtotal: 1500, providedServiceIds: [1, 2], rules: [] }] }],
};

let actions$: Subject<Action>;

function setup(status: SettlementDetail['status'], roles: string[]) {
  actions$ = new Subject<Action>();
  return TestBed.configureTestingModule({
    imports: [LiquidacionDetallePage],
    providers: [
      provideNoopAnimations(),
      provideRouter([]),
      provideMockActions(() => actions$),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } },
      { provide: TokenService, useValue: { getRoles: () => roles } },
      provideMockStore({
        selectors: [
          { selector: selectLiqSelected, value: { ...detail, status } },
          { selector: selectLiqDetailLoading, value: false },
          { selector: selectLiqDetailError, value: null },
          { selector: selectLiqLifecycleInProgress, value: false },
          { selector: selectLiqExporting, value: false },
          { selector: selectLiqInsurersIndex, value: new Map([[7, 'IOMA']]) },
        ],
      }),
    ],
  })
    .overrideComponent(EstadoLiquidacionPillComponent, { set: { template: '<span></span>' } })
    .overrideComponent(PageHeaderComponent, { set: { template: '<ng-content />' } })
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

  it('muestra Exportar a Excel salvo cuando está ANULADA', async () => {
    await setup('PENDING', ['ADMINISTRADOR']);
    let fixture = TestBed.createComponent(LiquidacionDetallePage);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-exportar"]'))).toBeTruthy();

    TestBed.resetTestingModule();
    await setup('CANCELLED', ['ADMINISTRADOR']);
    fixture = TestBed.createComponent(LiquidacionDetallePage);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-exportar"]'))).toBeNull();
  });

  it('tras informar/anular con éxito navega al listado', async () => {
    await setup('PENDING', ['ADMINISTRADOR']);
    const fixture = TestBed.createComponent(LiquidacionDetallePage);
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();

    actions$.next(informSettlementSuccess({ settlement: { id: 1 } as never }));
    expect(nav).toHaveBeenCalledWith(['/financiero/liquidaciones']);

    nav.mockClear();
    actions$.next(cancelSettlementSuccess({ id: 1 }));
    expect(nav).toHaveBeenCalledWith(['/financiero/liquidaciones']);
  });
});
