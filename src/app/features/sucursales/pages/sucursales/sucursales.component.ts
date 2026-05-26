import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { loadSucursales } from '../../store/sucursales.actions';
import { selectAllSucursales, selectSucursalesPending } from '../../store/sucursales.selectors';
import { BranchTotemConfigService } from '../../services/branch-totem-config.service';

@Component({
  selector: 'app-sucursales',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, EmptyStateComponent, TableModule, ToggleSwitch, ToastModule],
  providers: [MessageService],
  template: `
    <p-toast />
    @if (pending()) {
      <p>Cargando sucursales...</p>
    } @else {
      @if (sucursales().length === 0) {
        <ui-empty-state heading="Sin sucursales" icon="pi-map-marker"
                        description="Agregá la primera sucursal para empezar." ctaLabel="Nueva sucursal" />
      } @else {
        <h2>Sucursales</h2>
        <p-table [value]="sucursales()" [tableStyle]="{ 'min-width': '40rem' }">
          <ng-template pTemplate="header">
            <tr>
              <th>Nombre</th>
              <th>Dirección</th>
              <th style="width: 8rem">Tótem</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td>{{ row.nombre }}</td>
              <td>{{ row.direccion }}</td>
              <td>
                <p-toggleswitch
                  [ngModel]="totemEnabledById()[branchIdNum(row.id)]"
                  [disabled]="!isAdmin()"
                  (onChange)="onToggleTotem(branchIdNum(row.id), $event.checked)" />
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
    }
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

  constructor() {
    // Cuando llega la lista de sucursales, cargar config de tótem por cada una.
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
    this.totemEnabledById.update(m => ({ ...m, [branchId]: enabled })); // optimistic
    this.totemConfigService.upsert(branchId, enabled).subscribe({
      next: () => this.toast.add({ severity: 'success', summary: 'Tótem actualizado' }),
      error: () => {
        this.totemEnabledById.update(m => ({ ...m, [branchId]: prev })); // revert
        this.toast.add({ severity: 'error', summary: 'No se pudo actualizar' });
      },
    });
  }
}
