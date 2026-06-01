import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  input,
  viewChild,
} from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import { BranchOption } from '../../models/extraction.model';

/**
 * Chip blanco con pin rojo + nombre de la sucursal actual. Al hacer click
 * abre un menú con la lista de sucursales asignadas al usuario. Si el user
 * tiene una sola sucursal (o ninguna), el chip queda sin caret y no abre el
 * menú.
 *
 * Renderea según el mockup escena 1 (header):
 *   [ pin Sucursal Norte chevron ]
 */
@Component({
  selector: 'app-branch-selector-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MenuModule],
  template: `
    <button
      type="button"
      class="branch-chip"
      [class.branch-chip--single]="!hasOptions()"
      [disabled]="!hasOptions()"
      [attr.aria-haspopup]="hasOptions() ? 'menu' : null"
      (click)="onTriggerClick($event)"
    >
      <i class="pi pi-map-marker pin"></i>
      <span class="label">{{ label() }}</span>
      @if (hasOptions()) {
        <i class="pi pi-chevron-down caret"></i>
      }
    </button>

    <p-menu #menu [model]="menuItems()" [popup]="true" appendTo="body" styleClass="branch-chip__menu" />
  `,
  styles: [`
    :host { display: inline-flex; }

    .branch-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 24px;
      background: #fff;
      border: 1px solid #e2e8f0;
      color: #0f172a;
      font-size: 12.5px;
      font-family: inherit;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(15,23,42,.04);
      transition: background .12s, border-color .12s;
    }
    .branch-chip:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
    .branch-chip:disabled { cursor: default; opacity: 1; }

    .branch-chip .pin {
      color: #e11d48;
      font-size: 14px;
    }
    .branch-chip .caret {
      color: #64748b;
      font-size: 10px;
      margin-left: 2px;
    }
    .branch-chip .label {
      font-weight: 500;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `],
})
export class BranchSelectorChipComponent {
  readonly selected = input<BranchOption | null>(null);
  readonly options = input<BranchOption[]>([]);

  @Output() readonly selectBranch = new EventEmitter<BranchOption>();

  private readonly menu = viewChild<Menu>('menu');

  readonly hasOptions = computed(() => this.options().length > 1);

  readonly label = computed(() => {
    const sel = this.selected();
    if (sel) return sel.name;
    if (this.options().length === 0) return 'Sin sucursal';
    return 'Elegí una sucursal';
  });

  readonly menuItems = computed<MenuItem[]>(() =>
    this.options().map((b) => ({
      label: b.name,
      icon: 'pi pi-map-marker',
      command: () => this.selectBranch.emit(b),
    })),
  );

  onTriggerClick(ev: MouseEvent): void {
    if (!this.hasOptions()) return;
    this.menu()?.toggle(ev);
  }
}
