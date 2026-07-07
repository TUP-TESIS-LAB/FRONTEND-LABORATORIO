// WORKAROUND: Using @Input() decorator instead of input.required() signals because
// Angular 21's input.required() throws NG0303/NG0950 when used with setInput() in vitest
// (the angularTemplateInliner plugin does not fully resolve this for templateUrl components).
// Template and styles are inlined here for the same reason; sample-row.component.html and
// sample-row.component.scss are kept as separate files for reference by other tasks.
import { ChangeDetectionStrategy, Component, Input, output } from '@angular/core';
import type { Sample } from '../../../models/sample.model';
import type { RowActionKey } from '../../../models/transition.model';
import { rowActionsFor } from '../../../data/state-machine.config';
import { DateEsPipe } from '@shared/pipes/date-es.pipe';
import { RowActionsMenuComponent } from '@shared/ui/components/row-actions-menu/row-actions-menu.component';

@Component({
  selector: 'app-sample-row',
  standalone: true,
  imports: [DateEsPipe, RowActionsMenuComponent],
  template: `
<div
  class="row"
  role="checkbox"
  [attr.aria-checked]="selected"
  [class.is-selected]="selected"
  [class.is-flashing]="flashing"
  [class.is-leaving]="leaving"
  (click)="toggle.emit()"
  tabindex="0"
>
  <div class="check">
    <span class="box" [class.checked]="selected"></span>
  </div>
  <div class="col-barcode">
    <span class="barcode">{{ sample.barcode }}</span>
    @if (sample.urgent) { <span class="urgente">URGENTE</span> }
    <div class="patient">{{ sample.patient }}</div>
  </div>
  <div class="col-study">{{ sample.study }}</div>
  <div class="col-origin">{{ branchShort() }}</div>
  <div class="col-time">{{ sample.receivedAt | dateEs:'date' }} · {{ sample.receivedAt | dateEs:'time' }}</div>
  <div class="col-state"><span class="badge teal">En tránsito</span></div>
  <div class="col-actions" (click)="$event.stopPropagation()">
    <app-row-actions-menu [actions]="rowMenuActions" (accion)="rowAction.emit($any($event))" />
  </div>
</div>
  `,
  styleUrl: './sample-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SampleRowComponent {
  @Input({ required: true }) sample!: Sample;
  @Input({ required: true }) selected!: boolean;
  @Input({ required: true }) flashing!: boolean;
  @Input({ required: true }) leaving!: boolean;

  readonly toggle = output<void>();
  readonly rowAction = output<RowActionKey>();

  /** Menú por-fila de Traslado, derivado de la config. */
  readonly rowMenuActions = rowActionsFor('traslado');

  branchShort(): string {
    return (this.sample?.branch || '').split(' — ')[0];
  }
}
