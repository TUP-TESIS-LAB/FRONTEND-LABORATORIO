import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { race, take } from 'rxjs';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { TableColumn } from '@shared/ui/models/table-column.model';
import { CoverageCatalog, EMPTY_CATALOG, insurerNameForPlan, planName } from '@features/pacientes/models/coverage-catalog.model';
import { CoverageCatalogService } from '@features/pacientes/services/coverage-catalog.service';
import { Doctor } from '@features/medicos/models/doctor.model';
import { DoctorService } from '@features/medicos/services/doctor.service';
import { AnalysisDetail, AttentionResponse } from '../../../../../models/atencion.model';
import { FinalizeAttentionModalComponent } from '../../../../../components/finalize-attention-modal/finalize-attention-modal.component';
import {
  atencionMutationFailure,
  atencionMutationSuccess,
  downloadProtocolLabels,
  endSecretaryPhase,
  loadAtencion,
  loadAttentionAnalyses,
  loadAttentionPatient,
  loadPricing,
  removeAnalysisFromResumen,
  setAuthorizationNumber,
  setCopayment,
} from '../../../../../store/atencion/atencion.actions';
import {
  selectAuthorizationMutating,
  selectCopaymentMutating,
  selectMutating,
  selectPricing,
  selectPricingLoading,
  selectRemovingAnalysis,
  selectResolvedPatient,
  selectSummaryAnalyses,
} from '../../../../../store/atencion/atencion.selectors';
import { clearAtencionSession } from '../../../../../utils/atencion-session-store';

