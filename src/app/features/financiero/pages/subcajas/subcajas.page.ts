import {
  ChangeDetectionStrategy, Component, OnInit, computed, inject, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';
import { selectCashRegisters, selectCashRegistersLoading } from '../../store/financiero.selectors';
import { loadCashRegisters, createCashRegister, deactivateCashRegister } from '../../store/financiero.actions';

/**
 * ABM de subcajas de la sucursal activa (KAN-156, F3). Solo ADMINISTRADOR.
 * El gate de rol se aplica en la ruta (admin) + el backend (POST/DELETE exigen ADMINISTRADOR).
 */
@Component({
  selector: 'fin-subcajas-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PageHeaderComponent, EmptyStateComponent],
  template: `
    <div class="fin-abm">
      <ui-page-header
        heading="Cajas de la sucursal"
        subtitle="Creá y administrá las subcajas. Cada caja tiene su propia sesión y arqueo de efectivo." />

      <div class="fin-card fin-card--form">
        <h3>Nueva caja</h3>
        <div class="fin-form-row">
          <input
            class="fin-input"
            data-testid="nueva-caja-nombre"
            [ngModel]="nombre()" (ngModelChange)="nombre.set($event)"
            maxlength="120"
            placeholder="Ej.: Caja mostrador, Caja extracciones…" />
          <button
            class="fin-btn fin-btn--primary"
            data-testid="crear-caja"
            type="button"
            [disabled]="!canCreate()"
            (click)="crear()">
            <i class="pi pi-plus"></i> Crear caja
          </button>
        </div>
        @if (branchId() == null) {
          <small class="fin-warn"><i class="pi pi-exclamation-triangle"></i> No hay una sucursal activa asignada.</small>
        }
      </div>

      <div class="fin-card">
        @if (registers().length === 0 && !loading()) {
          <ui-empty-state
            icon="pi-wallet"
            heading="Todavía no hay cajas"
            description="Creá la primera caja de la sucursal para empezar a operar." />
        } @else {
          <table class="fin-list">
            <thead>
              <tr><th>Caja</th><th>Estado</th><th class="fin-list__actions">Acciones</th></tr>
            </thead>
            <tbody>
              @for (r of registers(); track r.id) {
                <tr>
                  <td><i class="pi pi-wallet"></i> {{ r.name }}</td>
                  <td>
                    <span class="fin-pill" [class.fin-pill--ok]="r.active">
                      {{ r.active ? 'Activa' : 'Inactiva' }}
                    </span>
                  </td>
                  <td class="fin-list__actions">
                    @if (r.active) {
                      <button class="fin-btn fin-btn--danger-ghost" type="button"
                              data-testid="baja-caja" (click)="dar_baja(r.id, r.name)">
                        <i class="pi pi-trash"></i> Dar de baja
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `,
  styles: [`
    .fin-abm { display: flex; flex-direction: column; gap: 18px; }
    .fin-card {
      background: white; border-radius: 12px; padding: 18px 20px;
      box-shadow: 0 1px 2px rgba(28,30,55,.06); border: 1px solid #e8e9f0;
    }
    .fin-card--form h3 { margin: 0 0 12px; font-size: 15px; font-weight: 700; color: #22243a; }
    .fin-form-row { display: flex; gap: 10px; align-items: center; }
    .fin-input {
      flex: 1; border: 1.5px solid #e8e9f0; border-radius: 8px; padding: 9px 12px;
      font-size: 14px; color: #22243a; background: white;
    }
    .fin-warn { display: block; margin-top: 10px; font-size: 12.5px; color: #b5740c; }
    .fin-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 14px; border-radius: 8px; border: none;
      font-size: 13.5px; font-weight: 500; cursor: pointer;
    }
    .fin-btn--primary { background: #4b4ddb; color: white; }
    .fin-btn--primary:disabled { opacity: .5; cursor: not-allowed; }
    .fin-btn--danger-ghost { background: white; color: #d83a3a; border: 1.5px solid #f3d3d3; }
    .fin-btn--danger-ghost:hover { background: #fdebeb; }

    .fin-list { width: 100%; border-collapse: collapse; }
    .fin-list th { text-align: left; font-size: 12px; color: #7c8092; padding: 8px 10px; border-bottom: 1px solid #e8e9f0; }
    .fin-list td { padding: 12px 10px; border-bottom: 1px solid #f0f1f5; font-size: 14px; color: #22243a; }
    .fin-list__actions { text-align: right; }
    .fin-pill { font-size: 11.5px; padding: 2px 8px; border-radius: 999px; background: #f5f6f9; color: #7c8092; }
    .fin-pill--ok { background: #e3f6ec; color: #0f8a55; }
  `],
})
export class SubcajasPage implements OnInit {
  private readonly store = inject(Store);
  private readonly branchCtx = inject(OperatorBranchContextService);

  readonly registers = this.store.selectSignal(selectCashRegisters);
  readonly loading = this.store.selectSignal(selectCashRegistersLoading);
  readonly branchId = computed(() => this.branchCtx.branchId());

  protected nombre = signal('');
  protected readonly canCreate = computed(() => this.nombre().trim().length > 0 && this.branchId() != null);

  ngOnInit(): void {
    const b = this.branchId();
    if (b != null) this.store.dispatch(loadCashRegisters({ branchId: b }));
  }

  protected crear(): void {
    const b = this.branchId();
    if (!this.canCreate() || b == null) return;
    this.store.dispatch(createCashRegister({ branchId: b, name: this.nombre().trim() }));
    this.nombre.set('');
  }

  protected dar_baja(id: number, name: string): void {
    const b = this.branchId();
    if (b == null) return;
    if (!confirm(`¿Dar de baja la caja "${name}"? No se podrá usar para nuevas sesiones.`)) return;
    this.store.dispatch(deactivateCashRegister({ id, branchId: b }));
  }
}
