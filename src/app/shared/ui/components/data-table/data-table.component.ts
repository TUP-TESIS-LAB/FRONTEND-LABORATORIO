import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  contentChildren,
  input,
  output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { UiCellDirective } from './ui-cell.directive';
import { TableAction, TableColumn } from '@shared/ui/models/table-column.model';

@Component({
  selector: 'ui-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TableModule, NgTemplateOutlet, TooltipModule, EmptyStateComponent],
  template: `
    @if (value().length === 0 && !loading()) {
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
          [totalRecords]="totalRecords()"
          [first]="first()"
          [paginator]="paginator()"
          [pageLinks]="5"
          (onLazyLoad)="lazyLoad.emit($event)">

          <ng-template pTemplate="header">
            <tr>
              @for (col of columns(); track col.field) {
                <th
                  [class.ut-align-right]="col.align === 'right'"
                  [class.ut-align-center]="col.align === 'center'">
                  {{ col.header }}
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
                      <button
                        class="ut-ibtn"
                        type="button"
                        pTooltip="Ver"
                        tooltipPosition="top"
                        aria-label="Ver"
                        (click)="view.emit(row)">
                        <i class="pi pi-eye"></i>
                      </button>
                    }
                    @if (showEdit()) {
                      <button
                        class="ut-ibtn"
                        type="button"
                        pTooltip="Editar"
                        tooltipPosition="top"
                        aria-label="Editar"
                        (click)="edit.emit(row)">
                        <i class="pi pi-pencil"></i>
                      </button>
                    }
                    @if (showDelete()) {
                      <button
                        class="ut-ibtn ut-ibtn--danger"
                        type="button"
                        pTooltip="Eliminar"
                        tooltipPosition="top"
                        aria-label="Eliminar"
                        (click)="rowDelete.emit(row)">
                        <i class="pi pi-trash"></i>
                      </button>
                    }
                    @for (a of actions(); track a.key) {
                      <button
                        class="ut-ibtn"
                        [class.ut-ibtn--danger]="a.severity === 'danger'"
                        type="button"
                        [pTooltip]="a.label"
                        tooltipPosition="top"
                        [attr.aria-label]="a.label"
                        (click)="action.emit({ key: a.key, row })">
                        <i [class]="'pi ' + a.icon"></i>
                      </button>
                    }
                  </div>
                </td>
              }
            </tr>
          </ng-template>
        </p-table>
      </div>
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
    .ut-ibtn--danger:hover { background: #fdecee !important; color: #e23a47 !important; }
  `],
})
export class DataTableComponent {
  // ── Data ──
  readonly value    = input.required<readonly unknown[]>();
  readonly columns  = input.required<readonly TableColumn[]>();
  readonly loading  = input<boolean>(false);
  readonly dataKey  = input<string>('id');

  // ── Pagination ──
  readonly lazy         = input<boolean>(false);
  readonly paginator    = input<boolean>(false);
  readonly rows         = input<number>(10);
  readonly totalRecords = input<number>(0);
  readonly first        = input<number>(0);

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
  readonly lazyLoad     = output<TableLazyLoadEvent>();
  readonly view         = output<unknown>();
  readonly edit         = output<unknown>();
  readonly rowDelete    = output<unknown>();
  readonly action       = output<{ key: string; row: unknown }>();
  readonly emptyCtaClick = output<void>();

  // ── Internal ──
  protected readonly hasActions = computed(() =>
    this.showView() || this.showEdit() || this.showDelete() || this.actions().length > 0,
  );

  private readonly cells = contentChildren(UiCellDirective);

  protected tplFor(field: string): TemplateRef<unknown> | null {
    return this.cells().find((c) => c.field() === field)?.tpl ?? null;
  }
}
