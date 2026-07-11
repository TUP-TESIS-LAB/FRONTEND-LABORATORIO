import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { SpecialRule } from '../../../models/liquidaciones.model';

/** Fila editable del editor de tramos: rango [desde, hasta] (hasta null = tramo abierto) + valor U.B. */
export interface TramoRow {
  desde: number;
  hasta: number | null;
  valorUb: number | null;
}

/**
 * Valida que los tramos formen una partición contigua y completa a partir de 1:
 * el primero arranca en 1, cada tramo cerrado enlaza sin hueco ni solape con el
 * siguiente, y todos tienen un valor U.B. > 0. El último tramo queda siempre abierto.
 */
export function validateTramos(rows: TramoRow[]): string | null {
  if (!rows.length) return 'Agregá al menos un tramo.';
  if (rows[0].desde !== 1) return 'El primer tramo debe empezar desde 1 estudio.';
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const last = i === rows.length - 1;
    if (r.valorUb == null || r.valorUb <= 0) return `El valor U.B. del tramo ${i + 1} debe ser mayor a 0.`;
    if (!last) {
      if (r.hasta == null || r.hasta < r.desde) return `El tramo ${i + 1} tiene un rango inválido.`;
      if (rows[i + 1].desde !== r.hasta + 1) return `Hay un hueco o solape entre el tramo ${i + 1} y el ${i + 2}.`;
    }
  }
  return null;
}

/**
 * Mapea las filas del editor a las reglas del backend (SpecialRule): un tramo
 * cerrado es BETWEEN[desde, hasta], el último tramo (abierto) es GREATER_THAN(desde-1).
 * No valida — llamar después de `validateTramos(rows) === null`.
 */
export function tramosToRules(rows: TramoRow[]): SpecialRule[] {
  return rows.map((r, i) => {
    const last = i === rows.length - 1;
    return last && r.hasta == null
      ? { ruleType: 'GREATER_THAN' as const, fromCount: r.desde - 1, amount: r.valorUb! }
      : { ruleType: 'BETWEEN' as const, fromCount: r.desde, toCount: r.hasta!, amount: r.valorUb! };
  });
}

