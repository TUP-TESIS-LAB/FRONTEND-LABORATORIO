import {
  ChangeDetectionStrategy, Component, OnDestroy, OnInit,
  computed, effect, inject, input, signal,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ACTIVABLE_MODULES, CORE_MODULES, ModuleCode } from '../../models/module-code';
import { TenantStatusPipe } from '../../models/tenant-status.pipe';
import {
  clearSelectedTenant,
  createTenant, createTenantSuccess, createTenantFailure,
  loadTenant, loadTenantModules, loadTenantWhiteLabel,
  renameTenant, renameTenantSuccess, renameTenantFailure,
  toggleTenantModule,
  upsertTenantWhiteLabel, upsertTenantWhiteLabelSuccess, upsertTenantWhiteLabelFailure,
} from '../../store/saas-admin.actions';
import {
  selectSaasAdminPending, selectSelectedTenant,
  selectSelectedTenantModules, selectSelectedTenantWhiteLabel,
} from '../../store/saas-admin.selectors';

type Step = 1 | 2 | 3;
type Mode = 'create' | 'edit';
const HEX = /^#[0-9A-Fa-f]{6}$/;

@Component({
  selector: 'saas-tenant-wizard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, FormsModule, RouterLink,
    ButtonModule, InputTextModule, TagModule, ToggleSwitchModule, TenantStatusPipe,
  ],
  template: `
    <header class="wizard-header" [class.wizard-header--edit]="mode() === 'edit'">
      <a routerLink="/saas/tenants" class="wizard-header__back">
        <p-button [text]="true" label="Volver" />
      </a>
      <div class="wizard-header__title">
        <span class="wizard-header__chip">{{ mode() === 'edit' ? 'Editar tenant' : 'Nuevo tenant' }}</span>
        @if (mode() === 'edit' && tenant(); as t) {
          <h1>{{ t.name }}</h1>
          <code>{{ t.code }}</code>
          <p-tag [value]="t.status | tenantStatus" [severity]="t.status === 'ACTIVE' ? 'success' : 'warn'" />
        } @else {
          <h1>Configurar laboratorio</h1>
        }
      </div>
    </header>

    <div class="wizard-steps">
      <button class="wizard-step" type="button"
              [class.wizard-step--active]="step() === 1"
              [class.wizard-step--done]="step() > 1 || canSkipToStep(2)"
              [disabled]="!isStepNavigable(1)"
              (click)="goToStep(1)">
        <span class="wizard-step__num">1</span> Información
      </button>
      <button class="wizard-step" type="button"
              [class.wizard-step--active]="step() === 2"
              [class.wizard-step--done]="step() > 2 || (mode() === 'edit' && canSkipToStep(3))"
              [disabled]="!isStepNavigable(2)"
              (click)="goToStep(2)">
        <span class="wizard-step__num">2</span> Módulos
      </button>
      <button class="wizard-step" type="button"
              [class.wizard-step--active]="step() === 3"
              [disabled]="!isStepNavigable(3)"
              (click)="goToStep(3)">
        <span class="wizard-step__num">3</span> White label
      </button>
    </div>

    <main class="wizard-body">
      @if (showTokenModal()) {
        <div class="token-modal-backdrop">
          <div class="token-modal">
            <div class="token-modal__header">
              <i class="pi pi-check-circle token-modal__icon"></i>
              <h2>Laboratorio creado correctamente</h2>
            </div>
            <div class="token-modal__section token-modal__section--primary">
              <span class="token-modal__label">Link de primer acceso del administrador</span>
              <code class="token-modal__value">{{ firstLoginLink() }}</code>
              <div data-testid="copy-link-btn">
                <p-button label="Copiar link" [outlined]="true" severity="info"
                          (onClick)="copyToClipboard(firstLoginLink())" />
              </div>
            </div>
            <div class="token-modal__section">
              <span class="token-modal__label">Token (alternativa)</span>
              <code class="token-modal__value token-modal__value--muted">{{ firstLoginToken() }}</code>
              <p-button label="Copiar token" severity="secondary" [outlined]="true" size="small"
                        (onClick)="copyToClipboard(firstLoginToken()!)" />
            </div>
            <p class="wizard-muted">Compartí el link con el administrador del laboratorio.</p>
            <div data-testid="continue-btn">
              <p-button label="Continuar a módulos"
                        (onClick)="closeTokenModal()" />
            </div>
          </div>
        </div>
      }

      @if (errorMessage(); as msg) {
        <div class="wizard-error" role="alert">{{ msg }}</div>
      }

      @if (step() === 1) {
        <form [formGroup]="infoForm" (ngSubmit)="submitStep1()" class="wizard-form">
          <label class="wizard-field">
            <span>Código</span>
            <input pInputText formControlName="code" placeholder="lab-demo" [readOnly]="mode() === 'edit'" />
            @if (infoForm.get('code')?.touched && infoForm.get('code')?.errors?.['pattern']) {
              <small class="wizard-field-error">Solo minúsculas, números y guiones.</small>
            }
            @if (mode() === 'edit') {
              <small class="wizard-muted">El código no se puede cambiar una vez creado.</small>
            }
          </label>
          <label class="wizard-field">
            <span>Nombre</span>
            <input pInputText formControlName="name" placeholder="Laboratorio Demo" />
          </label>

          @if (mode() === 'create') {
            <div class="wizard-owner-section" [formGroup]="ownerForm">
              <div class="wizard-owner-divider"><span>Administrador inicial</span></div>
              <div class="wizard-row">
                <label class="wizard-field">
                  <span>Nombre</span>
                  <input pInputText formControlName="ownerFirstName" placeholder="Juan" />
                  @if (ownerForm.get('ownerFirstName')?.touched && ownerForm.get('ownerFirstName')?.errors?.['required']) {
                    <small class="wizard-field-error">Requerido.</small>
                  }
                </label>
                <label class="wizard-field">
                  <span>Apellido</span>
                  <input pInputText formControlName="ownerLastName" placeholder="García" />
                  @if (ownerForm.get('ownerLastName')?.touched && ownerForm.get('ownerLastName')?.errors?.['required']) {
                    <small class="wizard-field-error">Requerido.</small>
                  }
                </label>
              </div>
              <label class="wizard-field">
                <span>Email</span>
                <input pInputText formControlName="ownerEmail" type="email" placeholder="admin@laboratorio.com" />
                @if (ownerForm.get('ownerEmail')?.touched) {
                  @if (ownerForm.get('ownerEmail')?.errors?.['required']) {
                    <small class="wizard-field-error">Requerido.</small>
                  } @else if (ownerForm.get('ownerEmail')?.errors?.['email']) {
                    <small class="wizard-field-error">Ingresá un email válido.</small>
                  }
                }
              </label>
              <div class="wizard-row">
                <label class="wizard-field">
                  <span>DNI</span>
                  <input pInputText formControlName="ownerDocument" placeholder="28345678" />
                  @if (ownerForm.get('ownerDocument')?.touched && ownerForm.get('ownerDocument')?.errors?.['required']) {
                    <small class="wizard-field-error">Requerido.</small>
                  }
                </label>
                <label class="wizard-field">
                  <span>Usuario</span>
                  <input pInputText formControlName="ownerUsername" placeholder="jgarcia" />
                  @if (ownerForm.get('ownerUsername')?.touched && ownerForm.get('ownerUsername')?.errors?.['required']) {
                    <small class="wizard-field-error">Requerido.</small>
                  }
                </label>
              </div>
            </div>
          }

          <div class="wizard-actions">
            <a routerLink="/saas/tenants">
              <p-button label="Cancelar" severity="secondary" [outlined]="true" type="button" [disabled]="pending()" />
            </a>
            <p-button [label]="mode() === 'edit' ? 'Guardar y siguiente' : 'Crear y continuar'"
                      type="submit"
                      [loading]="pending()"
                      [disabled]="infoForm.invalid || (mode() === 'create' && ownerForm.invalid) || pending()" />
          </div>
        </form>
      }

      @if (step() === 2) {
        <section class="wizard-modules">
          <p class="wizard-muted">Activá los módulos que quieras habilitar para este tenant. Los cambios se guardan al instante.</p>
          @for (m of activables; track m.code) {
            <div class="wizard-module-row">
              <i [class]="m.icon"></i>
              <div class="wizard-module-row__text">
                <strong>{{ m.label }}</strong>
                <span class="wizard-muted">{{ m.description }}</span>
              </div>
              <p-toggleSwitch [ngModel]="isEnabled(m.code)" (ngModelChange)="onToggle(m.code, $event)" [disabled]="pending() || !workingTenantId()" />
            </div>
          }

          <h3 class="wizard-section-title">Core (siempre activos)</h3>
          @for (m of cores; track m.code) {
            <div class="wizard-module-row wizard-module-row--core">
              <i [class]="m.icon"></i>
              <div class="wizard-module-row__text">
                <strong>{{ m.label }}</strong>
                <span class="wizard-muted">{{ m.description }}</span>
              </div>
              <p-tag value="Siempre activo" severity="info" />
            </div>
          }
        </section>

        <div class="wizard-actions">
          <p-button label="Atrás" severity="secondary" [outlined]="true" type="button"
                    [disabled]="pending()" (onClick)="step.set(1)" />
          <p-button label="Siguiente" type="button"
                    [disabled]="pending()" (onClick)="step.set(3)" />
        </div>
      }

      @if (step() === 3) {
        <form [formGroup]="wlForm" (ngSubmit)="submitStep3()" class="wizard-form">
          <label class="wizard-field">
            <span>Nombre visible</span>
            <input pInputText formControlName="systemName" />
          </label>
          <div class="wizard-row">
            <label class="wizard-field">
              <span>Color primario</span>
              <div class="wizard-color">
                <input type="color" [value]="wlForm.get('primaryColor')!.value"
                       (input)="wlForm.get('primaryColor')!.setValue($any($event.target).value)" />
                <input pInputText formControlName="primaryColor" maxlength="7" />
              </div>
            </label>
            <label class="wizard-field">
              <span>Color secundario</span>
              <div class="wizard-color">
                <input type="color" [value]="wlForm.get('secondaryColor')!.value"
                       (input)="wlForm.get('secondaryColor')!.setValue($any($event.target).value)" />
                <input pInputText formControlName="secondaryColor" maxlength="7" />
              </div>
            </label>
          </div>
          <label class="wizard-field">
            <span>Logo light (URL, opcional)</span>
            <input pInputText formControlName="lightLogoUrl" placeholder="https://…" />
          </label>
          <label class="wizard-field">
            <span>Logo dark (URL, opcional)</span>
            <input pInputText formControlName="darkLogoUrl" placeholder="https://…" />
          </label>

          <div class="wizard-actions">
            <p-button label="Atrás" severity="secondary" [outlined]="true" type="button"
                      [disabled]="pending()" (onClick)="step.set(2)" />
            <a routerLink="/saas/tenants">
              <p-button label="Saltar y finalizar" severity="secondary" [outlined]="true" type="button"
                        [disabled]="pending()" />
            </a>
            <p-button [label]="mode() === 'edit' ? 'Finalizar cambios' : 'Finalizar'"
                      type="submit"
                      [loading]="pending()" [disabled]="wlForm.invalid || pending()" />
          </div>
        </form>
      }
    </main>
  `,
  styles: [`
    :host { display: block; color: var(--saas-text, #e2e8f0); }

    .wizard-header {
      display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
      padding: 16px 18px; border-radius: 10px; margin-bottom: 16px;
      background: var(--saas-bg-card, #232447);
      border-left: 4px solid var(--saas-accent, #fbbf24);
    }
    .wizard-header--edit { border-left-color: #60a5fa; }
    .wizard-header__title { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .wizard-header__chip {
      font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600;
      background: rgba(251,191,36,.15); color: var(--saas-text-on-card, #fde68a);
      letter-spacing: .04em; text-transform: uppercase;
    }
    .wizard-header--edit .wizard-header__chip { background: rgba(96,165,250,.15); color: #93c5fd; }
    .wizard-header h1 { margin: 0; color: var(--saas-text-on-card, #fde68a); font-size: 18px; }
    .wizard-header--edit h1 { color: #dbeafe; }
    .wizard-header code { color: var(--saas-text-muted, #94a3b8); font-size: 12px; }
    .wizard-header__back { text-decoration: none; }

    .wizard-steps {
      display: flex; gap: 16px; align-items: center;
      padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;
      background: var(--saas-bg-card, #232447);
    }
    .wizard-step {
      display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--saas-text-muted, #94a3b8);
      background: transparent; border: none; cursor: pointer; font: inherit; padding: 0;
    }
    .wizard-step:disabled { cursor: default; opacity: 0.7; }
    .wizard-step:not(:disabled):hover { color: var(--saas-text-on-card, #fde68a); }
    .wizard-step__num {
      width: 26px; height: 26px; border-radius: 50%;
      background: rgba(255,255,255,.06); display: inline-flex; align-items: center; justify-content: center;
      font-weight: 600; font-size: 12px;
    }
    .wizard-step--active { color: var(--saas-text-on-card, #fde68a); }
    .wizard-step--active .wizard-step__num { background: var(--saas-accent, #fbbf24); color: #1a1b3a; }
    .wizard-step--done { color: var(--saas-text, #e2e8f0); }
    .wizard-step--done .wizard-step__num { background: rgba(251,191,36,.3); color: var(--saas-text-on-card, #fde68a); }

    .wizard-body {
      background: var(--saas-bg-card, #232447);
      border-radius: 10px;
      padding: 24px;
    }

    .wizard-error { background: rgba(239,68,68,.12); color: #fca5a5; padding: 8px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 16px; }
    .wizard-muted { color: var(--saas-text-muted, #94a3b8); font-size: 12px; }
    .wizard-form { display: flex; flex-direction: column; gap: 12px; max-width: 680px; }
    .wizard-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .wizard-field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--saas-text-muted, #94a3b8); }
    .wizard-field-error { color: #fca5a5; font-size: 11px; }
    .wizard-color { display: flex; gap: 8px; align-items: center; }
    .wizard-color input[type="color"] { width: 40px; height: 32px; padding: 0; border: 1px solid var(--saas-border, rgba(255,255,255,.08)); border-radius: 4px; background: transparent; cursor: pointer; }

    .wizard-section-title { color: var(--saas-text-on-card, #fde68a); font-size: 13px; margin: 16px 0 8px; text-transform: uppercase; letter-spacing: .04em; }
    .wizard-modules { display: flex; flex-direction: column; gap: 8px; }
    .wizard-module-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; background: rgba(255,255,255,.04); }
    .wizard-module-row--core { opacity: 0.85; }
    .wizard-module-row i { color: var(--saas-accent, #fbbf24); width: 20px; text-align: center; }
    .wizard-module-row__text { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .wizard-module-row__text strong { color: var(--saas-text, #e2e8f0); font-size: 14px; }

    .wizard-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
    .wizard-actions a { text-decoration: none; }

    .wizard-owner-section { margin-top: 16px; }
    .wizard-owner-divider {
      display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
    }
    .wizard-owner-divider::before, .wizard-owner-divider::after {
      content: ''; flex: 1; height: 1px; background: rgba(255,255,255,.08);
    }
    .wizard-owner-divider span {
      color: var(--saas-text-on-card, #fde68a); font-size: 11px;
      text-transform: uppercase; letter-spacing: .06em; font-weight: 600; white-space: nowrap;
    }

    .token-modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.6);
      display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px;
    }
    .token-modal {
      background: var(--saas-bg-card, #232447); border-radius: 12px;
      padding: 24px; max-width: 520px; width: 100%;
      border: 1px solid var(--saas-border, rgba(255,255,255,.08));
      display: flex; flex-direction: column; gap: 16px;
    }
    .token-modal__header { display: flex; align-items: center; gap: 10px; }
    .token-modal__header h2 { margin: 0; font-size: 18px; color: var(--saas-text-on-card, #fde68a); }
    .token-modal__icon { font-size: 22px; color: #4ade80; }
    .token-modal__section {
      background: rgba(255,255,255,.06); border-radius: 8px; padding: 12px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .token-modal__section--primary { border: 1px solid rgba(147,197,253,.2); }
    .token-modal__label {
      font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
      color: var(--saas-text-muted, #94a3b8);
    }
    .token-modal__value {
      font-family: monospace; font-size: 12px; word-break: break-all;
      color: #93c5fd; background: rgba(0,0,0,.2); padding: 6px 8px; border-radius: 4px; display: block;
    }
    .token-modal__value--muted { color: var(--saas-text, #e2e8f0); }
  `],
})
export class TenantWizardPage implements OnInit, OnDestroy {
  /** Comes from `:id/editar` via withComponentInputBinding(). Undefined in create mode. */
  readonly id = input<string | undefined>(undefined);

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly actions$ = inject(Actions);

