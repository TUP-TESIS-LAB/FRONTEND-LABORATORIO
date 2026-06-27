import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { LiquidacionesListPage } from './liquidaciones-list.page';
import {
  selectLiqList, selectLiqListLoading, selectLiqListError, selectLiqInsurersIndex,
} from '../../store/financiero.selectors';
import { PollingService } from '@core/refresh';
import { TokenService } from '@core/auth/token.service';

/**
 * Smoke spec — usa overrideTemplate para evitar NG0950 con input.required() de
 * DataTableComponent en JSDOM/vitest. Patrón establecido en cobros.page.spec.ts.
 *
 * El DataTableComponent real (PrimeNG p-table) no emite data-testid="row-<id>",
 * por eso el override renderiza filas mínimas con ese atributo directamente.
 */
const minimalTemplate = `
  <div class="fin-liq-list">
    @if (isAdmin()) {
      <button type="button" data-testid="btn-generar" (click)="irAGenerar()">
        Generar liquidación
      </button>
    }
    @for (item of filtered(); track item.id) {
      <div [attr.data-testid]="'row-' + item.id">{{ item.settlementNumber }}</div>
    }
  </div>
`;

describe('LiquidacionesListPage — smoke', () => {
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiquidacionesListPage],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        provideMockStore({
          selectors: [
            { selector: selectLiqList, value: [
              { id: 1, insurerId: 7, settlementNumber: 100, status: 'PENDING', type: 'SIMPLE', periodFrom: '2026-01-01', periodTo: '2026-01-31', createdAt: '2026-02-01T10:00:00' },
            ] },
            { selector: selectLiqListLoading, value: false },
            { selector: selectLiqListError, value: null },
            { selector: selectLiqInsurersIndex, value: new Map([[7, 'IOMA']]) },
          ],
        }),
        { provide: PollingService, useValue: { startPolling: () => ({ stop: vi.fn(), pokeNow: vi.fn(), setActive: vi.fn() }) } },
        { provide: TokenService, useValue: { getRoles: () => ['ADMINISTRADOR'] } },
      ],
    })
      .overrideTemplate(LiquidacionesListPage, minimalTemplate)
      .compileComponents();
    store = TestBed.inject(MockStore);
  });

  it('renderiza una fila por liquidación', () => {
    const fixture = TestBed.createComponent(LiquidacionesListPage);
    fixture.detectChanges();
    const rows = fixture.debugElement.queryAll(By.css('[data-testid^="row-"]'));
    expect(rows.length).toBe(1);
  });

  it('muestra el botón Generar cuando el rol es ADMINISTRADOR', () => {
    const fixture = TestBed.createComponent(LiquidacionesListPage);
    fixture.detectChanges();
    const btn = fixture.debugElement.query(By.css('[data-testid="btn-generar"]'));
    expect(btn).toBeTruthy();
  });
});