@Component({
  selector: 'fin-tramos-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, InputNumberModule, ButtonModule, CurrencyArPipe],
  template: `
    <table class="liq-tramos" aria-label="Tramos del plan por cantidad de estudios">
      <thead>
        <tr>
          <th scope="col">Desde N° estudios</th>
          <th scope="col">Hasta N° estudios</th>
          <th scope="col">Valor U.B. del tramo</th>
          <th scope="col"><span class="liq-tramos__sr-only">Acciones</span></th>
        </tr>
      </thead>
      <tbody>
        @for (r of rows(); track $index; let last = $last) {
          <tr>
            <td class="liq-tramos__desde">{{ r.desde }}</td>
            <td>
              @if (last) {
                <span class="liq-tramos__open">en adelante</span>
              } @else {
                <p-inputNumber
                  [ngModel]="r.hasta"
                  [min]="r.desde"
                  [showButtons]="false"
                  inputId="tramo-hasta-{{ $index }}"
                  (ngModelChange)="onHastaChange($index, $event)" />
              }
            </td>
            <td>
              <p-inputNumber
                [ngModel]="r.valorUb"
                mode="currency"
                currency="ARS"
                locale="es-AR"
                [min]="0"
                inputId="tramo-valor-{{ $index }}"
                (ngModelChange)="onValorChange($index, $event)" />
            </td>
            <td>
              <p-button
                type="button"
                icon="pi pi-trash"
                severity="danger"
                [text]="true"
                [disabled]="rows().length <= 1"
                ariaLabel="Quitar tramo {{ $index + 1 }}"
                (onClick)="removeRow($index)" />
            </td>
          </tr>
        }
      </tbody>
    </table>

    <p-button
      type="button"
      label="Agregar tramo"
      icon="pi pi-plus"
      severity="secondary"
      [text]="true"
      (onClick)="addRow()" />

    <div class="liq-tramos__cover" role="list" aria-label="Resumen de cobertura por tramo">
      @for (r of rows(); track $index; let last = $last) {
        <span class="liq-tramos__seg" role="listitem">
          {{ last ? (r.desde + '+') : (r.desde + '–' + r.hasta) }}
          <b>{{ r.valorUb ?? 0 | currencyAr }}</b>
        </span>
      }
    </div>

    @if (error()) {
      <p class="liq-tramos__err" role="alert">{{ error() }}</p>
    }
  `,
  styles: [`
    .liq-tramos {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-bottom: var(--space-3);
    }
    .liq-tramos th {
      text-align: left;
      font-size: 12px;
      font-weight: 500;
      color: var(--ds-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 0 var(--space-2) var(--space-2);
    }
    .liq-tramos td {
      padding: var(--space-1) var(--space-2);
      vertical-align: middle;
    }
    .liq-tramos__sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
    .liq-tramos__desde {
      color: var(--ds-text);
      font-weight: 500;
    }
    .liq-tramos__open {
      display: inline-block;
      padding: var(--space-1) var(--space-2);
      color: var(--ds-text-muted);
      font-style: italic;
    }
    .liq-tramos__cover {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin: var(--space-2) 0;
    }
    .liq-tramos__seg {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-1) var(--space-3);
      background: var(--ds-surface);
      border-radius: 999px;
      font-size: 12px;
      color: var(--ds-text-muted);
    }
    .liq-tramos__seg b {
      color: var(--ds-text);
      font-weight: 600;
    }
    .liq-tramos__err {
      font-size: 13px;
      color: var(--ds-danger);
      margin: var(--space-2) 0 0;
    }
  `],
})
export class TramosEditorComponent {
  readonly rows = input.required<TramoRow[]>();
  readonly rowsChange = output<TramoRow[]>();
  readonly validChange = output<boolean>();

  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const message = validateTramos(this.rows());
      this.error.set(message);
      this.validChange.emit(message === null);
    });
  }

  /** Al cerrar el "hasta" de un tramo, autocompleta el "desde" del siguiente (contigüidad). */
  protected onHastaChange(index: number, hasta: number | null): void {
    const current = this.rows();
    const next = current.map((r, i) => (i === index ? { ...r, hasta } : r));
    if (hasta != null && index + 1 < next.length) {
      next[index + 1] = { ...next[index + 1], desde: hasta + 1 };
    }
    this.rowsChange.emit(next);
  }

  protected onValorChange(index: number, valorUb: number | null): void {
    const next = this.rows().map((r, i) => (i === index ? { ...r, valorUb } : r));
    this.rowsChange.emit(next);
  }

  /** Agrega un tramo nuevo al final: cierra el anterior (si estaba abierto) y arranca contiguo. */
  protected addRow(): void {
    const current = this.rows();
    const prevIndex = current.length - 1;
    const prev = current[prevIndex];
    let next = current;
    if (prev && prev.hasta == null) {
      next = current.map((r, i) => (i === prevIndex ? { ...r, hasta: r.desde } : r));
    }
    const closedPrev = next[prevIndex];
    const desde = closedPrev ? closedPrev.hasta! + 1 : 1;
    this.rowsChange.emit([...next, { desde, hasta: null, valorUb: null }]);
  }

  protected removeRow(index: number): void {
    if (this.rows().length <= 1) return;
    const remaining = this.rows().filter((_, i) => i !== index);
    // Re-encadena "desde" para que la partición siga siendo contigua desde 1.
    const relinked = remaining.map((r, i) => (i === 0 ? { ...r, desde: 1 } : r));
    for (let i = 1; i < relinked.length; i++) {
      const prev = relinked[i - 1];
      if (prev.hasta != null) relinked[i] = { ...relinked[i], desde: prev.hasta + 1 };
    }
    this.rowsChange.emit(relinked);
  }
}
