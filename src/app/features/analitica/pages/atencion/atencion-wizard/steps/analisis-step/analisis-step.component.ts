import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, input, output, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { race, take } from 'rxjs';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';
import { Analysis } from '../../../../../models/atencion.model';
import { AnalysisDetailModalComponent } from '../../../../../components/analysis-detail-modal/analysis-detail-modal.component';
import { AnalysisPickerComponent, PickerRow } from '../../../../../components/analysis-picker/analysis-picker.component';
import {
  addAnalysisList,
  advanceUrgent,
  atencionMutationFailure,
  atencionMutationSuccess,
  loadAttentionAnalyses,
  setAuthorizationNumber,
} from '../../../../../store/atencion/atencion.actions';
import { selectAuthorizationMutating, selectDetail, selectMutating, selectSummaryAnalyses } from '../../../../../store/atencion/atencion.selectors';
import {
  AnalisisDraftRow, clearAnalisisDraft, readAnalisisDraft, writeAnalisisDraft,
} from '../../../../../utils/analisis-draft-store';

@Component({
  selector: 'lab-analisis-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, InputTextModule, ToggleSwitchModule, AnalysisPickerComponent, AnalysisDetailModalComponent],
  styles: [`:host { display: block; height: 100%; }`],
  template: `
    <div class="flex flex-col h-full min-h-0 space-y-4">
      <lab-analysis-picker
        [initialItems]="initialItems()"
        [readOnly]="readOnly()"
        [isParticular]="isParticular()"
        (analysisAdded)="onAnalysisAdded($event)"
        (analysisRemoved)="onAnalysisRemoved($event)"
        (itemsChanged)="onItemsChanged($event)"
        (detailRequested)="onDetailRequested($event)">
        <!-- Proyectado a la derecha del buscador; la tabla del picker queda a todo el ancho. -->
        @if (!readOnly()) {
          <div class="flex items-end gap-3">
            @if (detail()?.insurancePlanId != null) {
              <label class="flex flex-col gap-1 text-sm">
                <span class="font-semibold">Código de autorización de obra social</span>
                <input pInputText type="text" [ngModel]="authorizationValue()"
                       (ngModelChange)="authorizationValue.set($event)" (blur)="onAuthorizationBlur()"
                       [disabled]="authorizationMutating()" class="w-56" placeholder="" />
              </label>
            }
            <label class="flex items-center gap-2 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 cursor-pointer select-none whitespace-nowrap">
              <p-toggleswitch [(ngModel)]="isUrgentValue" (ngModelChange)="onUrgentChange()" inputId="urgente-toggle" />
              <span class="text-sm font-semibold">Urgente</span>
            </label>
          </div>
        }
      </lab-analysis-picker>

      <!-- Item 6: empty state cuando todavía no se cargó ningún análisis. -->
      @if (items().length === 0) {
        <p class="text-sm text-surface-500 text-center py-4">Ingrese análisis para continuar</p>
      }
    </div>

    <!-- El modal va FUERA del contenedor flex con space-y-4: si queda adentro, recibe
         el margin-top del space-y y deja un hueco de 16px debajo del footer. -->
    <lab-analysis-detail-modal
      [analysisId]="detailId()"
      [visible]="detailOpen()"
      (closed)="closeDetail()" />
  `,
})
export class AnalisisStepComponent implements OnInit {
  private readonly store      = inject(Store);
  private readonly actions$   = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);
  private readonly registry   = inject(ModuleRegistry);

  readonly atencionId   = input.required<number>();
  readonly stepAdvanced = output<void>();

  /**
   * Cantidad de análisis cargados. El contenedor (wizard) la usa para habilitar el
   * botón "Continuar" de su footer (item 1: navegación centralizada en el shell).
   */
  readonly itemsCount = output<number>();

  /** Modo solo-lectura (atención terminal / post-secretaría): oculta toda acción mutadora. */
  readonly readOnly = input<boolean>(false);

  readonly items      = signal<PickerRow[]>([]);
  readonly detailId   = signal<number | null>(null);
  readonly detailOpen = signal(false);
  isUrgentValue = false;

  readonly mutating = this.store.selectSignal(selectMutating);

  protected readonly detail        = this.store.selectSignal(selectDetail);
  protected readonly authorizationMutating = this.store.selectSignal(selectAuthorizationMutating);
  private readonly summaryAnalyses = this.store.selectSignal(selectSummaryAnalyses);

  /** Valor local del input "Código de autorización de obra social" — se inicializa desde el detail. */
  readonly authorizationValue = signal<string | null>(null);

  /**
   * Cobertura Particular = la atención no tiene plan (`insurancePlanId == null`).
   * Fuente de verdad: el `detail()` (lo setea el selector de chips del paso 1).
   * Items 2 y 3: gatea la columna "Autorizado" y el default de autorización del picker.
   */
  readonly isParticular = computed(() => this.detail()?.insurancePlanId == null);

  /**
   * Modo express urgente (KAN-140): la atención es urgente Y el módulo URGENCIAS está activo.
   * En este modo se salta cobro/facturación/confirmación y se manda directo a extracción.
   * El wizard lee este signal para cambiar el botón "Continuar" a "Iniciar urgente" y
   * filtrar los pasos administrativos de la lista visible.
   */
  readonly modoExpress = computed(
    () => !!(this.detail()?.isUrgent) && this.registry.isActive(ModuleKey.Urgencias)
  );

  /** Filas con las que arranca el picker: backend si hay, si no el borrador local. */
  private readonly draftRows = signal<AnalisisDraftRow[]>([]);

  /**
   * Items con los que se rehidrata el picker al RETOMAR la atención.
   *
   * Prioridad:
   * 1) Autorizaciones guardadas en el backend (`detail.analysisAuthorizations`
   *    activas), unidas con el catálogo de `summaryAnalyses` (nombre/código).
   * 2) Si el backend no tiene ninguna (borrador no confirmado aún), cae al
   *    snapshot local de `localStorage` (red de seguridad ante F5/volver/retomar).
   *
   * Nota: el backend ya filtra autorizaciones activas (no manda soft-deleted),
   * pero por robustez tratamos `active === undefined` como activa.
   */
  readonly initialItems = computed<PickerRow[]>(() => {
    const d = this.detail();
    const authById = new Map(
      (d?.analysisAuthorizations ?? [])
        .filter((x) => x.active !== false)
        .map((x) => [x.analysisId, x.isAuthorized]),
    );
    if (authById.size > 0) {
      return ((this.summaryAnalyses() ?? []) as Analysis[])
        .filter((a) => authById.has(a.id))
        .map((a) => ({ ...a, isAuthorized: authById.get(a.id) ?? false }));
    }
    // Sin nada persistido en el back → usamos el borrador local si existe.
    return this.draftRows().map((r) => ({ ...r }));
  });

  constructor() {
    // Emitir la cantidad de análisis al contenedor (gate del botón "Continuar" del
    // footer del shell). Fuente única: el signal `items()`.
    effect(() => this.itemsCount.emit(this.items().length));

    // Persistir el borrador (red de seguridad) cada vez que cambian items o urgente.
    effect(() => {
      const id = this.atencionId();
      const rows = this.items();
      if (id == null || id <= 0) return;
      if (rows.length === 0) {
        clearAnalisisDraft(id);
        return;
      }
      writeAnalisisDraft(id, {
        rows: rows.map((r) => ({
          id: r.id, shortCode: r.shortCode, name: r.name,
          familyName: r.familyName, ubCount: r.ubCount, isAuthorized: r.isAuthorized,
        })),
        isUrgent: this.isUrgentValue,
      });
    });
  }

  ngOnInit(): void {
    const d = this.detail();
    const draft = readAnalisisDraft(this.atencionId());
    const analysisIds = (d?.analysisAuthorizations ?? [])
      .filter((x) => x.active !== false)
      .map((x) => x.analysisId);

    this.authorizationValue.set(d?.authorizationNumber ?? null);

    if (analysisIds.length > 0) {
      // Backend manda — hidratamos urgente desde lo persistido y traemos el catálogo.
      this.isUrgentValue = d?.isUrgent ?? false;
      this.store.dispatch(loadAttentionAnalyses({ analysisIds }));
    } else if (draft) {
      // Sin autorizaciones en el back → rehidratamos desde el borrador local.
      this.isUrgentValue = draft.isUrgent;
      this.draftRows.set(draft.rows);
    } else if (d) {
      this.isUrgentValue = d.isUrgent;
    }
  }

  onAnalysisAdded(row: PickerRow): void { this.items.update((arr) => [...arr, row]); }
  onAnalysisRemoved(id: number): void { this.items.update((arr) => arr.filter((x) => x.id !== id)); }
  onItemsChanged(rows: PickerRow[]): void { this.items.set(rows); }
  onDetailRequested(id: number): void { this.detailId.set(id); this.detailOpen.set(true); }
  closeDetail(): void { this.detailOpen.set(false); }
  /** Re-persistir el borrador al togglear urgente (el effect depende de items(), no de isUrgentValue). */
  onUrgentChange(): void { this.items.update((arr) => [...arr]); }

  /**
   * Persiste el código de autorización de obra social vía el endpoint dedicado.
   * Dedup contra el valor actual; normaliza string vacío/espacios a null.
   */
  onAuthorizationBlur(): void {
    const d = this.detail();
    if (!d) return;
    const value = this.authorizationValue();
    const current = d.authorizationNumber ?? null;
    const normalized = value && value.trim() !== '' ? value.trim() : null;
    if (normalized === current) return;
    this.store.dispatch(setAuthorizationNumber({ attentionId: d.id, authorizationNumber: normalized }));
  }

  /**
   * Persiste los análisis cargados localmente (pessimistic UI):
   * 1. Dispatch addAnalysisList y esperar atencionMutationSuccess.
   * 2. Solo entonces invoca `onSuccess` (avanzar de paso, o disparar advanceUrgent).
   *
   * El botón queda deshabilitado mientras `mutating` esté true, así no hay
   * doble click ni dispatch concurrente. Además, `submitting` evita re-entradas
   * sincrónicas (doble dispatch antes de que `mutating` se refleje) que generaban
   * 409 al encolar dos add/analysis.
   *
   * Compartido por `onContinue` (modo normal) y `onIniciarUrgente` (modo express,
   * KAN-188/GAP-D): los análisis cargados en el picker viven solo en el signal
   * local `items()` hasta que se persisten acá — sin este paso, `advanceUrgent`
   * llegaba al back sin ninguna autorización guardada y el back rechazaba con 409
   * "No se puede iniciar la urgencia sin análisis seleccionados", dejando al
   * usuario sin poder salir del paso Análisis.
   */
  private submitting = false;
  private persistAnalysisList(onSuccess: () => void): void {
    if (this.items().length === 0 || this.mutating() || this.submitting) return;
    this.submitting = true;
    // Dedupe por análisis (el back deduplica, pero evitamos enviar duplicados).
    const seen = new Set<number>();
    // Item 3: con cobertura Particular el concepto "autorizado" no aplica → enviamos
    // siempre isAuthorized=false (la columna está oculta). Con obra social respetamos
    // el valor por fila (default true, destildable por el operador).
    // Límite conocido: si el operador cambia la cobertura en el paso 1 DESPUÉS de
    // cargar análisis, el default se re-deriva solo para los NUEVOS análisis (no se
    // pisan las ediciones manuales previas); este filtro final sí normaliza Particular.
    const isParticular = this.isParticular();
    const analysisItems = this.items()
      .filter((x) => (seen.has(x.id) ? false : seen.add(x.id)))
      .map((x) => ({ analysisId: x.id, isAuthorized: isParticular ? false : x.isAuthorized }));
    this.store.dispatch(addAnalysisList({
      id: this.atencionId(),
      // El writer canónico del nro de autorización es el endpoint dedicado (paso final).
      // Reenviamos el valor actual de la atención para no pisarlo; el back además preserva
      // cuando llega null (ver SetAuthorizationNumberUseCase / AddAnalysisListUseCase).
      payload: {
        items: analysisItems,
        isUrgent: this.isUrgentValue,
        authorizationNumber: this.detail()?.authorizationNumber ?? null,
      },
    }));
    this.waitForMutation((ok) => {
      this.submitting = false;
      if (ok) {
        // Ya quedó persistido en el backend → el borrador local cumplió su rol.
        clearAnalisisDraft(this.atencionId());
        onSuccess();
      }
    });
  }

  onContinue(): void {
    this.persistAnalysisList(() => this.stepAdvanced.emit());
  }

  /**
   * Modo express urgente (KAN-140): salta directamente a extracción sin pasar por
   * cobro/facturación/confirmación. Persiste los análisis cargados y, solo si
   * quedan guardados, despacha `advanceUrgent`. Solo se llama cuando `modoExpress()`
   * es true.
   */
  onIniciarUrgente(): void {
    const id = this.atencionId();
    if (!id || !this.modoExpress()) return;
    this.persistAnalysisList(() => this.store.dispatch(advanceUrgent({ id })));
  }

  /**
   * Espera el próximo atencionMutationSuccess o atencionMutationFailure y
   * llama al callback con `true`/`false` según el resultado.
   * `take(1)` asegura un solo emit por dispatch.
   */
  private waitForMutation(cb: (ok: boolean) => void): void {
    race(
      this.actions$.pipe(ofType(atencionMutationSuccess), take(1)),
      this.actions$.pipe(ofType(atencionMutationFailure), take(1)),
    )
      // destroyRef explícito: waitForMutation se invoca desde click handler,
      // fuera del injection context — takeUntilDestroyed() sin arg lanzaría NG0203.
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((action) => cb(action.type === atencionMutationSuccess.type));
  }
}
