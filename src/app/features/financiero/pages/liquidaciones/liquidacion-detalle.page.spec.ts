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
import { LiquidacionDetallePage, tramoDesde, tramoHastaLabel } from './liquidacion-detalle.page';
import {
  selectLiqSelected, selectLiqDetailLoading, selectLiqDetailError,
  selectLiqLifecycleInProgress, selectLiqInsurersIndex, selectLiqExporting, selectLiqInsurerPlans,
} from '../../store/financiero.selectors';
import { TokenService } from '@core/auth/token.service';
import { SettlementDetail, SettlementPlanRuleDetail } from '../../models/liquidaciones.model';
import { EstadoLiquidacionPillComponent } from '../../components/estado-liquidacion-pill.component';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';

const detail: SettlementDetail = {
  id: 1, insurerId: 7, settlementNumber: 100, status: 'PENDING', type: 'SIMPLE',
  periodFrom: '2026-01-01', periodTo: '2026-01-31', informedDate: null, informedAmount: null,
  paymentId: null, createdAt: '2026-02-01T10:00:00',
  plans: [{ planId: 3, agreements: [{ agreementId: 9, agreementSubtotal: 1500, providedServiceIds: [1, 2] }] }],
};

let actions$: Subject<Action>;

function setup(status: SettlementDetail['status'], roles: string[], detailOverride: Partial<SettlementDetail> = {}) {
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
          { selector: selectLiqSelected, value: { ...detail, ...detailOverride, status } },
          { selector: selectLiqDetailLoading, value: false },
          { selector: selectLiqDetailError, value: null },
          { selector: selectLiqLifecycleInProgress, value: false },
          { selector: selectLiqExporting, value: false },
          { selector: selectLiqInsurersIndex, value: new Map([[7, 'IOMA']]) },
          { selector: selectLiqInsurerPlans, value: [
            { id: 3, name: 'Plan PMO', iva: 21, arancel: 400, hasActiveAgreement: true },
          ] },
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

  it('muestra Registrar cobro en estado INFORMED para ADMIN, y no Informar', async () => {
    await setup('INFORMED', ['ADMINISTRADOR']);
    const fixture = TestBed.createComponent(LiquidacionDetallePage);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-cobrar"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-informar"]'))).toBeNull();
  });

  it('no muestra Registrar cobro si el rol no es ADMIN, ni en otros estados', async () => {
    await setup('INFORMED', ['SECRETARIA']);
    let fixture = TestBed.createComponent(LiquidacionDetallePage);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-cobrar"]'))).toBeNull();

    TestBed.resetTestingModule();
    await setup('PENDING', ['ADMINISTRADOR']);
    fixture = TestBed.createComponent(LiquidacionDetallePage);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-cobrar"]'))).toBeNull();
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

  it('el detalle por plan muestra nombre + IVA + neto/total (no genérico)', async () => {
    await setup('PENDING', ['ADMINISTRADOR']);
    const fixture = TestBed.createComponent(LiquidacionDetallePage);
    fixture.detectChanges();
    const row = fixture.debugElement.query(By.css('[data-testid="plan-row-3"]'));
    expect(row).toBeTruthy();
    const txt = (row.nativeElement.textContent ?? '').replace(/\s+/g, ' ');
    expect(txt).toContain('Plan PMO');   // nombre real, no "Convenio del plan"
    expect(txt).toContain('IVA 21%');
    expect(txt).toContain('2 prestaciones');
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

  it('en ESPECIAL muestra "Reglas usadas" por plan, con tramos y valores fijos', async () => {
    await setup('PENDING', ['ADMINISTRADOR'], {
      type: 'ESPECIAL',
      plans: [{
        planId: 3,
        agreements: [{ agreementId: 9, agreementSubtotal: 5300, providedServiceIds: [1, 2] }],
        rules: [
          { ruleType: 'BETWEEN', fromCount: 1, toCount: 50, amount: 100, subtotal: 5000, count: 50 },
          { ruleType: 'GREATER_THAN', fromCount: 50, toCount: null, amount: 80, subtotal: 800, count: 10 },
        ],
        fixedAmounts: [
          { analysisId: 55, analysisName: 'Hemograma', amount: 1500, appliedCount: 3, subtotal: 4500 },
        ],
      }],
    });
    const fixture = TestBed.createComponent(LiquidacionDetallePage);
    fixture.detectChanges();

    const section = fixture.debugElement.query(By.css('[data-testid="reglas-usadas"]'));
    expect(section).toBeTruthy();
    const planBlock = fixture.debugElement.query(By.css('[data-testid="reglas-plan-3"]'));
    const txt = (planBlock.nativeElement.textContent ?? '').replace(/\s+/g, ' ');
    expect(txt).toContain('Plan PMO');
    expect(txt).toContain('Tramos');
    expect(txt).toContain('51+ / en adelante');
    expect(txt).toContain('Valores fijos');
    expect(txt).toContain('Hemograma');
  });

  it('en SIMPLE no muestra la sección "Reglas usadas"', async () => {
    await setup('PENDING', ['ADMINISTRADOR']); // detail base es SIMPLE
    const fixture = TestBed.createComponent(LiquidacionDetallePage);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="reglas-usadas"]'))).toBeNull();
  });

  it('en ESPECIAL, un plan sin valores fijos no muestra la sub-tabla de fijos', async () => {
    await setup('PENDING', ['ADMINISTRADOR'], {
      type: 'ESPECIAL',
      plans: [{
        planId: 3,
        agreements: [{ agreementId: 9, agreementSubtotal: 5000, providedServiceIds: [1, 2] }],
        rules: [{ ruleType: 'GREATER_THAN', fromCount: 0, toCount: null, amount: 100, subtotal: 5000, count: 50 }],
        fixedAmounts: [],
      }],
    });
    const fixture = TestBed.createComponent(LiquidacionDetallePage);
    fixture.detectChanges();
    const planBlock = fixture.debugElement.query(By.css('[data-testid="reglas-plan-3"]'));
    const txt = (planBlock.nativeElement.textContent ?? '').replace(/\s+/g, ' ');
    expect(txt).toContain('Tramos');
    expect(txt).not.toContain('Valores fijos');
  });
});

describe('tramoDesde / tramoHastaLabel — formateo de tramos del detalle (KAN-234)', () => {
  const between: SettlementPlanRuleDetail = { ruleType: 'BETWEEN', fromCount: 1, toCount: 50, amount: 100, subtotal: 5000, count: 50 };
  const open: SettlementPlanRuleDetail = { ruleType: 'GREATER_THAN', fromCount: 50, toCount: null, amount: 80, subtotal: 800, count: 10 };

  it('tramoDesde: BETWEEN usa fromCount tal cual', () => {
    expect(tramoDesde(between)).toBe(1);
  });

  it('tramoDesde: GREATER_THAN muestra fromCount+1 (el backend guarda N-1)', () => {
    expect(tramoDesde(open)).toBe(51);
  });

  it('tramoHastaLabel: BETWEEN muestra el toCount', () => {
    expect(tramoHastaLabel(between)).toBe('50');
  });

  it('tramoHastaLabel: el tramo abierto se etiqueta "N+ / en adelante"', () => {
    expect(tramoHastaLabel(open)).toBe('51+ / en adelante');
  });
});
