import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { TableColumn } from '@shared/ui/models/table-column.model';
import { saveValorUb, setOverride } from '../../store/nomenclador/nomenclador.actions';
import { selectParticularRows, selectValorUb } from '../../store/nomenclador/nomenclador.selectors';
import { matchesFilter } from './nbu-filter';

/**
 * Tab "Precio particular" de la pantalla NBU (KAN-118).
 *
 * Card con el valor U.B. editable + tabla (ui-table genérico) con el precio derivado
 * (cantidadUb × valorUb) por análisis y override manual editable inline en la propia celda.
 */
@Component({
  selector: 'lab-nbu-particular-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyArPipe, FormsModule, DataTableComponent, UiCellDirective],
  template: `
    <!-- Card: Valor U.B. particular (inline) -->
    <div class="mb-4 flex flex-wrap items-center gap-4 p-4 bg-white border border-[var(--ds-border,#e4e4e7)] rounded-lg shadow-sm">
      <div class="flex items-center gap-2">
        <i class="pi pi-dollar text-[var(--brand-primary,#4f46e5)]"></i>
        <span class="text-sm font-semibold text-[var(--ds-text,#18181b)]">Valor U.B. particular</span>
      </div>
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ds-text-muted,#71717a)] font-semibold pointer-events-none">$</span>
        <input
          type="number" min="0" step="0.01" data-testid="valor-ub-input"
          class="w-44 border border-[var(--ds-border,#e4e4e7)] rounded-lg pl-7 pr-3 py-2.5 text-lg font-bold text-[var(--brand-primary,#4f46e5)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#4f46e5)]"
          [(ngModel)]="valorUbEdit" />
      </div>
      <button
        type="button" data-testid="guardar-valor-btn"
        class="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[var(--brand-primary,#4f46e5)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        (click)="guardarValorDesdeInput()">
        <i class="pi pi-check"></i> Guardar
      </button>
      <p class="text-xs text-[var(--ds-text-muted,#71717a)] ml-auto max-w-[380px] leading-snug">
        <i class="pi pi-info-circle mr-1"></i>
        Precio = <b>cantidad U.B.</b> (de la versión NBU elegida arriba) × <b>valor U.B.</b> Configurado a nivel laboratorio, sin pasar por Obras Sociales.
      </p>
    </div>

    <!-- Tabla de precios derivados (ui-table) -->
    <ui-table
      [value]="filteredRows()"
      [columns]="columns"
      [paginator]="true"
      [rows]="20"
      [rowsPerPageOptions]="[10, 20, 50, 100]"
      size="comfortable"
      dataKey="id"
      emptyHeading="Sin análisis en el catálogo"
      emptyIcon="pi-dollar">

      <ng-template uiCell="familyName" let-row>
        @if ($any(row).familyName) {
          <span class="inline-block text-xs rounded px-2 py-0.5 bg-[var(--brand-tint,#eff6ff)] text-[var(--brand-primary,#2563eb)]">
            {{ $any(row).familyName }}
          </span>
        } @else { <span class="text-[var(--ds-text-muted,#71717a)]">—</span> }
      </ng-template>

      <ng-template uiCell="cantidadUb" let-row>
        @if ($any(row).cantidadUb == null) {
          <span class="text-[var(--ds-text-muted,#71717a)] italic">Sin U.B.</span>
        } @else {
          <span class="tabular-nums">{{ ub($any(row).cantidadUb) }}</span>
        }
      </ng-template>

      <!-- Precio: edición inline en la propia celda -->
      <ng-template uiCell="precio" let-row>
        @if (editing() === $any(row).id) {
          <input
            type="number" min="0" step="0.01" data-testid="override-input"
            class="w-32 border border-[var(--brand-primary,#4f46e5)] rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#4f46e5)]"
            [(ngModel)]="overrideEdit" (keydown.enter)="confirmarOverride($any(row).id, overrideEdit)" />
        } @else if ($any(row).esManual) {
          <div class="flex flex-col items-end gap-0.5">
            <span class="line-through text-[var(--ds-text-muted,#71717a)] text-xs">{{ $any(row).auto | currencyAr }}</span>
            <span class="font-medium tabular-nums">{{ $any(row).precio | currencyAr }}</span>
          </div>
        } @else if ($any(row).precio == null) {
          <span class="text-[var(--ds-text-muted,#71717a)] italic">Sin U.B.</span>
        } @else {
          <span class="tabular-nums">{{ $any(row).precio | currencyAr }}</span>
        }
      </ng-template>

      <ng-template uiCell="origen" let-row>
        @if ($any(row).esManual) {
          <span class="inline-block text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Manual</span>
        } @else if ($any(row).cantidadUb == null) {
          <span class="text-[var(--ds-text-muted,#71717a)] text-xs">Sin U.B.</span>
        } @else {
          <span class="text-[var(--ds-text-muted,#71717a)] text-xs">Automático</span>
        }
      </ng-template>

      <ng-template uiCell="acciones" let-row>
        @if (editing() === $any(row).id) {
          <div class="flex items-center justify-center gap-2">
            <button type="button" data-testid="confirmar-override-btn"
                    class="text-xs px-2 py-1 bg-[var(--brand-primary,#4f46e5)] text-white rounded hover:opacity-90"
                    (click)="confirmarOverride($any(row).id, overrideEdit)">Confirmar</button>
            <button type="button" data-testid="cancelar-override-btn"
                    class="text-xs px-2 py-1 border border-[var(--ds-border,#e4e4e7)] rounded hover:bg-[var(--ds-surface-alt,#f4f4f5)]"
                    (click)="editing.set(null)">Cancelar</button>
          </div>
        } @else {
          <div class="flex items-center justify-center gap-2">
            <button type="button" data-testid="editar-override-btn"
                    class="text-xs text-[var(--brand-primary,#4f46e5)] hover:underline"
                    (click)="iniciarEdicion($any(row).id, $any(row).precio)">Editar</button>
            @if ($any(row).esManual) {
              <button type="button" data-testid="revertir-override-btn"
                      class="text-xs text-red-500 hover:underline"
                      (click)="limpiarOverride($any(row).id)">Revertir</button>
            }
          </div>
        }
      </ng-template>
    </ui-table>
  `,
})
export class NbuParticularTabComponent implements OnInit {
  private readonly store = inject(Store);

