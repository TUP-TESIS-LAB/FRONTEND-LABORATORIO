import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { saveValorUb, setOverride } from '../../store/nomenclador/nomenclador.actions';
import { selectParticularRows, selectValorUb } from '../../store/nomenclador/nomenclador.selectors';

// MOCK — el precio particular se persistirá vía coverages; hoy NomencladorService lo guarda en memoria.

/**
 * Tab "Precio particular" de la pantalla NBU (KAN-118, task 6).
 *
 * Muestra una card con el valor U.B. editable y una tabla con el precio derivado
 * (cantidadUb × valorUb) por análisis, con soporte de override manual inline.
 */
@Component({
  selector: 'lab-nbu-particular-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyArPipe, FormsModule],
  template: `
    <!-- Card: Valor U.B. particular -->
    <div class="mb-4 p-4 bg-[var(--ds-surface,#fff)] border border-[var(--ds-border,#e4e4e7)] rounded-lg shadow-sm">
      <div class="flex flex-wrap items-end gap-3">
        <div class="flex-1 min-w-[200px]">
          <label class="block text-xs font-medium text-[var(--ds-text-muted,#71717a)] mb-1">
            Valor U.B. particular ($) —
            <span class="font-semibold text-[var(--ds-text,#18181b)]" data-testid="valor-ub-actual">{{ valorUb() }}</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            data-testid="valor-ub-input"
            class="w-full border border-[var(--ds-border,#e4e4e7)] rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#4f46e5)]"
            [(ngModel)]="valorUbEdit"
          />
        </div>
        <button
          type="button"
          data-testid="guardar-valor-btn"
          class="px-4 py-1.5 bg-[var(--brand-primary,#4f46e5)] text-white text-sm font-medium rounded hover:opacity-90 transition-opacity"
          (click)="guardarValorDesdeInput()"
        >
          Guardar
        </button>
      </div>
      <p class="mt-2 text-xs text-[var(--ds-text-muted,#71717a)]">
        <i class="pi pi-info-circle mr-1"></i>
        Este valor se configura en el laboratorio, no en Obras Sociales.
      </p>
    </div>

    <!-- Tabla de precios derivados -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="border-b border-[var(--ds-border,#e4e4e7)] text-xs text-[var(--ds-text-muted,#71717a)] uppercase">
          <tr>
            <th class="px-3 py-2 text-left">Código</th>
            <th class="px-3 py-2 text-left">Análisis</th>
            <th class="px-3 py-2 text-left">Familia</th>
            <th class="px-3 py-2 text-right">Cant. U.B.</th>
            <th class="px-3 py-2 text-right">Precio particular</th>
            <th class="px-3 py-2 text-center">Origen</th>
            <th class="px-3 py-2 text-center">Acción</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.id) {
            @if (editing() === row.id) {
              <!-- Fila en modo edición inline -->
              <tr class="border-b border-[var(--ds-border,#e4e4e7)] bg-[var(--ds-surface-alt,#f4f4f5)]">
                <td class="px-3 py-2 font-mono font-medium">{{ row.shortCode }}</td>
                <td class="px-3 py-2">{{ row.name }}</td>
                <td class="px-3 py-2 text-[var(--ds-text-muted,#71717a)]">{{ row.familyName ?? '—' }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ row.cantidadUb ?? '—' }}</td>
                <td class="px-3 py-2 text-right" colspan="1">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    data-testid="override-input"
                    class="w-28 border border-[var(--ds-border,#e4e4e7)] rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#4f46e5)]"
                    [(ngModel)]="overrideEdit"
                  />
                </td>
                <td class="px-3 py-2 text-center">—</td>
                <td class="px-3 py-2 text-center">
                  <div class="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      data-testid="confirmar-override-btn"
                      class="text-xs px-2 py-1 bg-[var(--brand-primary,#4f46e5)] text-white rounded hover:opacity-90"
                      (click)="confirmarOverride(row.id, overrideEdit)"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      data-testid="cancelar-override-btn"
                      class="text-xs px-2 py-1 border border-[var(--ds-border,#e4e4e7)] rounded hover:bg-[var(--ds-surface-alt,#f4f4f5)]"
                      (click)="editing.set(null)"
                    >
                      Cancelar
                    </button>
                  </div>
                </td>
              </tr>
            } @else {
              <!-- Fila normal -->
              <tr class="border-b border-[var(--ds-border,#e4e4e7)] hover:bg-[var(--ds-surface-alt,#f4f4f5)]">
                <td class="px-3 py-2 font-mono font-medium">{{ row.shortCode }}</td>
                <td class="px-3 py-2">{{ row.name }}</td>
                <td class="px-3 py-2 text-[var(--ds-text-muted,#71717a)]">{{ row.familyName ?? '—' }}</td>
                <td class="px-3 py-2 text-right tabular-nums">
                  @if (row.cantidadUb == null) {
                    <span class="text-[var(--ds-text-muted,#71717a)] italic">Sin U.B.</span>
                  } @else {
                    {{ row.cantidadUb }}
                  }
                </td>
                <td class="px-3 py-2 text-right tabular-nums">
                  @if (row.esManual) {
                    <div class="flex flex-col items-end gap-0.5">
                      <span class="line-through text-[var(--ds-text-muted,#71717a)] text-xs">{{ row.auto | currencyAr }}</span>
                      <span class="font-medium">{{ row.precio | currencyAr }}</span>
                    </div>
                  } @else if (row.precio == null) {
                    <span class="text-[var(--ds-text-muted,#71717a)] italic">Sin U.B.</span>
                  } @else {
                    <span>{{ row.precio | currencyAr }}</span>
                  }
                </td>
                <td class="px-3 py-2 text-center">
                  @if (row.esManual) {
                    <span class="inline-block text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                      Manual
                    </span>
                  } @else if (row.cantidadUb == null) {
                    <span class="text-[var(--ds-text-muted,#71717a)] text-xs">Sin U.B.</span>
                  } @else {
                    <span class="text-[var(--ds-text-muted,#71717a)] text-xs">Automático</span>
                  }
                </td>
                <td class="px-3 py-2 text-center">
                  <div class="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      data-testid="editar-override-btn"
                      class="text-xs text-[var(--brand-primary,#4f46e5)] hover:underline"
                      (click)="iniciarEdicion(row.id, row.precio)"
                    >
                      Editar
                    </button>
                    @if (row.esManual) {
                      <button
                        type="button"
                        data-testid="revertir-override-btn"
                        class="text-xs text-red-500 hover:underline"
                        (click)="limpiarOverride(row.id)"
                      >
                        Revertir
                      </button>
                    }
                  </div>
                </td>
              </tr>
            }
          } @empty {
            <tr>
              <td colspan="7" class="px-3 py-8 text-center text-sm text-[var(--ds-text-muted,#71717a)]">
                Sin análisis en el catálogo.
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class NbuParticularTabComponent implements OnInit {
  private readonly store = inject(Store);

  /** Filas del catálogo con precio derivado y flag de override manual. */
  protected readonly rows = this.store.selectSignal(selectParticularRows);

  /** Valor U.B. actual del store. */
  protected readonly valorUb = this.store.selectSignal(selectValorUb);

  /** Id de la fila actualmente en edición inline (null = ninguna). */
  readonly editing = signal<number | null>(null);

  /** Valor transitorio del input de valor U.B. (se sincroniza con el store al Guardar). */
  protected valorUbEdit: number = 0;

  ngOnInit(): void {
    // Inicializa el input con el valor actual del store para que el usuario lo vea
    this.valorUbEdit = this.valorUb();
  }

  /** Valor transitorio del input de override inline. */
  protected overrideEdit: number = 0;

  /** Despacha saveValorUb con el valor ingresado en la card. */
  guardarValorDesdeInput(): void {
    this.guardarValor(this.valorUbEdit);
  }

  /** Despacha saveValorUb({ valor }). Público para tests. */
  guardarValor(valor: number): void {
    this.store.dispatch(saveValorUb({ valor }));
  }

  /** Abre la fila en modo edición con el precio actual como valor inicial. */
  iniciarEdicion(id: number, precioActual: number | null): void {
    this.overrideEdit = precioActual ?? 0;
    this.editing.set(id);
  }

  /** Confirma el override manual para el análisis indicado. */
  confirmarOverride(analysisId: number, precio: number): void {
    this.store.dispatch(setOverride({ analysisId, precio }));
    this.editing.set(null);
  }

  /** Revierte el override manual (precio vuelve al automático). */
  limpiarOverride(analysisId: number): void {
    this.store.dispatch(setOverride({ analysisId, precio: null }));
  }
}
