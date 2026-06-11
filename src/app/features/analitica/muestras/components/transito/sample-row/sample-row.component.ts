// WORKAROUND: Using @Input() decorator instead of input.required() signals because
// Angular 21's input.required() throws NG0303/NG0950 when used with setInput() in vitest
// (the angularTemplateInliner plugin does not fully resolve this for templateUrl components).
// Template and styles are inlined here for the same reason; sample-row.component.html and
// sample-row.component.scss are kept as separate files for reference by other tasks.
import { ChangeDetectionStrategy, Component, Input, output } from '@angular/core';
import type { Sample } from '../../../models/sample.model';

@Component({
  selector: 'app-sample-row',
  standalone: true,
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
  <div class="col-origin"><i class="pi pi-map-marker"></i> {{ branchShort() }}</div>
  <div class="col-time">{{ sample.date }} · {{ sample.time }}</div>
  <div class="col-state"><span class="badge teal">En tránsito</span></div>
</div>
  `,
  styles: [''],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SampleRowComponent {
  @Input({ required: true }) sample!: Sample;
  @Input({ required: true }) selected!: boolean;
  @Input({ required: true }) flashing!: boolean;
  @Input({ required: true }) leaving!: boolean;

  readonly toggle = output<void>();

  branchShort(): string {
    return (this.sample?.branch || '').split(' — ')[0];
  }
}
