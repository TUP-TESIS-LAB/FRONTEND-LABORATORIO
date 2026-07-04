import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  ViewChild,
  computed,
  contentChild,
  contentChildren,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule, Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { UiCellDirective } from './ui-cell.directive';
import { UiRowExpansionDirective } from './ui-row-expansion.directive';
import { TableAction, TableColumn } from '@shared/ui/models/table-column.model';

@Component({
  selector: 'ui-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // En modo flex-scroll (scrollHeight="flex") el componente llena el alto de su contenedor
  // flex y la tabla scrollea internamente; así el footer/pricing de alrededor queda fijo.
  host: {
    '[class.ut-flex-scroll]': "scrollHeight() === 'flex'",
    '[class.ut-comfortable]': "size() === 'comfortable'",
  },
  imports: [TableModule, NgTemplateOutlet, TooltipModule, MenuModule, EmptyStateComponent],
  template: `
    @if (!lazy() && value().length === 0 && !loading()) {
      <ui-empty-state
        [icon]="emptyIcon()"
        [heading]="emptyHeading()"
        [description]="emptyDescription()"
        [ctaLabel]="emptyCtaLabel()"
        (ctaClick)="emptyCtaClick.emit()" />
    } @else {
      <div class="ut-wrap">
        <p-table
          [value]="$any(value())"
          [loading]="loading()"
          [dataKey]="dataKey()"
          [lazy]="lazy()"
          [rows]="rows()"
          [rowsPerPageOptions]="rowsPerPageOptions().length ? $any(rowsPerPageOptions()) : undefined"
          [totalRecords]="totalRecords()"
          [first]="first()"
          [paginator]="paginator()"
          [pageLinks]="5"
          [paginatorDropdownAppendTo]="'body'"
          [scrollable]="scrollHeight() !== null"
          [scrollHeight]="scrollHeight() ?? undefined"
          [selection]="$any(selectable() ? selection() : null)"
          (selectionChange)="onSelectionChange($any($event))"
          (onLazyLoad)="lazyLoad.emit($event)"
          (onRowExpand)="rowExpand.emit($event.data)">

          <ng-template pTemplate="header">
            <tr>
              @if (selectable()) {
                <th class="ut-select-th"><p-tableHeaderCheckbox /></th>
              }
              @if (expandable()) {
                <th class="ut-expander-th"></th>
              }
              @for (col of columns(); track col.field) {
                <th
                  [class.ut-align-right]="col.align === 'right'"
                  [class.ut-align-center]="col.align === 'center'">
                  {{ col.header }}
                  @if (col.headerInfo) {
                    <i class="pi pi-info-circle ut-header-info"
                       [pTooltip]="col.headerInfo" tooltipPosition="top"></i>
                  }
                </th>
              }
              @if (hasActions()) {
                <th class="ut-actions-th"></th>
              }
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-row let-expanded="expanded">
            <tr [pRowToggler]="row" [pRowTogglerDisabled]="!expandable()"
                [class.ut-row-clickable]="expandable()">
              @if (selectable()) {
                <td class="ut-select-td" (click)="$event.stopPropagation()">
                  <p-tableCheckbox [value]="row" />
                </td>
              }
              @if (expandable()) {
                <td class="ut-expander-td">
                  <button class="ut-ibtn" type="button"
                          [attr.aria-label]="expanded ? 'Contraer' : 'Expandir'">
                    <i class="pi" [class.pi-chevron-right]="!expanded" [class.pi-chevron-down]="expanded"></i>
                  </button>
                </td>
              }
              @for (col of columns(); track col.field) {
                <td
                  [class.ut-align-right]="col.align === 'right'"
                  [class.ut-align-center]="col.align === 'center'">
                  @if (tplFor(col.field); as tpl) {
                    <ng-container
                      [ngTemplateOutlet]="tpl"
                      [ngTemplateOutletContext]="{ $implicit: row }" />
                  } @else {
                    {{ $any(row)[col.field] }}
                  }
                </td>
              }
              @if (hasActions()) {
                <td class="ut-actions-td" (click)="$event.stopPropagation()">
                  <div class="ut-actions-cell">
                    @if (showView()) {
                      <button class="ut-ibtn" type="button"
                              pTooltip="Ver" tooltipPosition="top" aria-label="Ver"
                              (click)="view.emit(row)">
                        <i class="pi pi-eye"></i>
                      </button>
                    }
                    @if (showEdit()) {
                      <button class="ut-ibtn" type="button"
                              pTooltip="Editar" tooltipPosition="top" aria-label="Editar"
                              (click)="edit.emit(row)">
                        <i class="pi pi-pencil"></i>
                      </button>
                    }
                    @if (showDelete()) {
                      <button class="ut-ibtn ut-ibtn--danger" type="button"
                              pTooltip="Eliminar" tooltipPosition="top" aria-label="Eliminar"
                              (click)="rowDelete.emit(row)">
                        <i class="pi pi-trash"></i>
                      </button>
                    }
                    @for (a of actions(); track a.key) {
                      @if (!resolveHidden(a, row)) {
                        @if ((a.type ?? 'button') === 'menu') {
                          <button
                            class="ut-ibtn"
                            type="button"
                            [pTooltip]="resolveLabel(a, row)"
                            tooltipPosition="top"
                            [attr.aria-label]="resolveLabel(a, row)"
                            (click)="openMenu($event, a, row)">
                            <i [class]="'pi ' + resolveIcon(a, row)"></i>
                          </button>
                        } @else {
                          <button
                            class="ut-ibtn"
                            [class.ut-ibtn--danger]="resolveSeverity(a, row) === 'danger'"
                            [class.ut-ibtn--warn]="resolveSeverity(a, row) === 'warn'"
                            [class.ut-ibtn--success]="resolveSeverity(a, row) === 'success'"
                            type="button"
                            [pTooltip]="resolveLabel(a, row)"
                            tooltipPosition="top"
                            [attr.aria-label]="resolveLabel(a, row)"
                            (click)="action.emit({ key: a.key, row })">
                            <i [class]="'pi ' + resolveIcon(a, row)"></i>
                          </button>
                        }
                      }
                    }
                  </div>
                </td>
              }
            </tr>
          </ng-template>

          @if (expandable()) {
            <ng-template pTemplate="expandedrow" let-row>
              <tr class="ut-expansion-row">
                <td [attr.colspan]="totalColspan()">
                  @if (expansionTpl(); as tpl) {
                    <ng-container [ngTemplateOutlet]="tpl" [ngTemplateOutletContext]="{ $implicit: row }" />
                  }
                </td>
              </tr>
            </ng-template>
          }

          @if (lazy()) {
            <ng-template pTemplate="emptymessage">
              <tr>
                <td [attr.colspan]="totalColspan()" style="padding:0;border:none">
                  <ui-empty-state
                    [icon]="emptyIcon()"
                    [heading]="emptyHeading()"
                    [description]="emptyDescription()"
                    [ctaLabel]="emptyCtaLabel()"
                    (ctaClick)="emptyCtaClick.emit()" />
                </td>
              </tr>
            </ng-template>
          }

          <ng-template pTemplate="paginatorright">
            @if (paginatorSummary(); as summary) {
              <span class="ut-paginator-summary">{{ summary }}</span>
            }
          </ng-template>
        </p-table>
      </div>
      @if (hasMenuActions()) {
        <p-menu #actionMenu [popup]="true" [model]="activeMenuItems()" />
      }
    }
  `,
  styles: [`
    :host { display: block; }

    /* ── Container ── */
    .ut-wrap {
      border: 1px solid #e8edf3;
      border-radius: 10px;
      overflow: hidden;
    }

    /* ── Paginador: controles a la izquierda, resumen a la derecha ── */
    :host ::ng-deep .p-paginator {
      justify-content: flex-start;
      flex-wrap: wrap;
      gap: 4px;
    }
    :host ::ng-deep .p-paginator .ut-paginator-summary {
      margin-left: auto;
      color: var(--ds-text-muted, #6b7280);
      font-size: 13px;
      white-space: nowrap;
    }

    /* ── Flex-scroll mode (scrollHeight="flex") ──
       El host llena el contenedor flex padre y la tabla scrollea por dentro, con el
       header sticky. La cadena necesita min-height:0 para que el scroll no empuje. */
    :host(.ut-flex-scroll) {
      height: 100%;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    :host(.ut-flex-scroll) .ut-wrap {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
    :host(.ut-flex-scroll) ::ng-deep .p-datatable {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
    :host(.ut-flex-scroll) ::ng-deep .p-datatable-table-container {
      flex: 1 1 auto;
      min-height: 0;
    }

    /* Ícono info en el header de una columna (señala info en el hover de las celdas). */
    .ut-header-info {
      font-size: 11px;
      margin-left: 5px;
      color: #94a3b8;
      cursor: help;
      vertical-align: middle;
    }

    /* ── Zebra B — header ── */
    :host ::ng-deep thead > tr > th {
      font-size: 11px !important;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 9px 14px !important;
      color: #475569 !important;
      font-weight: 700 !important;
      background: #f4f7fb !important;
      border: none !important;
      white-space: nowrap;
    }

    /* ── Zebra B — body rows ── */
    :host ::ng-deep tbody > tr > td {
      font-size: 13px !important;
      padding: 7px 14px !important;
      border: none !important;
    }
    :host ::ng-deep tbody > tr:nth-child(even) { background: #fafbfd; }
    :host ::ng-deep tbody > tr:hover { background: #eef4ff !important; }

    /* ── Densidad "comfortable" (opt-in vía [size]="comfortable") — celdas más grandes ── */
    :host(.ut-comfortable) ::ng-deep thead > tr > th { padding: 13px 18px !important; font-size: 12px !important; }
    :host(.ut-comfortable) ::ng-deep tbody > tr > td { padding: 14px 18px !important; font-size: 14px !important; }
    :host(.ut-comfortable) ::ng-deep td .p-tag { font-size: 11.5px; padding: 2px 9px; }

    /* Strip PrimeNG outer borders */
    :host ::ng-deep .p-datatable { border: none !important; border-radius: 0 !important; }

    /* ── Tags de estado más compactos dentro de la tabla ── */
    :host ::ng-deep td .p-tag {
      font-size: 10.5px;
      padding: 1px 7px;
      line-height: 1.45;
    }

    /* ── Alignment helpers ── */
    :host ::ng-deep th.ut-align-right,
    :host ::ng-deep td.ut-align-right { text-align: right !important; }
    :host ::ng-deep th.ut-align-center,
    :host ::ng-deep td.ut-align-center { text-align: center !important; }

    /* ── Actions column ── */
    :host ::ng-deep th.ut-actions-th { width: 1%; white-space: nowrap; }
    :host ::ng-deep td.ut-actions-td { width: 1%; white-space: nowrap; }

    /* ── Selección (checkbox) ── */
    :host ::ng-deep th.ut-select-th { width: 1%; white-space: nowrap; }
    :host ::ng-deep td.ut-select-td { width: 1%; white-space: nowrap; }

    /* ── Row expansion ── */
    /* Fila clickeable completa para expandir (no solo el chevron). */
    :host ::ng-deep tr.ut-row-clickable { cursor: pointer; }
    :host ::ng-deep th.ut-expander-th { width: 1%; white-space: nowrap; }
    :host ::ng-deep td.ut-expander-td { width: 1%; white-space: nowrap; }
    /* La fila de expansión NO usa el zebra/hover de las filas normales. */
    :host ::ng-deep tr.ut-expansion-row > td {
      background: #f8fafc;
      padding: 12px 18px !important;
      box-shadow: inset 0 1px 0 #e8edf3, inset 0 -1px 0 #e8edf3;
    }
    :host ::ng-deep tr.ut-expansion-row:hover > td { background: #f8fafc !important; }

    .ut-actions-cell {
      display: flex;
      gap: 2px;
      justify-content: flex-end;
      align-items: center;
    }

    /* ── Icon buttons ── */
    .ut-ibtn {
      width: 28px; height: 28px;
      border: none; background: transparent; border-radius: 7px;
      color: #64748b; cursor: pointer; font-size: 14px;
      display: inline-flex; align-items: center; justify-content: center;
      transition: background 100ms ease, color 100ms ease;
      padding: 0;
    }
    .ut-ibtn:hover { background: #eef2f7; color: #1a1a2e; }

    .ut-ibtn--danger { color: #e23a47; }
    .ut-ibtn--danger:hover { background: #fdecee !important; color: #e23a47 !important; }

    .ut-ibtn--warn { color: #c2410c; }
    .ut-ibtn--warn:hover { background: #fff7ed !important; color: #c2410c !important; }

    .ut-ibtn--success { color: #15803d; }
    .ut-ibtn--success:hover { background: #f0fdf4 !important; color: #15803d !important; }
  `],
})
export class DataTableComponent {
  // ── Data ──
  readonly value    = input.required<readonly unknown[]>();
  readonly columns  = input.required<readonly TableColumn[]>();
  readonly loading  = input<boolean>(false);
  readonly dataKey  = input<string>('id');

