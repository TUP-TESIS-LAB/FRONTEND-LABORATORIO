import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Store } from '@ngrx/store';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { selectTemplates, selectTemplatesPending } from '../../store/worksheet-templates/worksheet-templates.selectors';
import type { WorksheetTemplate } from '../../models/worksheet-template.model';

@Component({
  selector: 'app-planillas-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, ButtonModule],
  template: `
    <p-dialog [visible]="visible()" (onHide)="onClose()" [modal]="true" [draggable]="false" [style]="{ width: '640px' }"
              header="Planillas">
      <p class="text-sm opacity-70 mb-3">Gestioná las hojas de trabajo: creá o editá cada planilla.</p>
      @if (pending()) {
        <p class="text-sm opacity-60">Cargando planillas…</p>
      } @else if (!templates().length) {
        <p class="text-sm opacity-60">Todavía no hay planillas configuradas. Creá una nueva.</p>
      } @else {
        <div class="divide-y">
          @for (ws of templates(); track ws.id) {
            <div class="flex items-center justify-between py-2">
              <div class="flex items-center gap-2">
                <i class="pi pi-table"></i>
                <div>
                  <b class="block text-sm">{{ ws.name }}</b>
                  <span class="text-xs opacity-60">{{ analysisCount(ws) }} análisis</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <p-button label="Cargar resultados" size="small" severity="secondary" [outlined]="true"
                          [disabled]="true" title="Próximamente" />
                <button type="button" class="pi pi-pencil p-2" aria-label="Editar" title="Editar" (click)="onEdit(ws.id)"></button>
                <button type="button" class="pi pi-eye p-2 opacity-40" aria-label="Ver detalle (próximamente)" title="Próximamente" disabled></button>
                <button type="button" class="pi pi-trash p-2 opacity-40" aria-label="Eliminar (próximamente)" title="Próximamente" disabled></button>
              </div>
            </div>
          }
        </div>
      }
      <ng-template pTemplate="footer">
        <p-button label="Nueva hoja" icon="pi pi-plus" (onClick)="onNewSheet()" />
      </ng-template>
    </p-dialog>
  `,
})
export class PlanillasModalComponent {
  private readonly store = inject(Store);

  readonly visible = input<boolean>(false);
  readonly closed = output<void>();
  readonly newSheet = output<void>();
  readonly editSheet = output<number>();

  readonly templates = this.store.selectSignal(selectTemplates);
  readonly pending = this.store.selectSignal(selectTemplatesPending);

  analysisCount(ws: WorksheetTemplate): number { return ws.analyses.length; }
  onClose(): void { this.closed.emit(); }
  onNewSheet(): void { this.newSheet.emit(); }
  onEdit(id: number): void { this.editSheet.emit(id); }
}