  protected readonly step = signal<Step>(1);
  protected readonly mode = computed<Mode>(() => (this.id() ? 'edit' : 'create'));
  protected readonly createdTenantId = signal<number | null>(null);
  protected readonly enabledModules = signal<Set<ModuleCode>>(new Set());
  protected readonly errorMessage = signal<string | null>(null);
  private readonly pendingNav = signal<Step | null>(null);
  protected readonly firstLoginToken = signal<string | null>(null);
  protected readonly showTokenModal = signal(false);
  protected readonly firstLoginLink = computed(() => {
    const token = this.firstLoginToken();
    if (!token) return '';
    return `${window.location.origin}/first-login?token=${encodeURIComponent(token)}`;
  });

  protected readonly pending = this.store.selectSignal(selectSaasAdminPending);
  protected readonly tenant = this.store.selectSignal(selectSelectedTenant);
  private readonly modulesFromStore = this.store.selectSignal(selectSelectedTenantModules);
  private readonly whiteLabelFromStore = this.store.selectSignal(selectSelectedTenantWhiteLabel);

  protected readonly activables = ACTIVABLE_MODULES;
  protected readonly cores = CORE_MODULES;

  /** Working tenant id: in create mode, the newly created tenant id; in edit mode, the route param. */
  protected readonly workingTenantId = computed<number | null>(() => {
    if (this.mode() === 'edit') {
      const raw = this.id();
      const n = raw ? Number(raw) : NaN;
      return Number.isNaN(n) ? null : n;
    }
    return this.createdTenantId();
  });

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

