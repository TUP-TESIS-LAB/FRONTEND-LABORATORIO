import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';

import { CobrosPage } from './cobros.page';
import {
  selectCobrosList,
  selectCobrosLoading,
  selectCobrosError,
} from '../../store/financiero.selectors';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';

function installLocalStorageMock(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  });
}

const TWO_PAYMENTS = [
  {
    id: 1,
    attentionId: 10,
    branchId: 1,
    totalAmount: 5000,
    copaymentAmount: 3000,
    status: 'PROCESSED',
    createdAt: '2026-06-19T10:30:00',
    collections: [{ id: 1, method: 'CASH', amount: 3000, reference: null }],
  },
  {
    id: 2,
    attentionId: 11,
    branchId: 1,
    totalAmount: 8000,
    copaymentAmount: 6000,
    status: 'CANCELLED',
    createdAt: '2026-06-19T11:00:00',
    collections: [{ id: 2, method: 'QR', amount: 6000, reference: 'REF-001' }],
  },
] as any[];

/**
 * Smoke test: CobrosPage con 2 pagos (uno PROCESSED, uno CANCELLED).
 * Verifica que:
 * 1. Se renderizan 2 filas en la tabla.
 * 2. El pago CANCELLED tiene la clase/marcador de tachado.
 *
 * Usa overrideTemplate para evitar NG0950 de input.required() en vitest.
 */
describe('CobrosPage — smoke (lista con pago cancelado)', () => {
  let mockStore: MockStore;

  const minimalTemplate = `
    <div class="fin-cobros">
      @if (loading()) {
        <div data-testid="loading-state">Cargando...</div>
      } @else {
        @for (item of list(); track item.id) {
          <div class="cobros-row" [attr.data-testid]="'row-' + item.id">
            <span
              class="cobros-monto"
              [class.cobros-monto--cancelled]="item.status === 'CANCELLED'"
              [attr.data-testid]="item.status === 'CANCELLED' ? 'monto-cancelado' : 'monto-normal'">
              {{ item.copaymentAmount | currencyAr }}
            </span>
          </div>
        }
      }
    </div>
  `;

  beforeEach(async () => {
    installLocalStorageMock();

    await TestBed.configureTestingModule({
      imports: [CobrosPage],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        provideMockStore({
          selectors: [
            { selector: selectCobrosList,   value: TWO_PAYMENTS },
            { selector: selectCobrosLoading, value: false },
            { selector: selectCobrosError,   value: null },
          ],
        }),
        {
          provide: OperatorBranchContextService,
          useValue: {
            branchId: signal<number | null>(1),
            branchName: signal<string | null>('Sucursal Test'),
          },
        },
      ],
    })
      .overrideTemplate(CobrosPage, minimalTemplate)
      .compileComponents();

    mockStore = TestBed.inject(MockStore);
  });

  it('renderiza 2 filas para 2 pagos', () => {
    const fixture = TestBed.createComponent(CobrosPage);
    fixture.detectChanges();

    const rows = fixture.debugElement.queryAll(By.css('.cobros-row'));
    expect(rows.length).toBe(2);
  });

  it('el pago CANCELLED tiene la clase cobros-monto--cancelled (tachado)', () => {
    const fixture = TestBed.createComponent(CobrosPage);
    fixture.detectChanges();

    const cancelado = fixture.debugElement.query(By.css('[data-testid="monto-cancelado"]'));
    expect(cancelado).toBeTruthy();
    expect(cancelado.nativeElement.classList).toContain('cobros-monto--cancelled');
  });
});
