import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

export type ResultadoStatus = 'completa' | 'parcial' | 'sin';
export interface ResumenItem { resultId: number; label: string; filled: number; total: number; status: ResultadoStatus; }

const STATUS_LABEL: Record<ResultadoStatus, string> = { completa: 'Completa', parcial: 'Parcial', sin: 'Sin resultados' };

@Component({
  selector: 'app-resumen-resultados-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, ButtonModule],
  template: `
    <p-dialog [visible]="visible()" (onHide)="onClose()" [modal]="true" [draggable]="false"
              [style]="{ width: '620px' }" [breakpoints]="{ '768px': '100vw' }" styleClass="ui-dialog-fullscreen-mobile"
              header="¿Dar por completados los análisis?">
      <p class="text-sm opacity-70 mb-3">Solo los resultados con todas las determinaciones cargadas pueden marcarse como completados.</p>
      <div class="divide-y">
        @for (i of items(); track i.resultId) {
          <label class="flex items-center gap-2 py-2 text-sm" [class.opacity-50]="!isSelectable(i)">
            <input type="checkbox" [disabled]="!isSelectable(i)" [checked]="selected().has(i.resultId)" (change)="toggle(i)" />
            <span class="flex-1">{{ i.label }}</span>
            <span class="opacity-60">{{ i.filled }}/{{ i.total }}</span>
            <span class="text-xs font-semibold">{{ statusLabel(i.status) }}</span>
          </label>
        }
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Mantener" severity="secondary" [text]="true" (onClick)="onClose()" />
        <p-button label="Marcar completadas" [disabled]="selected().size === 0" (onClick)="confirm()" />
      </ng-template>
    </p-dialog>
  `,
})
export class ResumenResultadosModalComponent {
  readonly visible = input<boolean>(false);
  readonly items = input<ResumenItem[]>([]);
  readonly markCompleted = output<number[]>();
  readonly closed = output<void>();

  readonly selected = signal<Set<number>>(new Set());

  constructor() {
    effect(() => { this.selected.set(new Set(this.items().filter(i => i.status === 'completa').map(i => i.resultId))); });
  }

  isSelectable(i: ResumenItem): boolean { return i.status === 'completa'; }
  statusLabel(s: ResultadoStatus): string { return STATUS_LABEL[s]; }
  toggle(i: ResumenItem): void {
    if (!this.isSelectable(i)) return;
    this.selected.update(prev => { const n = new Set(prev); n.has(i.resultId) ? n.delete(i.resultId) : n.add(i.resultId); return n; });
  }
  confirm(): void { this.markCompleted.emit([...this.selected()]); }
  onClose(): void { this.closed.emit(); }
}
