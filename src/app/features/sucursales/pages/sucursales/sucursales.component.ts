import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { TableColumn } from '@shared/ui/models/table-column.model';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { loadSucursales } from '../../store/sucursales.actions';
import { selectAllSucursales, selectSucursalesPending } from '../../store/sucursales.selectors';
import { BranchTotemConfigService } from '../../services/branch-totem-config.service';
import { Sucursal } from '../../models/sucursal.model';

@Component({
  selector: 'app-sucursales',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ToggleSwitch, ToastModule, DataTableComponent, UiCellDirective],
  providers: [MessageService],
  template: `
    <p-toast />
    <h2 class="page-title"><i class="pi pi-building page-title-icon" aria-hidden="true"></i> Sucursales</h2>
    <ui-table
      [value]="sucursales()"
      [loading]="pending()"
      [columns]="columns"
      [paginator]="true"
      [rows]="20"
      [rowsPerPageOptions]="[10, 20, 50, 100]"
      emptyHeading="Sin sucursales"
      emptyIcon="pi-map-marker"
      emptyDescription="Agregá la primera sucursal para empezar.">

      <ng-template uiCell="direccion" let-row>
        @if ($any(row).address; as addr) {
          {{ addr.street }} {{ addr.streetNumber }}
        } @else {
          <span class="text-surface-400">—</span>
        }
      </ng-template>

      <ng-template uiCell="totem" let-row>
        <p-toggleswitch
          [ngModel]="totemEnabledById()[branchIdNum($any(row).id)]"
          [disabled]="!isAdmin()"
          (onChange)="onToggleTotem(branchIdNum($any(row).id), $event.checked)" />
      </ng-template>
    </ui-table>
  `,
})
export class SucursalesPageComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly totemConfigService = inject(BranchTotemConfigService);
  private readonly toast = inject(MessageService);
  private readonly session = inject(UserSessionService);

  readonly sucursales = this.store.selectSignal(selectAllSucursales);
  readonly pending = this.store.selectSignal(selectSucursalesPending);

  readonly totemEnabledById = signal<Record<number, boolean>>({});

  readonly isAdmin = computed(() =>
    this.session.currentUser()?.roles?.some(r => r.code === 'ADMINISTRADOR') ?? false,
  );

  readonly columns: readonly TableColumn[] = [
    { field: 'description', header: 'Nombre' },
    { field: 'direccion',   header: 'Dirección' },
    { field: 'totem',       header: 'Tótem' },
  ];

  constructor() {
    effect(() => {
      const list = this.sucursales();
      for (const s of list) {
        const id = this.branchIdNum(s.id);
        if (Number.isNaN(id)) continue;
        this.totemConfigService.get(id).subscribe({
          next: cfg => this.totemEnabledById.update(m => ({ ...m, [id]: cfg?.enabled ?? false })),
          error: () => {/* silent: deja undefined → renderiza como off */},
        });
      }
    });
  }

  ngOnInit(): void {
    this.store.dispatch(loadSucursales());
  }

  protected branchIdNum(id: string | number): number {
    return typeof id === 'number' ? id : Number(id);
  }

  protected onToggleTotem(branchId: number, enabled: boolean): void {
    const prev = this.totemEnabledById()[branchId];
    this.totemEnabledById.update(m => ({ ...m, [branchId]: enabled }));
    this.totemConfigService.upsert(branchId, enabled).subscribe({
      next: () => this.toast.add({ severity: 'success', summary: 'Tótem actualizado' }),
      error: () => {
        this.totemEnabledById.update(m => ({ ...m, [branchId]: prev }));
        this.toast.add({ severity: 'error', summary: 'No se pudo actualizar' });
      },
    });
  }
}
