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
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { FormsModule } from '@angular/forms';
import {
  ACTIVABLE_MODULES, CORE_MODULES, ModuleCode,
} from '../../models/module-code';
import {
  createTenant, createTenantSuccess, createTenantFailure,
  toggleTenantModule,
  upsertTenantWhiteLabel, upsertTenantWhiteLabelSuccess, upsertTenantWhiteLabelFailure,
} from '../../store/saas-admin.actions';
import { selectSaasAdminPending } from '../../store/saas-admin.selectors';

type Step = 1 | 2 | 3;
const HEX = /^#[0-9A-Fa-f]{6}$/;

@Component({
  selector: 'tenant-create-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FormsModule, DialogModule, ButtonModule, InputTextModule, TagModule, ToggleSwitchModule],
  template: `
    <p-dialog [(visible)]="visible"
              [modal]="true"
              [closable]="!pending()"
              [style]="{ width: '640px' }"
              styleClass="saas-themed"
              header="Nuevo tenant"
              (onHide)="onHide()">

      <div class="tcw-steps">
        <div class="tcw-step" [class.tcw-step--active]="step() === 1" [class.tcw-step--done]="step() > 1">
          <span class="tcw-step__num">1</span> Información
        </div>
        <div class="tcw-step" [class.tcw-step--active]="step() === 2" [class.tcw-step--done]="step() > 2">
          <span class="tcw-step__num">2</span> Módulos
        </div>
        <div class="tcw-step" [class.tcw-step--active]="step() === 3">
          <span class="tcw-step__num">3</span> White label
        </div>
      </div>

      @if (errorMessage(); as msg) {
        <div class="tcw-error" role="alert">{{ msg }}</div>
      }

      @if (step() === 1) {
        <form [formGroup]="infoForm" (ngSubmit)="submitStep1()" class="tcw-form">
          <label class="tcw-field">
            <span>Código</span>
            <input pInputText formControlName="code" placeholder="lab-demo" />
            @if (infoForm.get('code')?.touched && infoForm.get('code')?.errors?.['pattern']) {
              <small class="tcw-field-error">Solo minúsculas, números y guiones.</small>
            }
          </label>
          <label class="tcw-field">
            <span>Nombre</span>
            <input pInputText formControlName="name" placeholder="Laboratorio Demo" />
          </label>
          <div class="tcw-actions">
            <p-button label="Cancelar" severity="secondary" [outlined]="true" type="button" [disabled]="pending()" (onClick)="cancel()" />
            <p-button label="Siguiente" icon="pi pi-arrow-right" iconPos="right" type="submit"
                      [loading]="pending()" [disabled]="infoForm.invalid || pending()" />
          </div>
        </form>
      }

      @if (step() === 2) {
        <section class="tcw-modules">
          <p class="tcw-muted">Prendé los módulos activables que querés habilitar para este tenant. Podés cambiarlos después.</p>
          @for (m of activables; track m.code) {
            <div class="tcw-module-row">
              <i [class]="m.icon"></i>
              <div class="tcw-module-row__text">
                <strong>{{ m.label }}</strong>
                <span class="tcw-muted">{{ m.description }}</span>
              </div>
              <p-toggleSwitch [ngModel]="isEnabled(m.code)" (ngModelChange)="onToggle(m.code, $event)" [disabled]="pending()" />
            </div>
          }
        </section>
        <div class="tcw-actions">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" type="button" [disabled]="pending()" (onClick)="cancel()" />
          <p-button label="Siguiente" icon="pi pi-arrow-right" iconPos="right" type="button"
                    [disabled]="pending()" (onClick)="step.set(3)" />
        </div>
      }

      @if (step() === 3) {
        <form [formGroup]="wlForm" (ngSubmit)="submitStep3()" class="tcw-form">
          <label class="tcw-field">
            <span>Nombre visible</span>
            <input pInputText formControlName="systemName" />
          </label>
          <div class="tcw-row">
            <label class="tcw-field">
              <span>Color primario</span>
              <div class="tcw-color">
                <input type="color" [value]="wlForm.get('primaryColor')!.value" (input)="wlForm.get('primaryColor')!.setValue($any($event.target).value)" />
                <input pInputText formControlName="primaryColor" maxlength="7" />
              </div>
            </label>
            <label class="tcw-field">
              <span>Color secundario</span>
              <div class="tcw-color">
                <input type="color" [value]="wlForm.get('secondaryColor')!.value" (input)="wlForm.get('secondaryColor')!.setValue($any($event.target).value)" />
                <input pInputText formControlName="secondaryColor" maxlength="7" />
              </div>
            </label>
          </div>
          <label class="tcw-field">
            <span>Logo light (URL, opcional)</span>
            <input pInputText formControlName="lightLogoUrl" placeholder="https://…" />
          </label>
          <label class="tcw-field">
            <span>Logo dark (URL, opcional)</span>
            <input pInputText formControlName="darkLogoUrl" placeholder="https://…" />
          </label>

          <div class="tcw-actions">
            <p-button label="Saltar y finalizar" severity="secondary" [outlined]="true" type="button"
                      [disabled]="pending()" (onClick)="cancel()" />
            <p-button label="Finalizar" icon="pi pi-check" iconPos="right" type="submit"
                      [loading]="pending()" [disabled]="wlForm.invalid || pending()" />
          </div>
        </form>
      }

      <p class="tcw-footnote">
        Si cancelás ahora, el tenant queda creado con la configuración aplicada hasta este paso.
        Podés terminar de configurarlo desde la lista.
      </p>
    </p-dialog>
  `,
  styles: [`
    .tcw-steps { display: flex; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--saas-border, rgba(255,255,255,.08)); }
    .tcw-step { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--saas-text-muted, #94a3b8); }
    .tcw-step__num { width: 22px; height: 22px; border-radius: 50%; background: rgba(255,255,255,.06); display: inline-flex; align-items: center; justify-content: center; font-weight: 600; }
    .tcw-step--active { color: var(--saas-text-on-card, #fde68a); }
    .tcw-step--active .tcw-step__num { background: var(--saas-accent, #fbbf24); color: #1a1b3a; }
    .tcw-step--done { color: var(--saas-text, #e2e8f0); }
    .tcw-step--done .tcw-step__num { background: rgba(251,191,36,.3); color: var(--saas-text-on-card, #fde68a); }

    .tcw-form { display: flex; flex-direction: column; gap: 12px; }
    .tcw-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .tcw-field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--saas-text-muted, #94a3b8); }
    .tcw-field-error { color: #fca5a5; font-size: 11px; }
    .tcw-color { display: flex; gap: 8px; align-items: center; }
    .tcw-color input[type="color"] { width: 40px; height: 32px; padding: 0; border: 1px solid var(--saas-border, rgba(255,255,255,.08)); border-radius: 4px; background: transparent; cursor: pointer; }

    .tcw-error { background: rgba(239,68,68,.12); color: #fca5a5; padding: 8px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 12px; }
    .tcw-muted { color: var(--saas-text-muted, #94a3b8); font-size: 12px; }

    .tcw-modules { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .tcw-module-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; background: rgba(255,255,255,.04); }
    .tcw-module-row i { color: var(--saas-accent, #fbbf24); width: 20px; text-align: center; }
    .tcw-module-row__text { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .tcw-module-row__text strong { color: var(--saas-text, #e2e8f0); font-size: 14px; }

    .tcw-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
    .tcw-footnote { color: var(--saas-text-muted, #94a3b8); font-size: 11px; margin-top: 16px; font-style: italic; text-align: center; }
  `],
})
export class TenantCreateWizardComponent {
  readonly open = input.required<boolean>();
  readonly closed = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);

  protected visible = false;
  protected readonly step = signal<Step>(1);
  protected readonly createdTenantId = signal<number | null>(null);
  protected readonly enabledModules = signal<Set<ModuleCode>>(new Set());
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly pending = this.store.selectSignal(selectSaasAdminPending);

  protected readonly activables = ACTIVABLE_MODULES;

  protected readonly infoForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    name: ['', Validators.required],
  });

  protected readonly wlForm = this.fb.nonNullable.group({
    systemName: ['', Validators.required],
    primaryColor: ['#1976D2', [Validators.required, Validators.pattern(HEX)]],
    secondaryColor: ['#424242', [Validators.required, Validators.pattern(HEX)]],
    lightLogoUrl: [null as string | null],
    darkLogoUrl: [null as string | null],
  });

  constructor() {
    effect(() => {
      const isOpen = this.open();
      this.visible = isOpen;
      if (isOpen) this.reset();
    });

    this.actions$
      .pipe(ofType(createTenantSuccess), takeUntilDestroyed())
      .subscribe(({ tenant }) => {
        this.createdTenantId.set(tenant.id);
        this.wlForm.patchValue({ systemName: tenant.name });
        this.errorMessage.set(null);
        this.step.set(2);
      });

    this.actions$
      .pipe(ofType(createTenantFailure), takeUntilDestroyed())
      .subscribe(({ error }) => {
        this.errorMessage.set(error.status === 409 ? 'Ese código ya existe.' : 'No se pudo crear el tenant.');
      });

    this.actions$
      .pipe(ofType(upsertTenantWhiteLabelSuccess), takeUntilDestroyed())
      .subscribe(() => this.finish());

    this.actions$
      .pipe(ofType(upsertTenantWhiteLabelFailure), takeUntilDestroyed())
      .subscribe(() => this.errorMessage.set('No se pudo guardar el white-label.'));
  }

  isEnabled(code: ModuleCode): boolean {
    return this.enabledModules().has(code);
  }

  onToggle(code: ModuleCode, enable: boolean): void {
    const id = this.createdTenantId();
    if (id == null) return;
    this.store.dispatch(toggleTenantModule({ tenantId: id, code, enable }));
    const next = new Set(this.enabledModules());
    if (enable) next.add(code); else next.delete(code);
    this.enabledModules.set(next);
  }

  protected submitStep1(): void {
    if (this.infoForm.invalid) return;
    this.errorMessage.set(null);
    const raw = this.infoForm.getRawValue();
    this.store.dispatch(createTenant({ req: { code: raw.code, name: raw.name } }));
  }

  protected submitStep3(): void {
    const id = this.createdTenantId();
    if (id == null || this.wlForm.invalid) return;
    const v = this.wlForm.getRawValue();
    this.store.dispatch(upsertTenantWhiteLabel({
      tenantId: id,
      req: {
        systemName: v.systemName,
        primaryColor: v.primaryColor,
        secondaryColor: v.secondaryColor,
        lightLogoUrl: v.lightLogoUrl || null,
        darkLogoUrl: v.darkLogoUrl || null,
      },
    }));
  }

  protected cancel(): void {
    this.visible = false;
    this.closed.emit();
  }

  protected onHide(): void {
    if (this.visible) return;
    this.closed.emit();
  }

  private finish(): void {
    this.visible = false;
    this.closed.emit();
  }

  private reset(): void {
    this.step.set(1);
    this.createdTenantId.set(null);
    this.enabledModules.set(new Set());
    this.errorMessage.set(null);
    this.infoForm.reset({ code: '', name: '' });
    this.wlForm.reset({
      systemName: '',
      primaryColor: '#1976D2',
      secondaryColor: '#424242',
      lightLogoUrl: null,
      darkLogoUrl: null,
    });
  }
}