  // ── Pagination ──
  readonly lazy               = input<boolean>(false);
  readonly paginator          = input<boolean>(false);
  readonly rows               = input<number>(10);
  readonly rowsPerPageOptions = input<readonly number[]>([]);
  readonly totalRecords       = input<number>(0);
  readonly first              = input<number>(0);
  /** Etiqueta de la entidad para el resumen del paginador (ej. "pacientes"). */
  readonly entityLabel        = input<string>('registros');

  /**
   * Resumen del paginador (lado derecho): "Mostrando {filas mostradas} de {total} {entidad}".
   * En lazy usa first/rows/totalRecords (exactos); en modo cliente cae al total
   * del array y la página 1 (first no se propaga desde p-table en ese modo).
   */
  readonly paginatorSummary = computed<string | null>(() => {
    if (!this.paginator()) return null;
    const total = this.lazy() ? this.totalRecords() : this.value().length;
    if (total <= 0) return null;
    const shown = Math.max(0, Math.min(this.rows(), total - this.first()));
    return `Mostrando ${shown} de ${total} ${this.entityLabel()}`;
  });

  // ── Scroll ──
  readonly scrollHeight = input<string | null>(null);
  /** Densidad de la tabla. 'comfortable' agranda padding y tipografía de celdas. */
  readonly size = input<'normal' | 'comfortable'>('normal');

