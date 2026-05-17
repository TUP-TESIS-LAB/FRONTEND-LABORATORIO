import {
  ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { CommonModule } from '@angular/common';

import {
  loadSmtpConfig, saveSmtpConfig, sendTestEmail, clearTestEmailResult,
} from '../../store/empresa.actions';
import {
  selectSmtpConfig, selectSmtpPending, selectSmtpTesting,
  selectSmtpTestResult, selectSmtpTestError,
} from '../../store/empresa.selectors';

@Component({
  selector: 'emp-email-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, CheckboxModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="emp-email">
      <!-- Card 1: Credenciales -->
      <form [formGroup]="form" class="pat-form" (ngSubmit)="save()" style="padding:0">
        <section class="pat-form__card">
          <div class="pat-form__card-header">
            <span><i class="pi pi-envelope" style="margin-right:6px"></i>Credenciales Gmail</span>
          </div>

          <p class="ui-text-sm ui-text-muted" *ngIf="config()?.configured; else notConfiguredLabel">
            ● Configurado <span *ngIf="config()?.updatedAt">(actualizado {{ config()?.updatedAt }})</span>
          </p>
          <ng-template #notConfiguredLabel>
            <p class="ui-text-sm ui-text-muted">○ No configurado todavía</p>
          </ng-template>

          <div class="pat-form__grid pat-form__grid--full">
            <div class="pat-form__field">
              <label class="pat-form__label">Email Gmail*</label>
              <input pInputText formControlName="gmailUsername" class="pat-form__input"
                     placeholder="laboratorio@gmail.com" />
            </div>

            <div class="pat-form__field">
              <label class="pat-form__label">
                App Password{{ config()?.configured ? '' : '*' }}
              </label>
              <div style="display:flex; gap:var(--space-2); align-items:center;">
                <input pInputText formControlName="appPassword" class="pat-form__input"
                       [type]="showPassword() ? 'text' : 'password'"
                       [placeholder]="config()?.configured ? '•••••••• (sin cambios)' : '16 caracteres de Google'" />
                <p-button type="button" icon="pi pi-eye"
                          [text]="true" (click)="showPassword.set(!showPassword())" />
              </div>
              <small class="ui-text-xs ui-text-muted">
                Requiere verificación en 2 pasos en tu cuenta Google. Generá una App Password
                en <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener">
                myaccount.google.com/apppasswords</a>.
              </small>
            </div>

            <div class="pat-form__field">
              <label class="pat-form__label">Nombre del remitente</label>
              <input pInputText formControlName="fromName" class="pat-form__input"
                     placeholder="Laboratorio San Martín" />
              <small class="ui-text-xs ui-text-muted">
                Aparece como remitente en los emails.
              </small>
            </div>

            <div class="pat-form__field">
              <label class="pat-form__label">
                <p-checkbox formControlName="active" [binary]="true" /> Activo
              </label>
            </div>
          </div>

          <div class="pat-form__footer">
            <p-button type="submit" label="Guardar cambios" severity="primary"
                      [disabled]="!canSave() || pending()" [loading]="pending()" />
          </div>
        </section>
      </form>

      <!-- Card 2: Test email -->
      <section class="pat-form__card">
        <div class="pat-form__card-header">
          <span><i class="pi pi-send" style="margin-right:6px"></i>Enviar email de prueba</span>
        </div>

        <div class="pat-form__grid pat-form__grid--full">
          <div class="pat-form__field">
            <label class="pat-form__label">Destinatario</label>
            <input pInputText [formControl]="testForm" class="pat-form__input"
                   placeholder="destinatario@ejemplo.com" />
            <small class="ui-text-xs ui-text-muted">
              Prueba las credenciales actualmente guardadas. Guardá los cambios antes de probar.
            </small>
          </div>
        </div>

        <div class="pat-form__footer">
          <p-button type="button" label="Enviar email de prueba" severity="secondary"
                    [disabled]="!canTest() || testing()" [loading]="testing()"
                    (click)="sendTest()" />
        </div>

        <p *ngIf="testResult()" class="ui-text-sm" style="color:#16a34a;">
          ✓ Enviado a {{ testForm.value }} (sentAt {{ testResult()?.sentAt }})
        </p>
        <p *ngIf="testError()" class="ui-text-sm" style="color:#dc2626;">
          ✗ Error: {{ testError() }}
        </p>
      </section>
    </div>
  `,
  styles: [`
    .emp-email { display: grid; grid-template-columns: 1fr; gap: var(--space-6); }
    @media (min-width: 1024px) { .emp-email { max-width: 720px; } }
  `],
})
export class EmailPage implements OnInit {
  private readonly store = inject(Store);
  private readonly fb = inject(FormBuilder);

  readonly config = this.store.selectSignal(selectSmtpConfig);
  readonly pending = this.store.selectSignal(selectSmtpPending);
  readonly testing = this.store.selectSignal(selectSmtpTesting);
  readonly testResult = this.store.selectSignal(selectSmtpTestResult);
  readonly testError = this.store.selectSignal(selectSmtpTestError);

  readonly showPassword = signal(false);

  form = this.fb.group({
    gmailUsername: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    appPassword: ['', [Validators.minLength(16), Validators.maxLength(64)]],
    fromName: ['', [Validators.maxLength(120)]],
    active: [true],
  });

  testForm = this.fb.control('', { validators: [Validators.required, Validators.email], nonNullable: true });

  readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  readonly canSave = computed(() => this.status() === 'VALID' && this.form.dirty);
  readonly canTest = computed(() => this.testForm.valid && !this.form.dirty && this.config()?.configured === true);

  constructor() {
    effect(() => {
      const cfg = this.config();
      if (cfg && cfg.configured) {
        this.form.reset({
          gmailUsername: cfg.gmailUsername ?? '',
          appPassword: '',
          fromName: cfg.fromName ?? '',
          active: cfg.active,
        });
        this.form.controls.appPassword.clearValidators();
        this.form.controls.appPassword.addValidators([Validators.minLength(16), Validators.maxLength(64)]);
        this.form.controls.appPassword.updateValueAndValidity({ emitEvent: false });
      } else if (cfg && !cfg.configured) {
        this.form.controls.appPassword.setValidators([
          Validators.required, Validators.minLength(16), Validators.maxLength(64),
        ]);
        this.form.controls.appPassword.updateValueAndValidity({ emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.store.dispatch(loadSmtpConfig());
  }

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const payload = {
      gmailUsername: v.gmailUsername!,
      ...(v.appPassword ? { appPassword: v.appPassword } : {}),
      fromName: v.fromName || null,
      active: v.active ?? true,
    };
    this.store.dispatch(saveSmtpConfig({ payload }));
  }

  sendTest(): void {
    this.store.dispatch(clearTestEmailResult());
    this.store.dispatch(sendTestEmail({ payload: { to: this.testForm.value } }));
  }
}
