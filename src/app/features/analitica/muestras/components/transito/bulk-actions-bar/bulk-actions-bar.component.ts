// WORKAROUND: Using @Input() decorator instead of input.required() signals because
// Angular 21's input.required() throws NG0303/NG0950 when used with setInput() in vitest
// (the angularTemplateInliner plugin does not fully resolve this for templateUrl components).
// Template and styles are inlined here for the same reason; bulk-actions-bar.component.html and
// bulk-actions-bar.component.scss are kept as separate files for reference by other tasks.
import { ChangeDetectionStrategy, Component, Input, output } from '@angular/core';
import type { TemporalLote } from '../../../models/transito.model';

@Component({
  selector: 'app-bulk-actions-bar',
  standalone: true,
  template: `
@if (selectedCount === 0) {
  <div class="bulk idle">
    <span class="badge muted">0</span>
    <span class="muted">Tildá muestras en cualquier lista (o escaneá) para armar lotes temporales</span>
    <button type="button" class="create outline" disabled>+ Crear lote temporal</button>
  </div>
} @else {
  <div class="bulk active">
    <span class="badge brand">{{ selectedCount }}</span>
    <span>{{ selectedCount }} muestras tildadas — armá un lote temporal</span>
    <div class="actions">
      @for (lote of lotes; track lote.id; let i = $index) {
        <button type="button" class="chip-add" (click)="addToLote.emit(lote.id)">
          → Lote {{ i + 1 }} · {{ lote.sampleIds.length }}
        </button>
      }
      <button type="button" class="create" (click)="createLote.emit()">+ Crear lote temporal</button>
      <button type="button" class="chip-clear" (click)="clear.emit()">✕ Limpiar</button>
    </div>
  </div>
}
  `,
  styleUrl: './bulk-actions-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulkActionsBarComponent {
  @Input({ required: true }) selectedCount!: number;
  @Input({ required: true }) lotes!: TemporalLote[];

  readonly createLote = output<void>();
  readonly addToLote = output<string>();
  readonly clear = output<void>();
}