  protected readonly ownerForm = this.fb.nonNullable.group({
    ownerFirstName: ['', Validators.required],
    ownerLastName:  ['', Validators.required],
    ownerEmail:     ['', [Validators.required, Validators.email]],
    ownerDocument:  ['', Validators.required],
    ownerUsername:  ['', Validators.required],
  });

  constructor() {
    // Hydrate forms from store when editing
    effect(() => {
      const t = this.tenant();
      if (this.mode() === 'edit' && t) {
        this.infoForm.reset({ code: t.code, name: t.name });
        // Don't reset wlForm.systemName here; the white-label effect handles it
      }
    });

    effect(() => {
      const mods = this.modulesFromStore();
      if (mods) this.enabledModules.set(new Set(mods));
    });

    effect(() => {
      const wl = this.whiteLabelFromStore();
      if (wl) {
        this.wlForm.reset({
          systemName: wl.systemName,
          primaryColor: wl.primaryColor,
          secondaryColor: wl.secondaryColor,
          lightLogoUrl: wl.lightLogoUrl,
          darkLogoUrl: wl.darkLogoUrl,
        });
      }
    });

    // Create-mode: on success, capture id and show token modal
    this.actions$
      .pipe(ofType(createTenantSuccess), takeUntilDestroyed())
      .subscribe(({ tenant }) => {
        this.createdTenantId.set(tenant.id);
        this.firstLoginToken.set(tenant.ownerFirstLoginToken);
        this.wlForm.patchValue({ systemName: tenant.name });
        this.errorMessage.set(null);
        this.showTokenModal.set(true);
      });

    this.actions$
      .pipe(ofType(createTenantFailure), takeUntilDestroyed())
      .subscribe(({ error }) => {
        this.errorMessage.set(error.status === 409 ? 'Ese código ya existe.' : 'No se pudo crear el tenant.');
      });

    // Edit-mode: rename success → honor pendingNav or advance to step 2
    this.actions$
      .pipe(ofType(renameTenantSuccess), takeUntilDestroyed())
      .subscribe(() => {
        this.errorMessage.set(null);
        this.infoForm.markAsPristine();
        const target = this.pendingNav();
        this.pendingNav.set(null);
        this.step.set(target ?? 2);
      });

    this.actions$
      .pipe(ofType(renameTenantFailure), takeUntilDestroyed())
      .subscribe(() => this.errorMessage.set('No se pudo renombrar el tenant.'));

    // White-label save → honor pendingNav or navigate back to list
    this.actions$
      .pipe(ofType(upsertTenantWhiteLabelSuccess), takeUntilDestroyed())
      .subscribe(() => {
        this.wlForm.markAsPristine();
        const target = this.pendingNav();
        this.pendingNav.set(null);
        if (target != null) {
          this.step.set(target);
        } else {
          this.router.navigate(['/saas/tenants']);
        }
      });

    this.actions$
      .pipe(ofType(upsertTenantWhiteLabelFailure), takeUntilDestroyed())
      .subscribe(() => this.errorMessage.set('No se pudo guardar el white-label.'));
  }

