import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, input, output, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { race, take } from 'rxjs';
import { Analysis } from '../../../../../models/atencion.model';
import { AnalysisDetailModalComponent } from '../../../../../components/analysis-detail-modal/analysis-detail-modal.component';
import { AnalysisPickerComponent, PickerRow } from '../../../../../components/analysis-picker/analysis-picker.component';
import {
  addAnalysisList,
  atencionMutationFailure,
  atencionMutationSuccess,
  loadAttentionAnalyses,
} from '../../../../../store/atencion/atencion.actions';
import { selectDetail, selectMutating, selectSummaryAnalyses } from '../../../../../store/atencion/atencion.selectors';
import {
  AnalisisDraftRow, clearAnalisisDraft, readAnalisisDraft, writeAnalisisDraft,
} from '../../../../../utils/analisis-draft-store';

@Component({
  selector: 'lab-analisis-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ToggleSwitchModule, AnalysisPickerComponent, AnalysisDetailModalComponent],
  styles: [`:host { display: block; height: 100%; }`],
  template: `
    <div class="flex flex-col h-full min-h-0 space-y-4">
      <lab-analysis-picker
        [initialItems]="initialItems()"
        [readOnly]="readOnly()"
        (analysisAdded)="onAnalysisAdded($event)"
        (analysisRemoved)="onAnalysisRemoved($event)"
        (itemsChanged)="onItemsChanged($event)"
        (detailRequested)="onDetailRequested($event)">
        <!-- Proyectado a la derecha del buscador; la tabla del picker queda a todo el ancho. -->
        @if (!readOnly()) {
          <label class="flex items-center gap-2 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 cursor-pointer select-none whitespace-nowrap">
            <p-toggleswitch [(ngModel)]="isUrgentValue" (ngModelChange)="onUrgentChange()" inputId="urgente-toggle" />
            <span class="text-sm font-semibold">Urgente</span>
          </label>
        }
      </lab-analysis-picker>
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

  private readonly detail          = this.store.selectSignal(selectDetail);
  private readonly summaryAnalyses = this.store.selectSignal(selectSummaryAnalyses);

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
   * Continuar — pessimistic UI:
   * 1. Dispatch addAnalysisList y esperar atencionMutationSuccess.
   * 2. Si Financiero OFF, encadenar endSecretaryPhase y esperar otro success.
   *    (Esa dispatch ya se hace en el wizard al recibir stepAdvanced — pero como
   *    el flujo OFF tiene un salto extra, lo manejamos acá.) Esperamos a que
   *    la mutación termine antes de emitir stepAdvanced, así si falla el back
   *    el wizard NO avanza y el usuario ve el error sin perder contexto.
   *
   * El botón queda deshabilitado mientras `mutating` esté true, así no hay
   * doble click ni dispatch concurrente. Además, `submitting` evita re-entradas
   * sincrónicas (doble dispatch antes de que `mutating` se refleje) que generaban
   * 409 al encolar dos add/analysis.
   */
  private submitting = false;
  onContinue(): void {
    if (this.items().length === 0 || this.mutating() || this.submitting) return;
    this.submitting = true;
    // Dedupe por análisis (el back deduplica, pero evitamos enviar duplicados).
    const seen = new Set<number>();
    const analysisItems = this.items()
      .filter((x) => (seen.has(x.id) ? false : seen.add(x.id)))
      .map((x) => ({ analysisId: x.id, isAuthorized: x.isAuthorized }));
    this.store.dispatch(addAnalysisList({
      id: this.atencionId(),
      payload: { items: analysisItems, isUrgent: this.isUrgentValue, authorizationNumber: null },
    }));
    this.waitForMutation((ok) => {
      this.submitting = false;
      if (ok) {
        // Ya quedó persistido en el backend → el borrador local cumplió su rol.
        clearAnalisisDraft(this.atencionId());
        this.stepAdvanced.emit();
      }
    });
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
