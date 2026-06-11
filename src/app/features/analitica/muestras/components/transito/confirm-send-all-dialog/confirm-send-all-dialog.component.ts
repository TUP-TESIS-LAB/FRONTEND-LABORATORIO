// WORKAROUND: Using @Input() decorator instead of input.required() signals because
// Angular 21's input.required() throws NG0303/NG0950 when used with setInput() in vitest
// (the angularTemplateInliner plugin does not fully resolve this for templateUrl components).
// Template and styles are inlined here for the same reason; .html and .scss are kept for reference.
import { ChangeDetectionStrategy, Component, Input, output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-confirm-send-all-dialog',
  standalone: true,
  imports: [DialogModule],
  template: `
<p-dialog
  [visible]="open"
  (visibleChange)="$event || cancel.emit()"
  [modal]="true"
  [closable]="false"
  [style]="{ width: '440px', borderRadius: '16px' }"
  [dismissableMask]="true"
>
  <div class="confirm-body">
    <div class="icon"><i class="pi pi-truck"></i></div>
    <h2>Enviar todo según la recomendación</h2>
    <p>
      Se enviarán las <b>{{ total }} muestras</b> de las {{ breakdown.groupsCount }} listas pre-calculadas,
      cada una al destino que calculó la mochila. Los lotes temporales no se ven afectados.
    </p>
    <div class="breakdown">
      <div class="row green">
        <span class="dot"></span>
        <span>En proceso · esta sucursal</span>
        <strong>{{ breakdown.enProceso }}</strong>
      </div>
      <div class="row blue">
        <span class="dot"></span>
        <span>En tránsito · otras sucursales</span>
        <strong>{{ breakdown.enTransito }}</strong>
      </div>
    </div>
    <p class="warn"><i class="pi pi-exclamation-triangle"></i> Esta acción no se puede deshacer.</p>
    <footer>
      <button type="button" class="cancel" (click)="cancel.emit()">Cancelar</button>
      <button type="button" class="confirm" (click)="confirm.emit()">Enviar {{ total }}</button>
    </footer>
  </div>
</p-dialog>
  `,
  styles: [''],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmSendAllDialogComponent {
  @Input({ required: true }) open!: boolean;
  @Input({ required: true }) breakdown!: { enProceso: number; enTransito: number; groupsCount: number };

  readonly cancel = output<void>();
  readonly confirm = output<void>();

  get total(): number {
    return this.breakdown.enProceso + this.breakdown.enTransito;
  }
}
