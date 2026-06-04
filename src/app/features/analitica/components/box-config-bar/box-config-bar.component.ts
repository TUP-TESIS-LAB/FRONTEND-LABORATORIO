import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  input,
  viewChildren,
} from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import { BoxAssignment, BranchExtractor } from '../../models/extraction.model';

/**
 * Barra de configuración box → extractor para una sucursal.
 *
 * Muestra cada box con su extractor asignado (o "Sin asignar") y un menú
 * desplegable para elegir/cambiar el extractor. Los boxes son definidos por
 * el backend (via `assignments`) — no se pueden agregar manualmente.
 *
 * Componente puramente presentacional: no accede al store ni a servicios.
 * La page conecta los inputs desde el store y suscribe los outputs.
 */
@Component({
  selector: 'app-box-config-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MenuModule],
  template: `
    <div class="box-config-bar">
      <div class="box-config-bar__list">
        @for (item of assignments(); track item.boxNumber; let i = $index) {
          <div class="box-config-bar__item">
            <div class="box-config-bar__box-badge">
              <i class="pi pi-box"></i>
              <span>Box {{ item.boxNumber }}</span>
            </div>

            <button
              type="button"
              class="box-config-bar__selector"
              [class.box-config-bar__selector--assigned]="item.extractorId !== null"
              [attr.aria-label]="'Cambiar extractor del box ' + item.boxNumber"
              (click)="onSelectorClick($event, i)"
            >
              <i
                class="pi"
                [class.pi-user]="item.extractorId !== null"
                [class.pi-user-plus]="item.extractorId === null"
              ></i>
              <span class="box-config-bar__selector-label">
                {{ item.extractorId !== null ? item.extractorFullName : 'Sin asignar' }}
              </span>
              <i class="pi pi-chevron-down box-config-bar__caret"></i>
            </button>

            <!-- Menu individual por box -->
            <p-menu
              [attr.data-box-index]="i"
              [model]="menuItemsFor(i)"
              [popup]="true"
              appendTo="body"
              styleClass="box-config-bar__menu"
            />
          </div>
        } @empty {
          <div class="box-config-bar__empty">
            <i class="pi pi-info-circle"></i>
            <span>No hay boxes configurados. Agregá uno para comenzar.</span>
          </div>
        }
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; }

    .box-config-bar {
      display: flex;
      align-items: center;
      gap: var(--space-4, 16px);
      flex-wrap: wrap;
      padding: var(--space-3, 12px) var(--space-4, 16px);
      background: #fff;
      border-bottom: 1px solid #e2e8f0;
    }

    .box-config-bar__list {
      display: flex;
      align-items: center;
      gap: var(--space-3, 12px);
      flex-wrap: wrap;
      flex: 1;
    }

    .box-config-bar__item {
      display: flex;
      align-items: center;
      gap: var(--space-2, 8px);
      padding: var(--space-2, 8px) var(--space-3, 12px);
      border-radius: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }

    .box-config-bar__box-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1, 4px);
      font-size: 12px;
      font-weight: 700;
      color: var(--brand-primary, #0f766e);
      min-width: 64px;
    }
    .box-config-bar__box-badge .pi {
      font-size: 13px;
      color: var(--brand-primary, #0f766e);
    }

    .box-config-bar__selector {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2, 8px);
      padding: var(--space-2, 8px) var(--space-3, 12px);
      border-radius: 8px;
      background: #fff;
      border: 1px solid #cbd5e1;
      font-family: inherit;
      font-size: 12.5px;
      color: var(--ds-text-muted, #6b7280);
      cursor: pointer;
      min-height: 36px;
      transition: background .12s, border-color .12s;
    }
    .box-config-bar__selector:hover {
      background: #f8fafc;
      border-color: var(--brand-primary, #0f766e);
    }
    .box-config-bar__selector--assigned {
      color: var(--ds-text, #1a1a2e);
      border-color: var(--brand-secondary, #0ea5a4);
    }
    .box-config-bar__selector--assigned .pi-user {
      color: var(--brand-secondary, #0ea5a4);
    }
    .box-config-bar__selector .pi-user-plus {
      color: var(--ds-text-muted, #6b7280);
    }

    .box-config-bar__selector-label {
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .box-config-bar__caret {
      font-size: 10px;
      color: #94a3b8;
      margin-left: var(--space-1, 4px);
    }

    .box-config-bar__empty {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2, 8px);
      color: var(--ds-text-muted, #6b7280);
      font-size: 12.5px;
      font-style: italic;
    }
    .box-config-bar__empty .pi { font-size: 14px; }

  `],
})
export class BoxConfigBarComponent {
  readonly assignments = input<BoxAssignment[]>([]);
  readonly extractors = input<BranchExtractor[]>([]);

  @Output() readonly assign = new EventEmitter<{ boxNumber: number; extractorId: number | null }>();

  private readonly menus = viewChildren(Menu);

  /** Construye los MenuItem para el menú de un box por su índice en `assignments()`. */
  menuItemsFor(index: number): MenuItem[] {
    const assignment = this.assignments()[index];
    if (!assignment) return [];

    const boxNumber = assignment.boxNumber;
    const allAssignments = this.assignments();

    /**
     * Un extractor es elegible si:
     * - Es el que está asignado actualmente a ESTE box (para que aparezca seleccionado), O
     * - No está asignado a ningún OTRO box (boxNumber distinto).
     */
    const eligibleExtractors = this.extractors().filter(
      (ext) =>
        ext.id === assignment.extractorId ||
        !allAssignments.some(
          (a) => a.boxNumber !== boxNumber && a.extractorId === ext.id,
        ),
    );

    const extractorItems: MenuItem[] = eligibleExtractors.map((ext) => ({
      label: ext.fullName,
      icon: assignment.extractorId === ext.id ? 'pi pi-check' : 'pi pi-user',
      command: () => this.assign.emit({ boxNumber, extractorId: ext.id }),
    }));

    const unassignItem: MenuItem = {
      label: 'Sin asignar',
      icon: assignment.extractorId === null ? 'pi pi-check' : 'pi pi-user-minus',
      styleClass: assignment.extractorId === null ? 'p-menuitem--active' : '',
      command: () => this.assign.emit({ boxNumber, extractorId: null }),
    };

    return [
      ...extractorItems,
      ...(extractorItems.length > 0 ? [{ separator: true }] : []),
      unassignItem,
    ];
  }

  onSelectorClick(event: MouseEvent, index: number): void {
    const allMenus = this.menus();
    allMenus[index]?.toggle(event);
  }
}
