import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { CoverageCatalog, EMPTY_CATALOG, insurerNameForPlan, planName } from '@features/pacientes/models/coverage-catalog.model';
import { CoverageCatalogService } from '@features/pacientes/services/coverage-catalog.service';
import { loadAttentionAnalyses, loadPricing, setCopayment } from '@features/analitica/store/atencion/atencion.actions';
import {
  selectCopaymentMutating, selectPricing, selectResolvedPatient, selectSummaryAnalyses,
} from '@features/analitica/store/atencion/atencion.selectors';
import { AnalysisDetail, AttentionResponse } from '../../../../../models/atencion.model';

@Component({
  selector: 'lab-cobro-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyArPipe, FormsModule, InputNumberModule, TagModule],
  template: `
    <div class="p-2">
      <p class="text-sm text-surface-500 mb-4">Cargá el copago del paciente. Al continuar, pasás a la facturación y el registro del cobro.</p>

      <!-- Dos columnas: tabla desglosada por análisis a la izquierda (ancho flexible)
           y card de resumen fija a la derecha, en vez de filas de cierre apiladas
           debajo de la tabla — evita que el card crezca en alto y fuerce scroll. -->
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        <div class="border border-surface-200 rounded-xl overflow-hidden shadow-sm">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-left text-xs font-medium uppercase tracking-wide text-surface-400">
                <th class="px-4 py-2">Ítem</th>
                <th class="px-4 py-2 text-center">Estado</th>
                <th class="px-4 py-2 text-right">A cargo</th>
              </tr>
            </thead>
            <tbody>
              @for (row of itemRows(); track row.analysisId; let i = $index) {
                <tr [style.background]="i % 2 === 1 ? 'var(--ds-surface)' : null">
                  <td class="px-4 py-3">
                    <div class="font-medium">{{ row.name ?? ('#' + row.analysisId) }}</div>
                    <div class="text-xs text-surface-500">{{ coverageLabel() }}</div>
                  </td>
                  <td class="px-4 py-3 text-center">
                    @if (row.authorized) {
                      <p-tag value="Autorizado" severity="success" styleClass="cobro-tag" />
                    } @else {
                      <p-tag value="Particular" severity="warn" styleClass="cobro-tag" />
                    }
                  </td>
                  <td class="px-4 py-3 text-right font-semibold">{{ row.precioPaciente | currencyAr }}</td>
                </tr>
              } @empty {
                <tr><td colspan="3" class="px-4 py-6 text-center text-surface-400">Calculando…</td></tr>
              }
            </tbody>
          </table>
        </div>

        <div class="border border-surface-200 rounded-xl shadow-sm p-4 sticky top-0">
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
    ::ng-deep .cobro-tag.p-tag {
      font-size: 0.7rem;
      padding: 0.15rem 0.5rem;
    }
  `],
})
export class CobroStepComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly coverageCatalogApi = inject(CoverageCatalogService);

  readonly atencion = input.required<AttentionResponse>();

  protected readonly pricing = this.store.selectSignal(selectPricing);
  protected readonly copaymentMutating = this.store.selectSignal(selectCopaymentMutating);
  protected readonly patient = this.store.selectSignal(selectResolvedPatient);
  protected readonly analyses = this.store.selectSignal(selectSummaryAnalyses);

  /** Copago manual único (como antes) — la tabla de arriba es solo el desglose visual de los estudios. */
  protected readonly copaymentValue = signal<number | null>(null);

  /** Catálogo de coberturas para resolver el nombre de la obra social + plan (mismo patrón que resumen-step). */
  private readonly catalog = signal<CoverageCatalog>(EMPTY_CATALOG);
  protected readonly coverageLabel = computed<string>(() => {
    const planId = this.atencion().insurancePlanId;
    if (planId == null) return 'Particular';
    const cat = this.catalog();
    const cov = this.patient()?.coverages?.find((c) => c.planId === planId);
    const member = cov?.memberNumber ? ` · N° ${cov.memberNumber}` : '';
    return `${insurerNameForPlan(cat, planId)} ${planName(cat, planId)}${member}`;
  });

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
    // Errores silenciados (catchError → EMPTY) para no romper el paso si el catálogo falla.
    this.coverageCatalogApi.getCatalog().pipe(
      catchError(() => EMPTY),
    ).subscribe((cat) => this.catalog.set(cat));
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