  // ── Row expansion ──
  // Cuando es true, se agrega una columna con un toggle (chevron) y cada fila puede
  // expandirse mostrando el template marcado con [uiRowExpansion]. Requiere dataKey único.
  readonly expandable = input<boolean>(false);

  // ── Selección múltiple (checkbox por fila + "seleccionar todo") ──
  // Cuando es true, se agrega una columna de checkbox al inicio y un checkbox de
  // "seleccionar todo" en el header. La selección es un array de filas (two-way vía
  // [(selection)] o (selectionChange)). Requiere dataKey único. Default: false.
  readonly selectable = input<boolean>(false);
  readonly selection = model<readonly unknown[]>([]);

  // ── Built-in actions ──
  readonly showView   = input<boolean>(false);
  readonly showEdit   = input<boolean>(false);
  readonly showDelete = input<boolean>(false);

  // ── Custom extra actions ──
  readonly actions = input<readonly TableAction[]>([]);

  // ── Empty state ──
  readonly emptyHeading     = input<string>('Sin registros');
  readonly emptyIcon        = input<string>('pi-inbox');
  readonly emptyDescription = input<string | null>(null);
  readonly emptyCtaLabel    = input<string | null>(null);

  // ── Outputs ──
  readonly lazyLoad      = output<TableLazyLoadEvent>();
  readonly view          = output<unknown>();
  readonly edit          = output<unknown>();
  readonly rowDelete     = output<unknown>();
  readonly action        = output<{ key: string; row: unknown }>();
  readonly emptyCtaClick = output<void>();
  /** Emite la fila al expandirla (solo con [expandable]=true). Útil para lazy-load del contenido. */
  readonly rowExpand     = output<unknown>();

