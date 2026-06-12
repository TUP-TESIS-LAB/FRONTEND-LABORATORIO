import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  ViewChild,
  computed,
  contentChildren,
  input,
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
import { TableAction, TableColumn } from '@shared/ui/models/table-column.model';

@Component({
  selector: 'ui-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // En modo flex-scroll (scrollHeight="flex") el componente llena el alto de su contenedor
  // flex y la tabla scrollea internamente; así el footer/pricing de alrededor queda fijo.
  host: { '[class.ut-flex-scroll]': "scrollHeight() === 'flex'" },
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
          [scrollable]="scrollHeight() !== null"
          [scrollHeight]="scrollHeight() ?? undefined"
          (onLazyLoad)="lazyLoad.emit($event)">

          <ng-template pTemplate="header">
            <tr>
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

          <ng-template pTemplate="body" let-row>
            <tr>
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
                <td class="ut-actions-td">
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

          @if (lazy()) {
            <ng-template pTemplate="emptymessage">
              <tr>
                <td [attr.colspan]="columns().length + (hasActions() ? 1 : 0)" style="padding:0;border:none">
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

  // ── Scroll ──
  readonly scrollHeight = input<string | null>(null);

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

  // ── Internal ──
  protected readonly hasActions = computed(() =>
    this.showView() || this.showEdit() || this.showDelete() || this.actions().length > 0,
  );
  protected readonly hasMenuActions = computed(() =>
    this.actions().some((a) => a.type === 'menu'),
  );
  protected readonly activeMenuItems = signal<MenuItem[]>([]);

  @ViewChild('actionMenu') private actionMenuRef?: Menu;

  private readonly cells = contentChildren(UiCellDirective);

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
