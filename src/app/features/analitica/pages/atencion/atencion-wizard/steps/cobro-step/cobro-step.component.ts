import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { TableColumn } from '@shared/ui/models/table-column.model';
import { loadAttentionAnalyses, loadPricing, setCopayment } from '@features/analitica/store/atencion/atencion.actions';
import {
  selectCopaymentMutating, selectPricing, selectSummaryAnalyses,
} from '@features/analitica/store/atencion/atencion.selectors';
import { AnalysisDetail, AttentionResponse } from '../../../../../models/atencion.model';

@Component({
  selector: 'lab-cobro-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyArPipe, FormsModule, InputNumberModule, TagModule, DataTableComponent, UiCellDirective],
  template: `
    <div class="flex flex-col h-full min-h-0 p-2">
      <p class="text-sm text-surface-500 mb-4">Cargá el copago del paciente. Al continuar, pasás a la facturación y el registro del cobro.</p>

      <!-- Dos columnas: tabla desglosada por análisis a la izquierda (ancho flexible)
           y card de resumen fija a la derecha, en vez de filas de cierre apiladas
           debajo de la tabla — evita que el card crezca en alto y fuerce scroll.
           La tabla lleva su propio scroll interno (scrollHeight="flex") para que la
           lista de ítems no empuje el alto del paso al scroll del shell. -->
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 flex-1 min-h-0">
        <div class="flex flex-col min-h-0">
          <ui-table
            [value]="itemRows()"
            [columns]="itemColumns"
            [scrollHeight]="'flex'"
            dataKey="analysisId"
            emptyHeading="Calculando…"
            emptyIcon="pi-wallet">

            <ng-template uiCell="item" let-row>
              <span class="font-medium">{{ $any(row).name ?? ('#' + $any(row).analysisId) }}</span>
            </ng-template>

            <ng-template uiCell="estado" let-row>
              @if ($any(row).authorized) {
                <p-tag value="Autorizado" severity="success" styleClass="cobro-tag" />
              } @else {
                <p-tag value="Particular" severity="warn" styleClass="cobro-tag" />
              }
            </ng-template>

            <ng-template uiCell="acargo" let-row>
              <span class="font-semibold">{{ $any(row).precioPaciente | currencyAr }}</span>
            </ng-template>
          </ui-table>
        </div>

        <div class="border border-surface-200 rounded-xl shadow-sm p-4 self-start">
          <div class="text-xs font-medium uppercase tracking-wide text-surface-400 mb-3">Resumen</div>
          <div class="flex items-center justify-between text-sm mb-2">
            <span class="text-surface-500">Estudios a cargo</span>
            <span class="font-semibold">{{ pricing()?.subtotal ?? 0 | currencyAr }}</span>
          </div>
          <div class="flex items-center justify-between text-sm mb-2 gap-2">
            <label for="copago-input" class="text-surface-500">Copago</label>
            <p-inputNumber
              inputId="copago-input"
              [ngModel]="copaymentValue()"
              (ngModelChange)="copaymentValue.set($event)"
              (onFocus)="selectAllText($event)"
              (onBlur)="onCopaymentBlur()"
              mode="decimal" [minFractionDigits]="2" [maxFractionDigits]="2" [min]="0"
              [disabled]="copaymentMutating()"
              inputStyleClass="w-28 text-right" placeholder="0,00" />
          </div>
          <div class="border-t pt-3 mt-1" style="border-color: var(--brand-primary);">
            <div class="text-xs text-surface-500 mb-1">A cobrar al paciente</div>
            <div class="text-2xl font-bold" style="color: var(--brand-primary);">{{ pricing()?.total ?? 0 | currencyAr }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* El paso llena el alto que le da el shell ([bodyFill]) para que el scroll caiga
       dentro de la tabla y no en el stepper. */
    :host { display: block; height: 100%; }
    ::ng-deep .cobro-tag.p-tag {
      font-size: 0.7rem;
      padding: 0.15rem 0.5rem;
    }
  `],
})
export class CobroStepComponent implements OnInit {
  /** Columnas del desglose por análisis. "A cargo" no envuelve: ui-table ya aplica nowrap en los th. */
  protected readonly itemColumns: readonly TableColumn[] = [
    { field: 'item',   header: 'Ítem' },
    { field: 'estado', header: 'Estado', align: 'center' },
    { field: 'acargo', header: 'A cargo', align: 'right' },
  ];

  private readonly store = inject(Store);

  readonly atencion = input.required<AttentionResponse>();

  protected readonly pricing = this.store.selectSignal(selectPricing);
  protected readonly copaymentMutating = this.store.selectSignal(selectCopaymentMutating);
  protected readonly analyses = this.store.selectSignal(selectSummaryAnalyses);

  /** Copago manual único (como antes) — la tabla de arriba es solo el desglose visual de los estudios. */
  protected readonly copaymentValue = signal<number | null>(null);

  protected readonly analysisById = computed(
    () => new Map((this.analyses() as AnalysisDetail[]).map((a) => [a.id, a])),
  );

  /** Filas de la tabla: cada ítem de pricing con su nombre resuelto vía analysisById. */
  protected readonly itemRows = computed(() => {
    const p = this.pricing();
    if (!p) return [];
    return p.items.map((item) => ({
      analysisId: item.analysisId,
      name: this.analysisById().get(item.analysisId)?.name ?? null,
      authorized: item.authorized,
      precioPaciente: item.precioPaciente,
    }));
  });

  /** Carga los nombres de análisis apenas conocemos los ids de pricing (dedup por key, igual que resumen-step). */
  private lastLoadedKey = '';
  private readonly analysesLoader = effect(() => {
    const ids = (this.pricing()?.items ?? []).map((i) => i.analysisId);
    if (ids.length === 0) return;
    const key = ids.join(',');
    if (key === this.lastLoadedKey) return;
    this.lastLoadedKey = key;
    this.store.dispatch(loadAttentionAnalyses({ analysisIds: ids }));
  });

  constructor() {
    // Inicializa/sincroniza el input con el copago persistido (reflejado en pricing.copayment).
    let seeded = false;
    effect(() => {
      const p = this.pricing();
      // Copago 0 se siembra como null para que el input quede vacío (placeholder "0,00")
      // y el operador pueda escribir de una, sin tener que borrar el "0,00".
      if (!seeded && p) { this.copaymentValue.set(p.copayment || null); seeded = true; }
    });
  }

  ngOnInit(): void {
    this.store.dispatch(loadPricing({ attentionId: this.atencion().id }));
  }

  /** Selecciona todo el texto al enfocar para poder tipear encima de un copago ya cargado. */
  selectAllText(event: Event): void {
    (event.target as HTMLInputElement | null)?.select();
  }

  onCopaymentBlur(): void {
    // null (campo vacío) y 0 son equivalentes: sin copago. Normalizamos para no
    // disparar una mutación espuria cuando el operador solo entra y sale del campo.
    const amount = this.copaymentValue() ?? 0;
    const current = this.pricing()?.copayment ?? 0;
    if (amount === current) return;
    this.store.dispatch(setCopayment({ attentionId: this.atencion().id, copaymentAmount: amount }));
  }
}
