import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { Employee } from '../../models/employee.model';
import { loadEmployees, toggleEmployeeStatus } from '../../store/employee.actions';
import { selectAllEmployees, selectEmployeePending } from '../../store/employee.selectors';

@Component({
  selector: 'emp-empleados-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [RouterLink, TableModule, ButtonModule, TagModule, TooltipModule, ConfirmDialogModule, EmptyStateComponent],
  template: `
    <div class="py-2">
      <header class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold m-0">Empleados</h2>
        <a [routerLink]="['/sucursales', 'empleados', 'nuevo']">
          <p-button label="Nuevo empleado" icon="pi pi-plus" />
        </a>
      </header>

      <p-table [value]="items()" [loading]="pending()" responsiveLayout="scroll" dataKey="id">
        <ng-template pTemplate="header">
          <tr>
            <th>Empleado</th><th>Documento</th><th>Matrícula</th><th>Bioquímico</th><th>Estado</th>
            <th class="text-right" style="width:140px">Acciones</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-e>
          <tr>
            <td>{{ e.lastName }}, {{ e.firstName }}</td>
            <td>{{ e.document }}</td>
            <td>{{ e.registration || '—' }}</td>
            <td>
              @if (e.isBiochemist) { <p-tag severity="info" value="Sí" /> } @else { <span class="text-surface-400">No</span> }
            </td>
            <td><p-tag [severity]="e.active ? 'success' : 'secondary'" [value]="e.active ? 'Activo' : 'Inactivo'" /></td>
            <td class="text-right">
              <a [routerLink]="['/sucursales', 'empleados', e.id, 'editar']">
                <p-button [text]="true" icon="pi pi-pencil" pTooltip="Editar" ariaLabel="Editar" />
              </a>
              <p-button [text]="true" icon="pi pi-refresh" pTooltip="Activar/Desactivar"
                        ariaLabel="Activar/Desactivar" (onClick)="confirmToggle(e)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="6">
              <a [routerLink]="['/sucursales', 'empleados', 'nuevo']">
                <ui-empty-state heading="Sin empleados" icon="pi-users"
                                description="Agregá el primer empleado del laboratorio." ctaLabel="Nuevo empleado" />
              </a>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <p-confirmDialog />
    </div>
  `,
})
export class EmpleadosListPage implements OnInit {
  private readonly store = inject(Store);
  private readonly confirm = inject(ConfirmationService);

  readonly items = this.store.selectSignal(selectAllEmployees);
  readonly pending = this.store.selectSignal(selectEmployeePending);

  ngOnInit(): void { this.store.dispatch(loadEmployees()); }

  confirmToggle(e: Employee): void {
    const verb = e.active ? 'desactivar' : 'reactivar';
    this.confirm.confirm({
      header: `¿${verb[0].toUpperCase()}${verb.slice(1)} empleado?`,
      message: `${e.lastName}, ${e.firstName}`,
      accept: () => this.store.dispatch(toggleEmployeeStatus({ id: e.id })),
    });
  }
}