  /** Filtros provistos por el shell (búsqueda + familias seleccionadas). */
  readonly search = input<string>('');
  readonly families = input<readonly string[]>([]);

  /** Filas del catálogo con precio derivado y flag de override manual. */
  private readonly allRows = this.store.selectSignal(selectParticularRows);

  /** Filas tras aplicar búsqueda + filtro de familia. */
  protected readonly filteredRows = computed(() =>
    this.allRows().filter(r => matchesFilter(r, this.search(), this.families())),
  );

  /** Valor U.B. actual del store. */
  protected readonly valorUb = this.store.selectSignal(selectValorUb);

  readonly columns: readonly TableColumn[] = [
    { field: 'shortCode', header: 'Código' },
    { field: 'name', header: 'Análisis' },
    { field: 'familyName', header: 'Familia' },
    { field: 'cantidadUb', header: 'Cant. U.B.', align: 'right' },
    { field: 'precio', header: 'Precio particular', align: 'right' },
    { field: 'origen', header: 'Origen', align: 'center' },
    { field: 'acciones', header: '', align: 'center' },
  ];

  /** Id de la fila actualmente en edición inline (null = ninguna). */
  readonly editing = signal<number | null>(null);

  /** Valor transitorio del input de valor U.B. (se sincroniza con el store al Guardar). */
  protected valorUbEdit = 0;

  /** Valor transitorio del input de override inline. */
  protected overrideEdit = 0;

  ngOnInit(): void {
    this.valorUbEdit = this.valorUb();
  }

  /** Formatea cantidad de U.B. a 2 decimales. */
  protected ub(value: number): string {
    return value.toFixed(2).replace('.', ',');
  }

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
