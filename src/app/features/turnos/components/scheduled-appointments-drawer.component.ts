import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { loadTodayAppointments } from '../store/appointments/appointments.actions';
import { selectScheduledAppointmentsForDrawer } from '../store/appointments/appointments.derived.selectors';
import { selectAppointmentsLoading } from '../store/appointments/appointments.selectors';
import { OperatorBranchContextService } from '../services/operator-branch.context';

@Component({
  selector: 'app-scheduled-appointments-drawer',
  standalone: true,
  imports: [DrawerModule, ButtonModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-drawer
      [visible]="visible()"
      (visibleChange)="visibleChange.emit($event)"
      position="right"
      header="Turnos del día"
      styleClass="ui-scheduled-drawer">
      @if (loading()) {
        <div class="drawer-loading">Cargando turnos…</div>
      } @else if (rows().length === 0) {
        <div class="drawer-empty">No hay turnos programados para hoy.</div>
      } @else {
        <ul class="drawer-list">
          @for (row of rows(); track row.id) {
            <li class="drawer-row" [class.row-cancelado]="row.estado === 'Cancelado'">
              <span class="row-hora">{{ horaLabel(row.hora) }}</span>
              <span class="row-paciente">{{ row.paciente }}</span>
              <p-tag
                [value]="estadoLabel(row.estado)"
                [severity]="estadoSeverity(row.estado)"
                styleClass="row-estado" />
            </li>
          }
        </ul>
      }
    </p-drawer>
  `,
  styles: [`
    :host ::ng-deep .ui-scheduled-drawer { width: 320px; }

    .drawer-loading,
    .drawer-empty {
      padding: 1rem;
      color: var(--ds-text-muted, #64748b);
      font-size: 0.875rem;
    }

    .drawer-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .drawer-row {
      display: grid;
      grid-template-columns: 72px 1fr auto;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--ds-border, #e2e8f0);
      font-size: 0.875rem;
    }
    .drawer-row.row-cancelado {
      opacity: 0.6;
    }
    .row-hora {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      font-size: 0.8125rem;
    }
    .row-paciente {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    :host ::ng-deep .row-estado {
      font-size: 0.6875rem;
      padding: 0.125rem 0.4rem;
      line-height: 1;
    }
  `],
})
export class ScheduledAppointmentsDrawerComponent {
  private store = inject(Store);
  private branchContext = inject(OperatorBranchContextService);

  readonly visible = input.required<boolean>();
  readonly visibleChange = output<boolean>();

  protected rows = this.store.selectSignal(selectScheduledAppointmentsForDrawer);
  protected loading = this.store.selectSignal(selectAppointmentsLoading);

  constructor() {
    // Carga snapshot la primera vez que el drawer pasa a visible.
    effect(() => {
      if (this.visible()) {
        this.dispatchLoad();
      }
    });
  }

  protected estadoSeverity(estado: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (estado) {
      case 'Llego': return 'success';
      case 'Pendiente': return 'info';
      case 'Cancelado': return 'danger';
      default: return 'secondary';
    }
  }

  /**
   * El discriminator TS es 'Llego' (sin acento) para evitar caracteres
   * especiales en literals; en la UI mostramos 'En cola' que refleja
   * mejor el estado real del paciente (anunciado, esperando ser llamado).
   */
  protected estadoLabel(estado: string): string {
    return estado === 'Llego' ? 'En cola' : estado;
  }

  /**
   * Convierte 'HH:MM' 24h a '12h AM/PM'. Mantiene la UTC del backend
   * (mismo offset que el ISO original).
   */
  protected horaLabel(hora24: string): string {
    const [hStr, m] = hora24.split(':');
    const h = Number(hStr);
    if (!Number.isFinite(h)) return hora24;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${period}`;
  }

  private dispatchLoad(): void {
    const branchId = this.branchContext.branchId();
    if (branchId == null) return;
    this.store.dispatch(loadTodayAppointments({ branchId }));
  }
}
