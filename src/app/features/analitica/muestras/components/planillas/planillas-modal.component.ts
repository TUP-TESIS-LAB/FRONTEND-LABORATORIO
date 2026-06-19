import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { selectTemplates, selectTemplatesPending } from '../../store/worksheet-templates/worksheet-templates.selectors';
import { deleteTemplate } from '../../store/worksheet-templates/worksheet-templates.actions';
import type { WorksheetTemplate } from '../../models/worksheet-template.model';

/**
 * GAP-P4 + GAP-P7: modal de gestión de planillas (paso 1), fiel al mockup.
 * Header con subtítulo, encabezado NOMBRE/ACCIONES, una fila por planilla con
 * "Cargar resultados" + menú kebab (Ver detalle / Editar / Eliminar) con confirmación
 * inline. Mantiene p-dialog (regla del DS) y tokens del proyecto.
 */
@Component({
  selector: 'app-planillas-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, ButtonModule],
  templateUrl: './planillas-modal.component.html',
  styleUrl: './planillas-modal.component.scss',
})
export class PlanillasModalComponent {
  private readonly store = inject(Store);

  readonly visible = input<boolean>(false);
  /** Muestras seleccionadas en la lista (habilita "Cargar resultados"). */
  readonly selectionCount = input<number>(0);

  readonly closed = output<void>();
  readonly newSheet = output<void>();
  readonly editSheet = output<number>();
  readonly cargarConPlanilla = output<number>();
  readonly verDetalle = output<number>();

  readonly templates = this.store.selectSignal(selectTemplates);
  readonly pending = this.store.selectSignal(selectTemplatesPending);

  /** Id de la planilla con el menú kebab abierto (null = ninguno). */
  readonly menuOpen = signal<number | null>(null);
  /** Id de la planilla en confirmación de borrado. */
  readonly confirmDeleteId = signal<number | null>(null);

  analysisCount(ws: WorksheetTemplate): number { return ws.analyses.length; }

  toggleMenu(id: number, ev: Event): void {
    ev.stopPropagation();
    this.menuOpen.update(cur => (cur === id ? null : id));
    this.confirmDeleteId.set(null);
  }
  closeMenus(): void { this.menuOpen.set(null); this.confirmDeleteId.set(null); }

  onClose(): void { this.closeMenus(); this.closed.emit(); }
  onNewSheet(): void { this.closeMenus(); this.newSheet.emit(); }
  onEdit(id: number): void { this.closeMenus(); this.editSheet.emit(id); }
  onVerDetalle(id: number): void { this.closeMenus(); this.verDetalle.emit(id); }
  onCargar(id: number): void { if (this.selectionCount() > 0) { this.closeMenus(); this.cargarConPlanilla.emit(id); } }

  askDelete(id: number, ev: Event): void { ev.stopPropagation(); this.confirmDeleteId.set(id); }
  cancelDelete(ev: Event): void { ev.stopPropagation(); this.confirmDeleteId.set(null); }
  confirmDelete(id: number, ev: Event): void {
    ev.stopPropagation();
    this.store.dispatch(deleteTemplate({ id }));
    this.closeMenus();
  }
}
