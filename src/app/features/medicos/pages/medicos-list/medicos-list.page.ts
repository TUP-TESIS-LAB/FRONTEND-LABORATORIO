import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { TableColumn, TableAction } from '@shared/ui/models/table-column.model';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { NotificationService } from '@core/services/notification.service';
import { CreateDoctorRequest, Doctor } from '../../models/doctor.model';
import {
  loadDoctors, toggleDoctorStatus, deleteDoctor, addDoctor, addDoctorSuccess, addDoctorFailure,
} from '../../store/doctor.actions';
import { selectAllDoctors, selectDoctorPending } from '../../store/doctor.selectors';
import { doctorSaveErrorMessage } from '../../store/doctor-error.util';
import { MedicoFormDrawerComponent } from './components/medico-form-drawer.component';

@Component({
  selector: 'med-medicos-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [
    ButtonModule, TagModule, ConfirmDialogModule, DataTableComponent, UiCellDirective,
    PageHeaderComponent, MedicoFormDrawerComponent,
  ],
  styles: [`:host { display: block; height: 100%; }`],
  template: `
    <div class="flex flex-col h-full min-h-0">
      <ui-page-header heading="Médicos derivantes">
        <p-button label="Nuevo médico" (onClick)="openDrawer()" />
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
        (emptyCtaClick)="openDrawer()">

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

      <med-medico-form-drawer
        [visible]="drawerOpen()"
        [saving]="pending()"
        [resetToken]="resetToken()"
        (create)="onCreate($event)"
        (createAndNext)="onCreateAndNext($event)"
        (cancel)="closeDrawer()" />

      <p-confirmDialog [draggable]="false" />
    </div>
  `,
})
export class MedicosListPage implements OnInit {
  private readonly store = inject(Store);
  private readonly confirm = inject(ConfirmationService);
  private readonly actions$ = inject(Actions);
  private readonly notifications = inject(NotificationService);
  protected readonly router = inject(Router);

  readonly items = this.store.selectSignal(selectAllDoctors);
  readonly pending = this.store.selectSignal(selectDoctorPending);

  readonly drawerOpen = signal(false);
  readonly resetToken = signal(0);
  /** Si el alta en curso vino de "Guardar y agregar otro" (mantener drawer abierto + limpiar). */
  private addAndContinue = false;

  readonly columns: readonly TableColumn[] = [
    { field: 'nombre',           header: 'Médico' },
    { field: 'tuition',          header: 'Matrícula' },
    { field: 'registrationType', header: 'Registro' },
    { field: 'active',           header: 'Estado' },
  ];

  readonly extraActions: readonly TableAction[] = [
    { key: 'toggle', icon: 'pi-refresh', label: 'Activar/Desactivar' },
  ];

  constructor() {
    this.actions$.pipe(ofType(addDoctorSuccess), takeUntilDestroyed()).subscribe(() => {
      this.notifications.success('Médico agregado.');
      if (this.addAndContinue) {
        this.resetToken.update((n) => n + 1); // limpia el form y deja el drawer abierto
      } else {
        this.drawerOpen.set(false);
      }
    });
    this.actions$.pipe(ofType(addDoctorFailure), takeUntilDestroyed()).subscribe(({ error }) => {
      this.notifications.error(doctorSaveErrorMessage(error));
    });
  }

  ngOnInit(): void { this.store.dispatch(loadDoctors()); }

  openDrawer(): void { this.drawerOpen.set(true); }
  closeDrawer(): void { this.drawerOpen.set(false); }

  onCreate(req: CreateDoctorRequest): void {
    this.addAndContinue = false;
    this.store.dispatch(addDoctor({ req }));
  }

  onCreateAndNext(req: CreateDoctorRequest): void {
    this.addAndContinue = true;
    this.store.dispatch(addDoctor({ req }));
  }

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