  ngOnInit(): void {
    if (this.mode() === 'edit') {
      const raw = this.id();
      const n = raw ? Number(raw) : NaN;
      if (Number.isNaN(n)) {
        this.router.navigate(['/saas/tenants']);
        return;
      }
      this.store.dispatch(loadTenant({ id: n }));
      this.store.dispatch(loadTenantModules({ tenantId: n }));
      this.store.dispatch(loadTenantWhiteLabel({ tenantId: n }));
    }
  }

  ngOnDestroy(): void {
    this.store.dispatch(clearSelectedTenant());
  }

  canSkipToStep(s: Step): boolean {
    // Allow visual "done" check on step indicators in edit mode (info already filled, modules already loaded).
    if (this.mode() === 'edit') {
      if (s === 2) return !!this.tenant();
      if (s === 3) return !!this.tenant() && this.modulesFromStore() != null;
    }
    return false;
  }

  goToStep(target: Step): void {
    if (target === this.step()) return;

    // Create mode: only allow backwards navigation
    if (this.mode() === 'create') {
      if (target < this.step()) this.step.set(target);
      return;
    }

    // Edit mode: save current step if dirty, then navigate
    if (this.step() === 1 && this.infoForm.dirty && this.infoForm.valid) {
      const id = this.workingTenantId();
      if (id != null) {
        const raw = this.infoForm.getRawValue();
        if (raw.name !== this.tenant()?.name) {
          this.pendingNav.set(target);
          this.store.dispatch(renameTenant({ id, req: { name: raw.name } }));
          return;
        }
      }
    }

    if (this.step() === 3 && this.wlForm.dirty && this.wlForm.valid) {
      const id = this.workingTenantId();
      if (id != null) {
        const v = this.wlForm.getRawValue();
        this.pendingNav.set(target);
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
        return;
      }
    }

    // No save needed
    this.step.set(target);
  }

  isStepNavigable(target: Step): boolean {
    if (target === this.step()) return false; // already there
    if (this.mode() === 'edit') return this.workingTenantId() != null;
    // create mode: only previous steps
    return target < this.step();
  }

  isEnabled(code: ModuleCode): boolean {
    return this.enabledModules().has(code);
  }

  onToggle(code: ModuleCode, enable: boolean): void {
    const id = this.workingTenantId();
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
    if (this.mode() === 'create') {
      if (this.ownerForm.invalid) return;
      const ownerRaw = this.ownerForm.getRawValue();
      this.store.dispatch(createTenant({ req: { ...raw, ...ownerRaw } }));
    } else {
      const id = this.workingTenantId();
      if (id == null) return;
      const currentName = this.tenant()?.name;
      if (raw.name !== currentName) {
        this.store.dispatch(renameTenant({ id, req: { name: raw.name } }));
      } else {
        // No change → just advance
        this.step.set(2);
      }
    }
  }

  protected copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
  }

  protected closeTokenModal(): void {
    this.showTokenModal.set(false);
    this.step.set(2);
  }

  protected submitStep3(): void {
    const id = this.workingTenantId();
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
}
