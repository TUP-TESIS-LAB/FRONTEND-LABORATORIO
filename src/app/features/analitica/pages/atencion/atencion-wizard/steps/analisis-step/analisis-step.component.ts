import {
  ChangeDetectionStrategy, Component, computed, inject, input, output, signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';
import { AnalysisDetailModalComponent } from '../../../../../components/analysis-detail-modal/analysis-detail-modal.component';
import { AnalysisPickerComponent } from '../../../../../components/analysis-picker/analysis-picker.component';
import { Analysis } from '../../../../../models/atencion.model';
import { NbuService } from '../../../../../services/nbu.service';
import { addAnalysisList } from '../../../../../store/atencion/atencion.actions';

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
        [ubValue]="ubValue()"
        (analysisAdded)="onAnalysisAdded($event)"
        (analysisRemoved)="onAnalysisRemoved($event)"
        (detailRequested)="onDetailRequested($event)" />

      @if (!financieroActive()) {
        <p class="text-xs opacity-70">
          El módulo Financiero no está activo. Pasarás directo al paso de confirmación.
        </p>
      }

      <div class="flex justify-end">
        <p-button [label]="continueLabel()"
                  [disabled]="items().length === 0"
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
  private readonly store    = inject(Store);
  private readonly registry = inject(ModuleRegistry);
  private readonly nbu      = inject(NbuService);

  readonly atencionId   = input.required<number>();
  readonly stepAdvanced = output<void>();

  readonly items      = signal<Analysis[]>([]);
  readonly detailId   = signal<number | null>(null);
  readonly detailOpen = signal(false);
  isUrgentValue = false;

  readonly financieroActive = computed(() => this.registry.isActive(ModuleKey.Financiero));
  private readonly nbuCurrent = toSignal(this.nbu.getCurrent(), { initialValue: null });
  readonly ubValue = computed(() => this.nbuCurrent()?.ubValue ?? null);

  continueLabel(): string {
    return 'Continuar →';
  }

  onAnalysisAdded(a: Analysis): void { this.items.update((arr) => [...arr, a]); }
  onAnalysisRemoved(id: number): void { this.items.update((arr) => arr.filter((x) => x.id !== id)); }
  onDetailRequested(id: number): void { this.detailId.set(id); this.detailOpen.set(true); }
  closeDetail(): void { this.detailOpen.set(false); }

  onContinue(): void {
    if (this.items().length === 0) return;
    const ids = this.items().map((x) => x.id);
    this.store.dispatch(addAnalysisList({
      id: this.atencionId(),
      payload: { analysisIds: ids, isUrgent: this.isUrgentValue, authorizationNumber: null },
    }));
    this.stepAdvanced.emit();
  }
}
