import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { TableColumn, TableAction } from '@shared/ui/models/table-column.model';
import { Employee } from '../../models/employee.model';
import { loadEmployees, toggleEmployeeStatus } from '../../store/employee.actions';
import { selectAllEmployees, selectEmployeePending } from '../../store/employee.selectors';

@Component({
  selector: 'emp-empleados-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [TagModule, ConfirmDialogModule, DataTableComponent, UiCellDirective],
  template: `
    <div>
      <ui-table
        [value]="items()"
        [loading]="pending()"
        [columns]="columns"
        [paginator]="true"
        [rows]="20"
        [rowsPerPageOptions]="[10, 20, 50, 100]"
        [entityLabel]="'empleados'"
        [showEdit]="true"
        [actions]="extraActions"
        emptyHeading="Sin empleados"
        emptyIcon="pi-users"
        emptyDescription="Agregá el primer empleado del laboratorio."
        emptyCtaLabel="Nuevo empleado"
        (edit)="onEdit($any($event))"
        (action)="onAction($event)"
        (emptyCtaClick)="router.navigate(['/sucursales', 'empleados', 'nuevo'])">

        <ng-template uiCell="nombre" let-row>
          {{ $any(row).lastName }}, {{ $any(row).firstName }}
        </ng-template>

        <ng-template uiCell="registration" let-row>
          {{ $any(row).registration || '—' }}
        </ng-template>

        <ng-template uiCell="isBiochemist" let-row>
          @if ($any(row).isBiochemist) {
            <p-tag severity="info" value="Sí" />
          } @else {
            <span class="text-surface-400">No</span>
          }
        </ng-template>

        <ng-template uiCell="active" let-row>
          <p-tag [severity]="$any(row).active ? 'success' : 'secondary'"
                 [value]="$any(row).active ? 'Activo' : 'Inactivo'" />
        </ng-template>
      </ui-table>

      <p-confirmDialog />
    </div>
  `,
})
export class EmpleadosListPage implements OnInit {
  private readonly store = inject(Store);
  private readonly confirm = inject(ConfirmationService);
  protected readonly router = inject(Router);

  readonly items = this.store.selectSignal(selectAllEmployees);
  readonly pending = this.store.selectSignal(selectEmployeePending);

  readonly columns: readonly TableColumn[] = [
    { field: 'nombre',        header: 'Empleado' },
    { field: 'document',      header: 'Documento' },
    { field: 'registration',  header: 'Matrícula' },
    { field: 'isBiochemist',  header: 'Bioquímico' },
    { field: 'active',        header: 'Estado' },
  ];

  readonly extraActions: readonly TableAction[] = [
    { key: 'toggle', icon: 'pi-refresh', label: 'Activar/Desactivar' },
  ];

  ngOnInit(): void { this.store.dispatch(loadEmployees()); }

  onEdit(e: Employee): void {
    this.router.navigate(['/sucursales', 'empleados', e.id, 'editar']);
  }

  onAction(ev: { key: string; row: unknown }): void {
    if (ev.key === 'toggle') this.confirmToggle(ev.row as Employee);
  }

  confirmToggle(e: Employee): void {
    const verb = e.active ? 'desactivar' : 'reactivar';
    this.confirm.confirm({
      header: `¿${verb[0].toUpperCase()}${verb.slice(1)} empleado?`,
      message: `${e.lastName}, ${e.firstName}`,
      accept: () => this.store.dispatch(toggleEmployeeStatus({ id: e.id })),
    });
  }
}
