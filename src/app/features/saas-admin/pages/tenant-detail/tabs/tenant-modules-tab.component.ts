import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { ACTIVABLE_MODULES, CORE_MODULES, ModuleCode } from '../../../models/module-code';
import { toggleTenantModule } from '../../../store/saas-admin.actions';
import { selectSaasAdminPending, selectSelectedTenantModules } from '../../../store/saas-admin.selectors';

@Component({
  selector: 'tenant-modules-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ToggleSwitch, TagModule],
  template: `
    <section class="modules">
      <h3>Activables</h3>
      <p class="muted">Estos módulos podés prenderlos o apagarlos por tenant.</p>
      @for (m of activables; track m.code) {
        <div class="module-row">
          <i [class]="m.icon"></i>
          <div class="module-row__text">
            <strong>{{ m.label }}</strong>
            <span class="muted">{{ m.description }}</span>
          </div>
          <p-toggleswitch [ngModel]="isEnabled(m.code)"
                          [disabled]="pending()"
                          (ngModelChange)="onToggle(m.code, $event)" />
        </div>
      }
    </section>

    <section class="modules">
      <h3>Core</h3>
      <p class="muted">Siempre activos. No se pueden desactivar.</p>
      @for (m of cores; track m.code) {
        <div class="module-row module-row--core">
          <i [class]="m.icon"></i>
          <div class="module-row__text">
            <strong>{{ m.label }}</strong>
            <span class="muted">{{ m.description }}</span>
          </div>
          <p-tag value="Siempre activo" severity="info" />
        </div>
      }
    </section>
  `,
  styles: [`
    .modules { margin-bottom: 24px; }
    .modules h3 { color: var(--saas-text, #1a1a2e); font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: .05em; font-weight: 700; }
    .muted { color: var(--saas-text-muted, #6b7280); font-size: 12px; }
    .module-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; background: var(--saas-surface, #fff); border: 1px solid var(--saas-border, #e6e8ef); margin-top: 8px; }
    .module-row--core { background: var(--saas-surface-alt, #f9fafb); }
    .module-row i { font-size: 18px; color: var(--saas-accent, #6366f1); width: 20px; text-align: center; }
    .module-row__text { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .module-row__text strong { color: var(--saas-text, #1a1a2e); font-size: 14px; }
  `],
})
export class TenantModulesTabComponent {
  readonly tenantId = input.required<number>();

  private readonly store = inject(Store);
  protected readonly cores = CORE_MODULES;
  protected readonly activables = ACTIVABLE_MODULES;

  private readonly enabled = this.store.selectSignal(selectSelectedTenantModules);
  protected readonly pending = this.store.selectSignal(selectSaasAdminPending);

  isEnabled(code: ModuleCode): boolean {
    return this.enabled()?.includes(code) ?? false;
  }

  onToggle(code: ModuleCode, enable: boolean): void {
    this.store.dispatch(toggleTenantModule({ tenantId: this.tenantId(), code, enable }));
  }
}
