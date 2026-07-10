import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { TableColumn } from '@shared/ui/models/table-column.model';
import { BranchTag, SectionListItemWithCount } from '../../../models/section-list-item.model';

/** Cuántas sucursales se muestran como tag antes de colapsar en "+N". */
const MAX_BRANCH_TAGS = 3;

@Component({
  selector: 'emp-secciones-table',
  standalone: true,
  imports: [TagModule, DataTableComponent, UiCellDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-table
      [value]="secciones()"
      [loading]="loading()"
      [columns]="columns"
      [entityLabel]="'secciones'"
      [showEdit]="true"
      emptyHeading="Sin secciones"
      emptyIcon="pi-sitemap"
      emptyDescription="Todavía no hay secciones. Creá la primera con «Nueva sección»."
      (edit)="edit.emit($any($event))">

      <ng-template uiCell="analisis" let-row>
        <span class="sec-count">{{ $any(row).analysisCount }}</span>
      </ng-template>

      <ng-template uiCell="sucursales" let-row>
        @if ($any(row).branches.length === 0) {
          <span class="sec-muted">Sin uso</span>
        } @else {
          <div class="sec-tags">
            @for (b of visibleBranches($any(row).branches); track b.id) {
              <p-tag [value]="b.code" severity="secondary" [rounded]="true" />
            }
            @if (extraBranches($any(row).branches) > 0) {
              <span class="sec-more">+{{ extraBranches($any(row).branches) }}</span>
            }
          </div>
        }
      </ng-template>

      <ng-template uiCell="estado" let-row>
        <p-tag [value]="$any(row).active ? 'Activa' : 'Inactiva'"
               [severity]="$any(row).active ? 'success' : 'warn'" />
      </ng-template>
    </ui-table>
  `,
  styles: [`
    .sec-count { font-weight: 600; }
    .sec-muted { color: var(--ds-text-muted); font-style: italic; }
    .sec-tags { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
    .sec-more { font-size: 12px; color: var(--ds-text-muted); }
  `],
})
export class SeccionesTableComponent {
  readonly secciones = input.required<readonly SectionListItemWithCount[]>();
  readonly loading = input<boolean>(false);

  readonly edit = output<SectionListItemWithCount>();

  readonly columns: readonly TableColumn[] = [
    { field: 'name',       header: 'Sección' },
    { field: 'analisis',   header: 'Análisis', align: 'center' },
    { field: 'sucursales', header: 'Sucursales que la usan' },
    { field: 'estado',     header: 'Estado' },
  ];

  visibleBranches(branches: BranchTag[]): BranchTag[] {
    return branches.slice(0, MAX_BRANCH_TAGS);
  }

  extraBranches(branches: BranchTag[]): number {
    return Math.max(0, branches.length - MAX_BRANCH_TAGS);
  }
}
