import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { TableColumn } from '@shared/ui/models/table-column.model';

import * as A from '../../store/sucursal.actions';
import { selectSucursalList, selectSucursalLoading } from '../../store/sucursal.selectors';
import { Sucursal } from '../../models/sucursal.model';

@Component({
  selector: 'app-sucursales-configuracion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TagModule, ConfirmDialogModule, ToastModule, DataTableComponent, UiCellDirective],
  providers: [ConfirmationService, MessageService],
  templateUrl: './sucursales-configuracion.component.html',
})
export class SucursalesConfiguracionComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly confirm = inject(ConfirmationService);
  protected readonly router = inject(Router);

  readonly sucursales = this.store.selectSignal(selectSucursalList);
  readonly loading = this.store.selectSignal(selectSucursalLoading);

  readonly columns: readonly TableColumn[] = [
    { field: 'code',        header: 'Nombre' },
    { field: 'description', header: 'Descripción' },
    { field: 'estado',      header: 'Estado' },
    { field: 'direccion',   header: 'Dirección' },
  ];

  ngOnInit(): void {
    this.store.dispatch(A.loadSucursales());
  }

  openNew(): void {
    this.router.navigate(['/sucursales/configuracion/nueva']);
  }

  openEdit(sucursal: Sucursal): void {
    // El "editar" abre el stepper editable, no la vista por tabs.
    this.router.navigate(['/sucursales/configuracion', sucursal.id, 'editar']);
  }

  remove(s: Sucursal): void {
    this.confirm.confirm({
      message: `¿Eliminar la sucursal "${s.code}"? Se conservará el histórico (soft-delete).`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.store.dispatch(A.deleteSucursal({ id: s.id })),
    });
  }

  formatAddress(s: Sucursal): string {
    if (!s.address) return '—';
    return [s.address.street, s.address.streetNumber].filter(Boolean).join(' ') || '—';
  }
}
