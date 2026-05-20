// src/app/features/saas-admin/components/tenant-form-dialog/tenant-form-dialog.component.ts
import {
  ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Tenant } from '../../models/tenant.model';
import {
  createTenant, createTenantSuccess, createTenantFailure,
  renameTenant, renameTenantSuccess, renameTenantFailure,
} from '../../store/saas-admin.actions';
import { selectSaasAdminPending } from '../../store/saas-admin.selectors';

@Component({
  selector: 'tenant-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule],
  template: `
    <p-dialog [(visible)]="visible" [modal]="true" [closable]="!pending()" [header]="dialogTitle()"
              [style]="{ width: '420px' }" (onHide)="onHide()">
      <form [formGroup]="form" (ngSubmit)="submit()" class="tfd-form">
        @if (errorMessage(); as msg) {
          <div class="tfd-error" role="alert">{{ msg }}</div>
        }
        <label class="tfd-field">
          <span>Código</span>
          <input pInputText formControlName="code" placeholder="lab-demo" />
          @if (form.get('code')?.touched && form.get('code')?.errors?.['pattern']) {
            <small class="tfd-field-error">Solo minúsculas, números y guiones.</small>
          }
        </label>
        <label class="tfd-field">
          <span>Nombre</span>
          <input pInputText formControlName="name" placeholder="Laboratorio Demo" />
        </label>
        <div class="tfd-actions">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" type="button"
                    [disabled]="pending()" (onClick)="cancel()" />
          <p-button [label]="isRename() ? 'Guardar' : 'Crear tenant'" type="submit"
                    [loading]="pending()" [disabled]="form.invalid || pending()" />
        </div>
      </form>
    </p-dialog>
  `,
  styles: [`
    .tfd-form { display: flex; flex-direction: column; gap: 12px; }
    .tfd-field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #475569; }
    .tfd-field-error { color: #dc2626; font-size: 11px; }
    .tfd-error { background: #fee2e2; color: #991b1b; padding: 8px 12px; border-radius: 6px; font-size: 12px; }
    .tfd-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
  `],
})
export class TenantFormDialogComponent {
  readonly open = input.required<boolean>();
  readonly editing = input<Tenant | null>(null);
  readonly closed = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);

  protected visible = false;
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly pending = this.store.selectSignal(selectSaasAdminPending);
  protected readonly isRename = computed(() => this.editing() !== null);
  protected readonly dialogTitle = computed(() => this.isRename() ? 'Editar tenant' : 'Nuevo tenant');

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    name: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      const isOpen = this.open();
      this.visible = isOpen;
      this.errorMessage.set(null);
      if (isOpen) {
        const t = this.editing();
        if (t) {
          this.form.reset({ code: t.code, name: t.name });
          this.form.get('code')!.disable({ emitEvent: false });
        } else {
          this.form.reset({ code: '', name: '' });
          this.form.get('code')!.enable({ emitEvent: false });
        }
      }
    });

    this.actions$
      .pipe(ofType(createTenantSuccess, renameTenantSuccess), takeUntilDestroyed())
      .subscribe(() => {
        this.visible = false;
        this.closed.emit();
      });

    this.actions$
      .pipe(ofType(createTenantFailure), takeUntilDestroyed())
      .subscribe(({ error }) => {
        this.errorMessage.set(error.status === 409 ? 'Ese código ya existe.' : 'No se pudo crear el tenant.');
      });

    this.actions$
      .pipe(ofType(renameTenantFailure), takeUntilDestroyed())
      .subscribe(() => this.errorMessage.set('No se pudo renombrar el tenant.'));
  }

  protected submit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    if (this.isRename()) {
      this.store.dispatch(renameTenant({ id: this.editing()!.id, req: { name: raw.name } }));
    } else {
      this.store.dispatch(createTenant({ req: { code: raw.code, name: raw.name } }));
    }
  }

  protected cancel(): void {
    this.visible = false;
    this.closed.emit();
  }

  protected onHide(): void {
    if (this.visible) return;
    this.closed.emit();
  }
}
