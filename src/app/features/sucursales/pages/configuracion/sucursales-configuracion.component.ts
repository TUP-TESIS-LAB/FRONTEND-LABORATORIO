import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
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
import { SucursalFormModalComponent } from '../../components/sucursal-form-modal.component';

@Component({
  selector: 'app-sucursales-configuracion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TableModule, ButtonModule, TagModule, ConfirmDialogModule, ToastModule, SucursalFormModalComponent],
  providers: [ConfirmationService, MessageService],
  templateUrl: './sucursales-configuracion.component.html',
  styleUrl: './sucursales-configuracion.component.scss',
})
export class SucursalesConfiguracionComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly confirm = inject(ConfirmationService);

  readonly sucursales = this.store.selectSignal(selectSucursalList);
  readonly loading = this.store.selectSignal(selectSucursalLoading);

  readonly modalOpen = signal(false);
  readonly editing = signal<Sucursal | null>(null);

  ngOnInit(): void {
    this.store.dispatch(A.loadSucursales());
  }

  openCreate(): void { this.editing.set(null); this.modalOpen.set(true); }
  openEdit(s: Sucursal): void { this.editing.set(s); this.modalOpen.set(true); }
  closeModal(): void { this.modalOpen.set(false); this.editing.set(null); }

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
