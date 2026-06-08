import {
  ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';
import { race, take } from 'rxjs';
import { AnalysisDetailModalComponent } from '../../../../../components/analysis-detail-modal/analysis-detail-modal.component';
import { AnalysisPickerComponent, PickerRow } from '../../../../../components/analysis-picker/analysis-picker.component';
import {
  addAnalysisList,
  atencionMutationFailure,
  atencionMutationSuccess,
} from '../../../../../store/atencion/atencion.actions';
import { selectMutating } from '../../../../../store/atencion/atencion.selectors';

@Component({
  selector: 'lab-analisis-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonModule, CheckboxModule, AnalysisPickerComponent, AnalysisDetailModalComponent],
  template: `
    <div class="space-y-4">
      <label class="flex items-center gap-2 text-sm">
        <p-checkbox [(ngModel)]="isUrgentValue" [binary]="true" /> Urgente
      </label>

      <lab-analysis-picker
        [initialItems]="[]"
        (analysisAdded)="onAnalysisAdded($event)"
        (analysisRemoved)="onAnalysisRemoved($event)"
        (itemsChanged)="onItemsChanged($event)"
        (detailRequested)="onDetailRequested($event)" />

      @if (!financieroActive()) {
        <p class="text-xs opacity-70">
          El módulo Financiero no está activo. Pasarás directo al paso de confirmación.
        </p>
      }

      <div class="flex justify-between items-center mt-4">
        <p-button label="Volver fase" icon="pi pi-arrow-left" severity="secondary" [outlined]="true"
                  [disabled]="returnDisabled() || !canReturn()" (onClick)="returnPhase.emit()" />
        <p-button [label]="continueLabel()"
                  [loading]="mutating()"
                  [disabled]="items().length === 0 || mutating()"
                  (onClick)="onContinue()" />
      </div>

      <lab-analysis-detail-modal
        [analysisId]="detailId()"
        [visible]="detailOpen()"
        (closed)="closeDetail()" />
    </div>
  `,
})
export class AnalisisStepComponent {
  private readonly store      = inject(Store);
  private readonly actions$   = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);
  private readonly registry   = inject(ModuleRegistry);

  readonly atencionId   = input.required<number>();
  readonly stepAdvanced = output<void>();

  /** Footer "Volver fase" — el wizard provee el estado y bindea el handler. */
  readonly canReturn      = input<boolean>(false);
  readonly returnDisabled = input<boolean>(false);
  readonly returnPhase    = output<void>();

  readonly items      = signal<PickerRow[]>([]);
  readonly detailId   = signal<number | null>(null);
  readonly detailOpen = signal(false);
  isUrgentValue = false;

  readonly financieroActive = computed(() => this.registry.isActive(ModuleKey.Financiero));
  readonly mutating = this.store.selectSignal(selectMutating);

  continueLabel(): string {
    return 'Continuar →';
  }

  onAnalysisAdded(row: PickerRow): void { this.items.update((arr) => [...arr, row]); }
  onAnalysisRemoved(id: number): void { this.items.update((arr) => arr.filter((x) => x.id !== id)); }
  onItemsChanged(rows: PickerRow[]): void { this.items.set(rows); }
  onDetailRequested(id: number): void { this.detailId.set(id); this.detailOpen.set(true); }
  closeDetail(): void { this.detailOpen.set(false); }

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
   * doble click ni dispatch concurrente.
   */
  onContinue(): void {
    if (this.items().length === 0 || this.mutating()) return;
    const analysisItems = this.items().map((x) => ({ analysisId: x.id, isAuthorized: x.isAuthorized }));
    this.store.dispatch(addAnalysisList({
      id: this.atencionId(),
      payload: { items: analysisItems, isUrgent: this.isUrgentValue, authorizationNumber: null },
    }));
    this.waitForMutation((ok) => {
      if (ok) this.stepAdvanced.emit();
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
