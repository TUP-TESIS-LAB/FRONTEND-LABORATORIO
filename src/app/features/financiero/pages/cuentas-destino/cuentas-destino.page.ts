import {
  ChangeDetectionStrategy, Component, OnInit, computed, inject, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { selectBankAccounts, selectBankAccountsLoading, selectBankAccountsSaving } from '../../store/financiero.selectors';
import { loadBankAccounts, createBankAccount, deactivateBankAccount } from '../../store/financiero.actions';

/**
 * ABM de cuentas destino del laboratorio (KAN-156, F6). Solo ADMINISTRADOR.
 * Scope tenant (sin sucursal). Las mutaciones POST/DELETE exigen ADMINISTRADOR en el backend.
 */
@Component({
  selector: 'fin-cuentas-destino-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PageHeaderComponent, EmptyStateComponent],
  template: `
    <div class="fin-abm">
      <ui-page-header
        heading="Cuentas destino"
        subtitle="Cuentas del laboratorio adonde se acreditan los cobros no-efectivo (transferencias, QR, tarjetas)." />

      <div class="fin-card fin-card--form">
        <h3>Nueva cuenta</h3>
        <div class="fin-form-grid">
          <div class="fin-field fin-field--full">
            <label>Nombre / etiqueta <span class="fin-req">obligatorio</span></label>
            <input class="fin-input" data-testid="cuenta-label"
                   [ngModel]="label()" (ngModelChange)="label.set($event)" maxlength="120"
                   placeholder="Ej.: Cuenta Galicia principal" />
          </div>
          <div class="fin-field">
            <label>Banco</label>
            <input class="fin-input" [ngModel]="banco()" (ngModelChange)="banco.set($event)" maxlength="120" />
          </div>
          <div class="fin-field">
            <label>Titular</label>
            <input class="fin-input" [ngModel]="titular()" (ngModelChange)="titular.set($event)" maxlength="160" />
          </div>
          <div class="fin-field">
            <label>CBU</label>
            <input class="fin-input" [ngModel]="cbu()" (ngModelChange)="cbu.set($event)" maxlength="40" />
          </div>
          <div class="fin-field">
            <label>Alias</label>
            <input class="fin-input" [ngModel]="alias()" (ngModelChange)="alias.set($event)" maxlength="120" />
          </div>
          <div class="fin-field">
            <label>CUIT</label>
            <input class="fin-input" [ngModel]="cuit()" (ngModelChange)="cuit.set($event)" maxlength="20" />
          </div>
        </div>
        <div class="fin-form-actions">
          <button class="fin-btn fin-btn--primary" type="button" data-testid="crear-cuenta"
                  [disabled]="!canCreate() || saving()" (click)="crear()">
            <i class="pi pi-plus"></i> Crear cuenta
          </button>
        </div>
      </div>

      <div class="fin-card">
        @if (cuentas().length === 0 && !loading()) {
          <ui-empty-state
            icon="pi-building-columns"
            heading="No hay cuentas destino"
            description="Creá la primera cuenta para poder seleccionarla al registrar cobros no-efectivo." />
        } @else {
          <table class="fin-list">
            <thead>
              <tr><th>Cuenta</th><th>Banco</th><th>CBU / Alias</th><th class="fin-list__actions">Acciones</th></tr>
            </thead>
            <tbody>
              @for (a of cuentas(); track a.id) {
                <tr>
                  <td><i class="pi pi-building-columns"></i> {{ a.label }}</td>
                  <td>{{ a.banco || '—' }}</td>
                  <td>
                    <div class="fin-tx-desc">
                      <span>{{ a.cbu || '—' }}</span>
                      @if (a.alias) { <small class="fin-muted">{{ a.alias }}</small> }
                    </div>
                  </td>
                  <td class="fin-list__actions">
                    <button class="fin-btn fin-btn--danger-ghost" type="button"
                            data-testid="baja-cuenta" (click)="dar_baja(a.id, a.label)">
                      <i class="pi pi-trash"></i> Dar de baja
                    </button>
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
    .fin-form-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    @media (max-width: 720px) { .fin-form-grid { grid-template-columns: 1fr; } }
    .fin-field { display: flex; flex-direction: column; gap: 5px; }
    .fin-field--full { grid-column: 1 / -1; }
    .fin-field label { font-size: 13px; font-weight: 600; color: #22243a; }
    .fin-req { font-size: 11px; color: #d83a3a; font-weight: 400; margin-left: 4px; }
    .fin-input {
      border: 1.5px solid #e8e9f0; border-radius: 8px; padding: 9px 12px;
      font-size: 14px; color: #22243a; background: white;
    }
    .fin-form-actions { margin-top: 14px; display: flex; justify-content: flex-end; }
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
    .fin-tx-desc { display: flex; flex-direction: column; gap: 2px; }
    .fin-muted { font-size: 12px; color: #7c8092; }
  `],
})
export class CuentasDestinoPage implements OnInit {
  private readonly store = inject(Store);

  readonly cuentas = this.store.selectSignal(selectBankAccounts);
  readonly loading = this.store.selectSignal(selectBankAccountsLoading);
  readonly saving = this.store.selectSignal(selectBankAccountsSaving);

  protected label = signal('');
  protected banco = signal('');
  protected titular = signal('');
  protected cbu = signal('');
  protected alias = signal('');
  protected cuit = signal('');

  protected readonly canCreate = computed(() => this.label().trim().length > 0);

  ngOnInit(): void {
    this.store.dispatch(loadBankAccounts());
  }

  protected crear(): void {
    if (!this.canCreate()) return;
    this.store.dispatch(createBankAccount({
      body: {
        label: this.label().trim(),
        banco: this.nullable(this.banco()),
        titular: this.nullable(this.titular()),
        cbu: this.nullable(this.cbu()),
        alias: this.nullable(this.alias()),
        cuit: this.nullable(this.cuit()),
      },
    }));
    this.label.set(''); this.banco.set(''); this.titular.set('');
    this.cbu.set(''); this.alias.set(''); this.cuit.set('');
  }

  protected dar_baja(id: number, label: string): void {
    if (!confirm(`¿Dar de baja la cuenta "${label}"? Dejará de aparecer al cobrar, pero se conserva en movimientos históricos.`)) return;
    this.store.dispatch(deactivateBankAccount({ id }));
  }

  private nullable(v: string): string | null {
    const t = v.trim();
    return t.length ? t : null;
  }
}
