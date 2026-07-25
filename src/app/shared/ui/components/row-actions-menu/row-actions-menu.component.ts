import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MenuModule } from 'primeng/menu';
import type { MenuItem } from 'primeng/api';

/**
 * Ítem genérico del menú kebab por-fila. El componente es agnóstico del dominio:
 * `K` es el tipo de la key (el consumidor la tipa; en muestras es `RowActionKey`).
 */
export interface RowMenuAction<K extends string = string> {
  key: K;
  label: string;
  /** PrimeIcons name, ej. 'pi-ban'. */
  icon: string;
}

@Component({
  selector: 'app-row-actions-menu',
  standalone: true,
  imports: [MenuModule],
  template: `
    <!-- Sin acciones no se pinta el botón: evita un kebab que abre un popup vacío. -->
    @if (actions().length) {
      <button
        type="button"
        class="row-kebab"
        aria-label="Acciones de la fila"
        (click)="$event.stopPropagation(); menu.toggle($event)"
      >
        <i class="pi pi-ellipsis-v"></i>
      </button>
      <p-menu #menu [popup]="true" [model]="items()" appendTo="body" />
    }
  `,
  styles: [`
    .row-kebab {
      display: inline-flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border: none; background: transparent;
      border-radius: 6px; cursor: pointer; color: var(--text-color-secondary, #64748b);
    }
    .row-kebab:hover { background: rgba(100, 116, 139, 0.12); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RowActionsMenuComponent {
  readonly actions = input.required<ReadonlyArray<RowMenuAction>>();
  readonly accion = output<string>();

  readonly items = computed<MenuItem[]>(() =>
    this.actions().map((a) => ({
      label: a.label,
      icon: 'pi ' + a.icon,
      command: () => this.accion.emit(a.key),
    })),
  );
}
