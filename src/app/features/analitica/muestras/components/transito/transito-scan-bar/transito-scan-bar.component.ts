// WORKAROUND: Using @Input() decorator instead of input.required() signals because
// Angular 21's input.required() throws NG0303/NG0950 when used with setInput() in vitest
// (the angularTemplateInliner plugin does not fully resolve this for templateUrl components).
// Template and styles are inlined here for the same reason; transito-scan-bar.component.html and
// transito-scan-bar.component.scss are kept as separate files for reference by other tasks.
import { ChangeDetectionStrategy, Component, Input, output, signal } from '@angular/core';

@Component({
  selector: 'app-transito-scan-bar',
  standalone: true,
  template: `
<div class="scanbar">
  <div class="input-wrap">
    <i class="pi pi-barcode"></i>
    <input
      type="text"
      [value]="value()"
      (input)="value.set($any($event.target).value)"
      (keydown)="onKey($event)"
      [placeholder]="placeholder"
      autocomplete="off"
    >
    <span class="hint">{{ hint }}</span>
  </div>
  <button
    type="button"
    class="send-all"
    [disabled]="groupsCount === 0"
    (click)="sendAllClick.emit()"
  >
    <i class="pi pi-truck"></i> Enviar todo
  </button>
</div>
  `,
  styles: [''],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransitoScanBarComponent {
  @Input({ required: true }) activeLoteNumber!: number | null;
  @Input({ required: true }) groupsCount!: number;

  readonly enter = output<string>();
  readonly sendAllClick = output<void>();

  protected readonly value = signal('');

  get placeholder(): string {
    const n = this.activeLoteNumber;
    return n != null ? `Escaneá para agregar a Lote ${n}…` : 'Escaneá una muestra para crear un lote temporal…';
  }

  get hint(): string {
    const n = this.activeLoteNumber;
    return n != null ? `Enter → Lote ${n}` : 'Enter → nuevo lote';
  }

  onKey(ev: KeyboardEvent): void {
    if (ev.key !== 'Enter') return;
    const target = ev.target as HTMLInputElement;
    const v = (target?.value ?? this.value()).trim();
    if (!v) return;
    this.enter.emit(v);
    this.value.set('');
    if (target) target.value = '';
  }
}
