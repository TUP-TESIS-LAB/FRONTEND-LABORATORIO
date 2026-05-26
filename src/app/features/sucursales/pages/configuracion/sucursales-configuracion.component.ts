import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';

import * as A from '../../store/sucursal.actions';
import { selectSucursalList, selectSucursalLoading } from '../../store/sucursal.selectors';
import { Sucursal } from '../../models/sucursal.model';

@Component({
  selector: 'app-sucursales-configuracion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TableModule, ButtonModule, TagModule, ConfirmDialogModule, ToastModule],
  providers: [ConfirmationService, MessageService],
  templateUrl: './sucursales-configuracion.component.html',
  styleUrl: './sucursales-configuracion.component.scss',
})
export class SucursalesConfiguracionComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly confirm = inject(ConfirmationService);
  private readonly router = inject(Router);

  readonly sucursales = this.store.selectSignal(selectSucursalList);
  readonly loading = this.store.selectSignal(selectSucursalLoading);

  ngOnInit(): void {
    this.store.dispatch(A.loadSucursales());
  }

  openNew(): void {
    this.router.navigate(['/sucursales/configuracion/nueva']);
  }

  openDetail(sucursal: Sucursal): void {
    this.router.navigate(['/sucursales/configuracion', sucursal.id]);
  }

  toggle(s: Sucursal): void { this.store.dispatch(A.toggleSucursalStatus({ id: s.id })); }

  remove(s: Sucursal): void {
    this.confirm.confirm({
      message: `¿Borrar sucursal "${s.code}"?`,
      header: 'Confirmar',
      accept: () => this.store.dispatch(A.deleteSucursal({ id: s.id })),
    });
  }

  formatAddress(s: Sucursal): string {
    if (!s.address) return '—';
    return [s.address.street, s.address.streetNumber].filter(Boolean).join(' ') || '—';
  }
}
