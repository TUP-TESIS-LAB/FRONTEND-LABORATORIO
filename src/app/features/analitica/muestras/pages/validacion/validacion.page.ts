import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Store } from '@ngrx/store';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { humanizeBackendError } from '@shared/utils/error-messages';
import { ValidationTableComponent, type ValidatePayload, type ValidateAllPayload } from '../../components/validation-table/validation-table.component';
import { selectValidationView, selectPostanaliticaLoading, selectPostanaliticaError } from '../../store/postanalitica/postanalitica.selectors';
import { loadValidation, validateDet, validateAll } from '../../store/postanalitica/postanalitica.actions';

@Component({
  selector: 'app-validacion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ValidationTableComponent, ToastModule],
  providers: [MessageService],
  template: `
    <section class="p-4 flex flex-col gap-4">
      <header class="flex items-center justify-between">
        <button type="button" class="text-sm text-blue-600" (click)="back()">← Volver a procesamiento</button>
        <span class="text-xs font-semibold uppercase opacity-70">Estudio: {{ studyStatusLabel() }}</span>
      </header>
      <h1 class="text-lg font-semibold">Validación de resultados</h1>
      @if (loading()) { <p class="text-sm opacity-60">Cargando validación…</p> }
      @else { <app-validation-table [results]="view()?.results ?? []" (validate)="onValidate($event)" (validateAll)="onValidateAll($event)" /> }
      <div class="flex justify-end">
        <button type="button" class="px-3 py-1 rounded bg-green-700 text-white text-sm font-semibold"
                [disabled]="!canSignStudy()" title="Próximamente">
          Firmar estudio
        </button>
      </div>
      <p-toast position="bottom-right" />
    </section>
  `,
})
export class ValidacionPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);
  private readonly messages = inject(MessageService);
  private readonly location = inject(Location);

  readonly protocolId = Number(this.route.snapshot.paramMap.get('protocolId'));

  readonly view = this.store.selectSignal(selectValidationView);
  readonly loading = this.store.selectSignal(selectPostanaliticaLoading);
  private readonly error = this.store.selectSignal(selectPostanaliticaError);

  readonly studyStatusLabel = computed(() => this.view()?.studyStatus ?? 'sin estudio');
  readonly canSignStudy = computed(() => this.view()?.studyStatus === 'READY_FOR_SIGNATURE');

  constructor() {
    this.store.dispatch(loadValidation({ protocolId: this.protocolId }));
    let lastSig: string | null = null;
    effect(() => {
      const err = this.error();
      const sig = err ? `${(err as { status?: unknown }).status}:${(err as { message?: unknown }).message}` : null;
      if (sig && sig !== lastSig) {
        lastSig = sig;
        this.messages.add({ severity: 'error', summary: 'Error', detail: humanizeBackendError(err, { fallback: 'No pudimos completar la operación. Probá de nuevo.' }), life: 5000 });
      }
    });
  }

  onValidate(p: ValidatePayload): void { this.store.dispatch(validateDet(p)); }
  onValidateAll(p: ValidateAllPayload): void { this.store.dispatch(validateAll(p)); }
  back(): void { this.location.back(); }
}
