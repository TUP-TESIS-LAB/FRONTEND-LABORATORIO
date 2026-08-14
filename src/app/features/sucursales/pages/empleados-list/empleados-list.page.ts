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

      <p-confirmDialog [draggable]="false" />
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

  // Convención de activar/desactivar: ícono, label y severity dependen del estado de la
  // fila, para que se lea qué va a pasar al hacer clic. Antes era un 'pi-refresh' genérico
  // con label "Activar/Desactivar", que no distinguía entre las dos acciones opuestas.
  readonly extraActions: readonly TableAction[] = [
    {
      key: 'toggle',
      icon: (row) => ((row as Employee).active ? 'pi-ban' : 'pi-check'),
      label: (row) => ((row as Employee).active ? 'Desactivar' : 'Activar'),
      severity: (row) => ((row as Employee).active ? 'warn' : 'success'),
    },
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
    const verbCapitalizado = `${verb[0].toUpperCase()}${verb.slice(1)}`;
    this.confirm.confirm({
      header: `¿${verbCapitalizado} empleado?`,
      message: `${e.lastName}, ${e.firstName}`,
      // Sin acceptLabel/rejectLabel, PrimeNG cae a sus defaults en inglés ("Yes"/"No").
      acceptLabel: verbCapitalizado, rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(toggleEmployeeStatus({ id: e.id })),
    });
  }
}
