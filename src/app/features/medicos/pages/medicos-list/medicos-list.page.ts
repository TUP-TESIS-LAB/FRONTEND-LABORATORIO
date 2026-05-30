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
import { Doctor } from '../../models/doctor.model';
import { loadDoctors, toggleDoctorStatus, deleteDoctor } from '../../store/doctor.actions';
import { selectAllDoctors, selectDoctorPending } from '../../store/doctor.selectors';

@Component({
  selector: 'med-medicos-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [RouterLink, TableModule, ButtonModule, TagModule, TooltipModule, ConfirmDialogModule, EmptyStateComponent],
  template: `
    <div class="p-6">
      <header class="flex items-center justify-between mb-4">
        <div>
          <div class="text-xs text-surface-500">Servicios clínicos</div>
          <h1 class="text-2xl font-semibold flex items-center gap-2"><i class="pi pi-heart"></i> Médicos derivantes</h1>
        </div>
        <a [routerLink]="['/medicos', 'nuevo']">
          <p-button label="Nuevo médico" icon="pi pi-plus" />
        </a>
      </header>

      <p-table [value]="items()" [loading]="pending()" responsiveLayout="scroll" dataKey="id">
        <ng-template pTemplate="header">
          <tr>
            <th>Médico</th><th>Matrícula</th><th>Registro</th><th>Estado</th>
            <th class="text-right" style="width:160px">Acciones</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-d>
          <tr>
            <td>{{ d.lastName }}, {{ d.firstName }}</td>
            <td>{{ d.tuition }}</td>
            <td>{{ registrationLabel(d) }}</td>
            <td>
              <p-tag [severity]="d.active ? 'success' : 'secondary'" [value]="d.active ? 'Activo' : 'Inactivo'" />
            </td>
            <td class="text-right">
              <a [routerLink]="['/medicos', d.id, 'editar']">
                <p-button [text]="true" icon="pi pi-pencil" pTooltip="Editar" ariaLabel="Editar" />
              </a>
              <p-button [text]="true" icon="pi pi-refresh" pTooltip="Activar/Desactivar"
                        ariaLabel="Activar/Desactivar" (onClick)="confirmToggle(d)" />
              <p-button [text]="true" icon="pi pi-trash" severity="danger" pTooltip="Eliminar"
                        ariaLabel="Eliminar" (onClick)="confirmDelete(d)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="5">
              <a [routerLink]="['/medicos', 'nuevo']">
                <ui-empty-state heading="Sin médicos derivantes" icon="pi-heart"
                                description="Agregá el primer médico derivante." ctaLabel="Nuevo médico" />
              </a>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <p-confirmDialog />
    </div>
  `,
})
export class MedicosListPage implements OnInit {
  private readonly store = inject(Store);
  private readonly confirm = inject(ConfirmationService);

  readonly items = this.store.selectSignal(selectAllDoctors);
  readonly pending = this.store.selectSignal(selectDoctorPending);

  ngOnInit(): void { this.store.dispatch(loadDoctors()); }

  registrationLabel(d: Doctor): string {
    return d.registrationType === 'NACIONAL' ? 'Nacional' : 'Provincial';
  }

  confirmToggle(d: Doctor): void {
    const verb = d.active ? 'desactivar' : 'reactivar';
    this.confirm.confirm({
      header: `¿${verb[0].toUpperCase()}${verb.slice(1)} médico?`,
      message: `${d.lastName}, ${d.firstName}`,
      accept: () => this.store.dispatch(toggleDoctorStatus({ id: d.id })),
    });
  }

  confirmDelete(d: Doctor): void {
    this.confirm.confirm({
      header: '¿Eliminar médico?',
      message: `${d.lastName}, ${d.firstName}. Esta acción lo da de baja.`,
      acceptLabel: 'Eliminar', rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(deleteDoctor({ id: d.id })),
    });
  }
}
