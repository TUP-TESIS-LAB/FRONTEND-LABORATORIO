import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { TableColumn, TableAction } from '@shared/ui/models/table-column.model';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { Doctor } from '../../models/doctor.model';
import { loadDoctors, toggleDoctorStatus, deleteDoctor } from '../../store/doctor.actions';
import { selectAllDoctors, selectDoctorPending } from '../../store/doctor.selectors';

@Component({
  selector: 'med-medicos-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [RouterLink, ButtonModule, TagModule, ConfirmDialogModule, DataTableComponent, UiCellDirective, PageHeaderComponent],
  styles: [`:host { display: block; height: 100%; }`],
  template: `
    <div class="flex flex-col h-full min-h-0">
      <ui-page-header heading="Médicos derivantes">
        <a [routerLink]="['/medicos', 'nuevo']">
          <p-button label="Nuevo médico" />
        </a>
      </ui-page-header>

      <div class="flex-1 min-h-0 flex flex-col">
      <ui-table
        [value]="items()"
        [loading]="pending()"
        [columns]="columns"
        [paginator]="true"
        [rows]="20"
        [rowsPerPageOptions]="[10, 20, 50, 100]"
        [entityLabel]="'médicos'"
        [scrollHeight]="'flex'"
        [showEdit]="true"
        [showDelete]="true"
        [actions]="extraActions"
        emptyHeading="Sin médicos derivantes"
        emptyIcon="pi-heart"
        emptyDescription="Agregá el primer médico derivante."
        emptyCtaLabel="Nuevo médico"
        (edit)="onEdit($any($event))"
        (rowDelete)="confirmDelete($any($event))"
        (action)="onAction($event)"
        (emptyCtaClick)="router.navigate(['/medicos', 'nuevo'])">

        <ng-template uiCell="nombre" let-row>
          {{ $any(row).lastName }}, {{ $any(row).firstName }}
        </ng-template>

        <ng-template uiCell="registrationType" let-row>
          {{ registrationLabel($any(row)) }}
        </ng-template>

        <ng-template uiCell="active" let-row>
          <p-tag [severity]="$any(row).active ? 'success' : 'secondary'"
                 [value]="$any(row).active ? 'Activo' : 'Inactivo'" />
        </ng-template>
      </ui-table>
      </div>

      <p-confirmDialog />
    </div>
  `,
})
export class MedicosListPage implements OnInit {
  private readonly store = inject(Store);
  private readonly confirm = inject(ConfirmationService);
  protected readonly router = inject(Router);

  readonly items = this.store.selectSignal(selectAllDoctors);
  readonly pending = this.store.selectSignal(selectDoctorPending);

  readonly columns: readonly TableColumn[] = [
    { field: 'nombre',           header: 'Médico' },
    { field: 'tuition',          header: 'Matrícula' },
    { field: 'registrationType', header: 'Registro' },
    { field: 'active',           header: 'Estado' },
  ];

  readonly extraActions: readonly TableAction[] = [
    { key: 'toggle', icon: 'pi-refresh', label: 'Activar/Desactivar' },
  ];

  ngOnInit(): void { this.store.dispatch(loadDoctors()); }

  registrationLabel(d: Doctor): string {
    return d.registrationType === 'NACIONAL' ? 'Nacional' : 'Provincial';
  }

  onEdit(d: Doctor): void {
    this.router.navigate(['/medicos', d.id, 'editar']);
  }

  onAction(e: { key: string; row: unknown }): void {
    if (e.key === 'toggle') this.confirmToggle(e.row as Doctor);
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