@Component({
  selector: 'lab-resumen-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FinalizeAttentionModalComponent, InputNumberModule, InputTextModule, FormsModule,
    CurrencyArPipe, DataTableComponent, UiCellDirective, TagModule,
  ],
  styles: [`:host { display: block; height: 100%; }`],
  template: `
    <div class="flex flex-col h-full min-h-0 space-y-4">
      <!-- Datos en 2 columnas: Paciente/Cobertura a la izquierda, Médico/Indicaciones a la derecha. -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
        <section>
          <div class="text-sm opacity-60">Paciente</div>
          @if (patient(); as p) {
            <div class="text-base font-medium">{{ p.lastName }}, {{ p.firstName }}</div>
            <div class="text-sm opacity-70">DNI {{ p.dni }}</div>
          } @else {
            <div class="text-base">ID {{ atencion().patientId ?? '—' }}</div>
          }
        </section>

        <section>
          <div class="text-sm opacity-60">Médico solicitante</div>
          <div class="text-base">{{ doctorLabel() }}</div>
        </section>

        <section>
          <div class="text-sm opacity-60">Cobertura</div>
          <div class="text-base">{{ coverageLabel() }}</div>
          <!-- Item 4: Nro de autorización (uno por atención) — solo con obra social. -->
          @if (atencion().insurancePlanId != null) {
            <div class="flex items-center gap-2 mt-2">
              <label class="opacity-60 text-sm" for="auth-input">Nro de autorización</label>
              <input pInputText id="auth-input" type="text" [ngModel]="authorizationValue()"
                     (ngModelChange)="authorizationValue.set($event)" (blur)="onAuthorizationBlur()"
                     [disabled]="authorizationMutating() || readOnly()" class="w-48" placeholder="Ej. AUTH-1" />
            </div>
          }
        </section>

        <section>
          <div class="text-sm opacity-60">Indicaciones</div>
          <div class="text-base">{{ atencion().indications || '—' }}</div>
        </section>
      </div>

      <!-- C1: Análisis solicitados en tabla genérica striped. T5: scroll interno
           (alto relativo al viewport → más filas a mayor resolución) para que la
           página no crezca en vertical. -->
      <section class="flex-1 min-h-0 flex flex-col">
        <div class="text-sm opacity-60 mb-2">Análisis solicitados ({{ atencion().analysisAuthorizations.length }})</div>
        <ui-table
          [value]="analysisRows()"
          [columns]="analysisColumns()"
          [showDelete]="!readOnly()"
          [scrollHeight]="'flex'"
          emptyHeading="Sin análisis solicitados"
          emptyIcon="pi-flask"
          (rowDelete)="onRemoveAnalysis($any($event).analysisId)">

          <ng-template uiCell="analisis" let-row>
            @if ($any(row).name) {
              {{ $any(row).name }}
              @if ($any(row).nbuCode) {
                <span class="font-mono text-xs opacity-70">· NBU {{ $any(row).nbuCode }}</span>
              }
            } @else {
              #{{ $any(row).analysisId }}
            }
          </ng-template>

          <ng-template uiCell="autorizado" let-row>
            @if ($any(row).isAuthorized) {
              <p-tag value="Autorizado" severity="success" />
            } @else {
              <p-tag value="Particular" severity="warn" />
            }
          </ng-template>

          <ng-template uiCell="precio" let-row>
            @if ($any(row).precioPaciente != null) {
              {{ $any(row).precioPaciente | currencyAr }}
            } @else {
              —
            }
          </ng-template>
        </ui-table>
      </section>

      <!-- Pricing totals — item 7: Subtotal · Copago · Total en una sola fila compacta. -->
      @if (pricing(); as p) {
        <section class="border-t pt-3 flex flex-wrap items-center justify-end gap-x-6 gap-y-2 text-sm">
          <span><span class="opacity-60">Subtotal</span> {{ p.subtotal | currencyAr }}</span>
          <span class="flex items-center gap-2">
            <label class="opacity-60" for="copago-input">Copago</label>
            <p-inputNumber
              inputId="copago-input"
              [ngModel]="copaymentValue()"
              (ngModelChange)="copaymentValue.set($event)"
              (onBlur)="onCopaymentBlur()"
              mode="decimal"
              [minFractionDigits]="2"
              [maxFractionDigits]="2"
              [min]="0"
              [disabled]="copaymentMutating() || readOnly()"
              inputStyleClass="w-32 text-right"
              placeholder="0,00"
            />
          </span>
          <span class="font-semibold text-base"><span class="opacity-60 font-normal">Total</span> {{ liveTotal() | currencyAr }}</span>
        </section>
      } @else if (pricingLoading()) {
        <section class="border-t pt-3">
          <div class="text-sm opacity-60">Calculando precios…</div>
        </section>
      }

      <!-- Item 1: el footer (Volver fase / Finalizar atención) lo provee el contenedor
           (ui-wizard-shell). El step solo conserva el modal de finalización. -->
    </div>

    <!-- Fuera del contenedor flex con space-y-4 para no dejar un hueco bajo el footer. -->
    <lab-finalize-attention-modal
      [visible]="finalizeModalOpen()"
      (confirmed)="onFinalize()"
      (dismissed)="closeFinalize()" />
  `,
})
export class ResumenStepComponent implements OnInit {
  private readonly store      = inject(Store);
  private readonly actions$   = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);
  private readonly doctorsApi = inject(DoctorService);
  private readonly coverageCatalogApi = inject(CoverageCatalogService);

  readonly atencion = input.required<AttentionResponse>();
  readonly finished = output<void>();

  /** Modo solo-lectura (atención terminal / post-secretaría): oculta toda acción mutadora. */
  readonly readOnly = input<boolean>(false);

  /** Médico solicitante resuelto por id (NEW-A). Null si no hay médico o aún no cargó. */
  private readonly doctor = signal<Doctor | null>(null);
  /** Etiqueta del médico solicitante para el resumen: "Apellido, Nombre — Mat. {tuition}". */
  readonly doctorLabel = computed<string>(() => {
    if (this.atencion().doctorId == null) return 'Sin médico solicitante';
    const d = this.doctor();
    if (!d) return '—';
    return `${d.lastName}, ${d.firstName} — Mat. ${d.tuition}`;
  });

  /** Catálogo de coberturas para resolver el label de la cobertura de la atención. */
  private readonly catalog = signal<CoverageCatalog>(EMPTY_CATALOG);
  /** Cobertura usada por la atención: "Particular" o "Obra social · Plan · N° afiliado". */
  readonly coverageLabel = computed<string>(() => {
    const planId = this.atencion().insurancePlanId;
    if (planId == null) return 'Particular';
    const cat = this.catalog();
    const cov = this.patient()?.coverages?.find((c) => c.planId === planId);
    const member = cov?.memberNumber ? ` · N° ${cov.memberNumber}` : '';
    return `${insurerNameForPlan(cat, planId)} ${planName(cat, planId)}${member}`;
  });

  readonly finalizeModalOpen  = signal(false);
  readonly mutating           = this.store.selectSignal(selectMutating);
  readonly patient            = this.store.selectSignal(selectResolvedPatient);
  readonly analyses           = this.store.selectSignal(selectSummaryAnalyses);
  readonly pricing            = this.store.selectSignal(selectPricing);
  readonly pricingLoading     = this.store.selectSignal(selectPricingLoading);
  readonly copaymentMutating  = this.store.selectSignal(selectCopaymentMutating);
  readonly authorizationMutating = this.store.selectSignal(selectAuthorizationMutating);
  readonly removingAnalysis   = this.store.selectSignal(selectRemovingAnalysis);

  /** Valor local del input de copago — se inicializa desde la atención y se actualiza al cambiar */
  readonly copaymentValue = signal<number | null>(null);

  /** Valor local del input "Nro de autorización" (item 4) — se inicializa desde la atención. */
  readonly authorizationValue = signal<string | null>(null);

  readonly analysisById = computed(
    // `summaryAnalyses` se carga con AnalysisService.getById → AnalysisDetail (trae nbuCode/name),
    // aunque el slice del store esté tipado como Analysis. Widening seguro para exponer el NBU.
    () => new Map((this.analyses() as AnalysisDetail[]).map(a => [a.id, a]))
  );

  /**
   * Carga reactiva de los detalles de análisis.
   *
   * Antes esto vivía como dispatch one-shot en ngOnInit con un snapshot de
   * `atencion().analysisAuthorizations`. Problema: el wizard puede montar el
   * resumen con una atención cuyo set de autorizaciones todavía no refleja lo
   * cargado en el paso 2 (loadAtencion refresca async DESPUÉS). En esa carrera
   * `summaryAnalyses` quedaba sin los análisis que el `@for` termina mostrando
   * y la fila caía al fallback `#{id}` en vez del nombre + NBU.
   *
   * Con un effect, re-disparamos loadAttentionAnalyses cada vez que cambia el
   * set de autorizaciones (agregar/quitar análisis, refresh del detail), así
   * los detalles siempre cubren lo que se renderiza. `lastLoadedKey` deduplica
   * para no re-pegar al back cuando cambia otra cosa de la atención (copago,
   * pricing) sin que cambien los ids.
   */
  private lastLoadedKey = '';
  private readonly analysesLoader = effect(() => {
    const ids = this.atencion().analysisAuthorizations.map(a => a.analysisId);
    if (ids.length === 0) return;
    const key = ids.join(',');
    if (key === this.lastLoadedKey) return;
    this.lastLoadedKey = key;
    this.store.dispatch(loadAttentionAnalyses({ analysisIds: ids }));
  });

  readonly pricingById = computed(() => {
    const p = this.pricing();
    if (!p) return new Map<number, { precioPaciente: number }>();
    return new Map(p.items.map(item => [item.analysisId, item]));
  });

  /**
   * Item 2: la cobertura Particular (sin obra social) oculta la columna "Autorizado".
   * Fuente de verdad: `atencion().insurancePlanId` (null ⇒ Particular).
   */
  readonly isParticular = computed(() => this.atencion().insurancePlanId == null);

  /** Columnas de la tabla de análisis solicitados (C1); "Autorizado" solo con obra social. */
  readonly analysisColumns = computed<readonly TableColumn[]>(() => {
    const cols: TableColumn[] = [{ field: 'analisis', header: 'Análisis' }];
    if (!this.isParticular()) cols.push({ field: 'autorizado', header: 'Autorizado', align: 'center' });
    cols.push({ field: 'precio', header: 'Precio', align: 'right' });
    return cols;
  });

  /**
   * Filas para la tabla genérica (C1): combina cada autorización con el detalle
   * del análisis (nombre + NBU) y su precio resuelto. `analysisId` se conserva
   * como `dataKey`/identificador para la acción de quitar fila.
   */
  readonly analysisRows = computed(() =>
    this.atencion().analysisAuthorizations.map((a) => {
      const info = this.analysisById().get(a.analysisId);
      const priceItem = this.pricingById().get(a.analysisId);
      return {
        analysisId: a.analysisId,
        name: info?.name ?? null,
        nbuCode: info?.nbuCode ?? null,
        isAuthorized: a.isAuthorized,
        precioPaciente: priceItem?.precioPaciente ?? null,
      };
    })
  );

  /**
   * Total EN VIVO: subtotal del pricing + el coseguro tipeado en el input.
   * El backend computa total = subtotal + copayment; replicamos esa fórmula localmente
   * para que el total se recalcule mientras la secretaria escribe el monto, sin esperar
   * al blur + round-trip que persiste y refresca el pricing. Cuando el pricing vuelve del
   * backend ya incluye el copago, y como copaymentValue queda igual, el número coincide.
   */
  readonly liveTotal = computed<number | null>(() => {
    const p = this.pricing();
    if (!p) return null;
    return p.subtotal + (this.copaymentValue() ?? 0);
  });

  ngOnInit(): void {
    const attn = this.atencion();

    // Refrescar el detail para que analysisAuthorizations refleje lo cargado en el paso 2.
    this.store.dispatch(loadAtencion({ id: attn.id }));

    // Initialize copago from attention
    this.copaymentValue.set(attn.copaymentAmount ?? null);

    // Initialize nro de autorización from attention (item 4).
    this.authorizationValue.set(attn.authorizationNumber ?? null);

    // Only load patient if not already resolved for this atención
    if (
      attn.patientId != null &&
      (this.patient() === null || this.patient()?.id !== attn.patientId)
    ) {
      this.store.dispatch(loadAttentionPatient({ patientId: attn.patientId }));
    }

    // Los detalles de análisis se cargan reactivamente — ver `analysesLoader`.

    // Load pricing for this attention
    this.store.dispatch(loadPricing({ attentionId: attn.id }));

    // Catálogo de coberturas para resolver el nombre de la obra social + plan de
    // la cobertura usada por la atención (fila "Cobertura" del resumen). Errores
    // silenciados (catchError → EMPTY) para no romper el resumen si el HTTP falla.
    this.coverageCatalogApi.getCatalog().pipe(
      catchError(() => EMPTY),
    ).subscribe((cat) => this.catalog.set(cat));

    // Médico solicitante (NEW-A): resolvemos el nombre+matrícula por id. Errores
    // silenciados (catchError → EMPTY) para no romper el resumen si el HTTP falla.
    if (attn.doctorId != null) {
      this.doctorsApi.getById(attn.doctorId).pipe(
        catchError(() => EMPTY),
      ).subscribe((d) => this.doctor.set(d));
    }
  }

  onRemoveAnalysis(analysisId: number): void {
    const attn = this.atencion();
    const reducedItems = attn.analysisAuthorizations
      .filter(a => a.analysisId !== analysisId)
      .map(a => ({ analysisId: a.analysisId, isAuthorized: a.isAuthorized }));
    this.store.dispatch(removeAnalysisFromResumen({
      attentionId: attn.id,
      analysisId,
      payload: {
        items: reducedItems,
        isUrgent: attn.isUrgent,
        authorizationNumber: attn.authorizationNumber,
      },
    }));
  }

  onCopaymentBlur(): void {
    const attn = this.atencion();
    const amount = this.copaymentValue();
    // Only dispatch if the value actually changed
    const current = attn.copaymentAmount ?? null;
    if (amount === current) return;
    this.store.dispatch(setCopayment({ attentionId: attn.id, copaymentAmount: amount }));
  }

  /**
   * Item 4: persiste el nro de autorización vía el endpoint dedicado (espeja el copago).
   * Dedup contra el valor actual; normaliza string vacío/espacios a null.
   */
  onAuthorizationBlur(): void {
    const attn = this.atencion();
    const value = this.authorizationValue();
    const current = attn.authorizationNumber ?? null;
    const normalized = value && value.trim() !== '' ? value.trim() : null;
    if (normalized === current) return;
    this.store.dispatch(setAuthorizationNumber({ attentionId: attn.id, authorizationNumber: normalized }));
  }

  openFinalize(): void  { this.finalizeModalOpen.set(true); }
  closeFinalize(): void { this.finalizeModalOpen.set(false); }

  /**
   * Finalizar la atención — pessimistic UI.
   *
   * Dispatchamos endSecretaryPhase y SOLO emitimos `finished` + limpiamos
   * session storage cuando llega `atencionMutationSuccess`. Si la mutación
   * falla, el usuario queda en el wizard con el estado actual y puede
   * reintentar — antes navegaba afuera y perdía contexto.
   *
   * (Se quitó el flag `printTicket`: era un stub vacío y no existe comprobante
   *  de atención. Ver FinalizeAttentionModalComponent para el detalle.)
   */
  onFinalize(): void {
    this.finalizeModalOpen.set(false);
    this.store.dispatch(endSecretaryPhase({ id: this.atencion().id }));
    this.waitForMutation((success) => {
      if (!success) return; // backend rechazó — el wizard queda como está, no salimos
      // Auto-descarga de rótulos: al finalizar la fase de secretaría el backend
      // ya generó un rótulo por análisis. Disparamos la descarga del PDF sin que el
      // operador tenga que ir al listado y clickear "Rótulos" a mano.
      // El protocolId fresco viene en el item del success (recién se le asigna el
      // protocolo al cerrar la fase); caemos a la atención actual por si acaso.
      const protocolId = success.item.protocolId ?? this.atencion().protocolId;
      if (protocolId != null) {
        this.store.dispatch(downloadProtocolLabels({ protocolId, protocolNumber: `P-${protocolId}` }));
      }
      clearAtencionSession();
      this.finished.emit();
    });
  }

  private waitForMutation(cb: (success: ReturnType<typeof atencionMutationSuccess> | null) => void): void {
    race(
      this.actions$.pipe(ofType(atencionMutationSuccess), take(1)),
      this.actions$.pipe(ofType(atencionMutationFailure), take(1)),
    )
      // Pasamos destroyRef explícito porque waitForMutation se llama fuera del
      // injection context (desde un click handler), donde takeUntilDestroyed()
      // sin argumentos lanza NG0203.
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((action) => cb(action.type === atencionMutationSuccess.type ? action : null));
  }
}
