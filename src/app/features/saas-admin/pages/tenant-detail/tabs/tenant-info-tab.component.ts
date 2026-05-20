import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { Tenant } from '../../../models/tenant.model';
import { TenantStatusPipe } from '../../../models/tenant-status.pipe';
import {
  activateTenant, deactivateTenant, renameTenant, softDeleteTenant,
} from '../../../store/saas-admin.actions';

@Component({
  selector: 'tenant-info-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, TagModule, ConfirmDialogModule, TenantStatusPipe],
  template: `
    @if (tenant(); as t) {
      <div class="saas-card">
      <form [formGroup]="form" class="info-form">
        <label class="field">
          <span>Código</span>
          <input pInputText formControlName="code" readonly />
        </label>
        <label class="field">
          <span>Nombre</span>
          <input pInputText formControlName="name" />
        </label>
        <div class="info-form__status">
          <p-tag [value]="t.status | tenantStatus" [severity]="t.status === 'ACTIVE' ? 'success' : 'warn'" />
          @if (t.deletedAt) { <p-tag value="Eliminado" severity="danger" /> }
        </div>

        <div class="info-form__actions">
          <p-button label="Guardar nombre" icon="pi pi-save"
                    [disabled]="!form.dirty || form.invalid" (onClick)="saveName(t)" />
          @if (!t.deletedAt) {
            @if (t.status === 'ACTIVE') {
              <p-button label="Desactivar" severity="warn" [outlined]="true"
                        icon="pi pi-pause" (onClick)="confirmDeactivate(t)" />
            } @else {
              <p-button label="Activar" severity="success" [outlined]="true"
                        icon="pi pi-play" (onClick)="confirmActivate(t)" />
            }
            <p-button label="Eliminar" severity="danger" [outlined]="true"
                      icon="pi pi-trash" (onClick)="confirmSoftDelete(t)" />
          }
        </div>
      </form>
      <p-confirmDialog styleClass="saas-themed" />
      </div>
    }
  `,
  styles: [`
    .saas-card { background: var(--saas-bg-card, #232447); padding: 16px; border-radius: 8px; border: 1px solid var(--saas-border, rgba(255,255,255,.08)); }
    .info-form { display: flex; flex-direction: column; gap: 12px; max-width: 560px; }
    .field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #c7d2fe; }
    .info-form__status { display: flex; gap: 6px; }
    .info-form__actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
  `],
})
export class TenantInfoTabComponent {
  readonly tenant = input.required<Tenant | null>();

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly confirm = inject(ConfirmationService);

  protected readonly form = this.fb.nonNullable.group({
    code: [{ value: '', disabled: true }],
    name: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      const t = this.tenant();
      if (t) this.form.reset({ code: t.code, name: t.name });
    });
  }

  saveName(t: Tenant): void {
    if (this.form.invalid || !this.form.dirty) return;
    this.store.dispatch(renameTenant({ id: t.id, req: { name: this.form.getRawValue().name } }));
    this.form.markAsPristine();
  }

  confirmActivate(t: Tenant): void {
    this.confirm.confirm({
      header: '¿Activar tenant?', message: t.code,
      acceptLabel: 'Activar', rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(activateTenant({ id: t.id })),
    });
  }
  confirmDeactivate(t: Tenant): void {
    this.confirm.confirm({
      header: '¿Desactivar tenant?', message: t.code,
      acceptLabel: 'Desactivar', rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(deactivateTenant({ id: t.id })),
    });
  }
  confirmSoftDelete(t: Tenant): void {
    this.confirm.confirm({
      header: '¿Eliminar tenant?',
      message: 'Esto desactivará el tenant y dejará de ser visible. Los datos no se borran.',
      acceptLabel: 'Eliminar', rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(softDeleteTenant({ id: t.id })),
    });
  }
}