  // ── Internal ──
  protected readonly hasActions = computed(() =>
    this.showView() || this.showEdit() || this.showDelete() || this.actions().length > 0,
  );
  protected readonly hasMenuActions = computed(() =>
    this.actions().some((a) => a.type === 'menu'),
  );
  protected readonly activeMenuItems = signal<MenuItem[]>([]);

  /** Colspan total de la fila de expansión = checkbox + expander + columnas + acciones. */
  protected readonly totalColspan = computed(() =>
    (this.selectable() ? 1 : 0) + (this.expandable() ? 1 : 0) + this.columns().length + (this.hasActions() ? 1 : 0),
  );

  protected onSelectionChange(rows: unknown[]): void {
    this.selection.set(rows ?? []);
  }

  @ViewChild('actionMenu') private actionMenuRef?: Menu;

  private readonly cells = contentChildren(UiCellDirective);
  private readonly expansionDir = contentChild(UiRowExpansionDirective);
  protected readonly expansionTpl = computed<TemplateRef<unknown> | null>(
    () => this.expansionDir()?.tpl ?? null,
  );

  protected tplFor(field: string): TemplateRef<unknown> | null {
    return this.cells().find((c) => c.field() === field)?.tpl ?? null;
  }

  protected resolveIcon(a: TableAction, row: unknown): string {
    return typeof a.icon === 'function' ? a.icon(row) : a.icon;
  }

  protected resolveLabel(a: TableAction, row: unknown): string {
    return typeof a.label === 'function' ? a.label(row) : a.label;
  }

  protected resolveSeverity(a: TableAction, row: unknown): string | undefined {
    return typeof a.severity === 'function' ? a.severity(row) : a.severity;
  }

  protected resolveHidden(a: TableAction, row: unknown): boolean {
    return a.hidden ? a.hidden(row) : false;
  }

  protected openMenu(event: Event, action: TableAction, row: unknown): void {
    const items = typeof action.menuItems === 'function'
      ? action.menuItems(row)
      : (action.menuItems ?? []);
    this.activeMenuItems.set(items);
    this.actionMenuRef?.toggle(event);
  }
}
