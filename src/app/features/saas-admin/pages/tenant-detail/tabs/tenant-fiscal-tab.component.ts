import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import {
  ArcaEnvironment,
  buildFiscalConfigRequest,
  CondicionIva,
  dateFromIso,
  FiscalProvider,
} from '../../../models/tenant-fiscal-config.model';
import { upsertTenantFiscalConfig } from '../../../store/saas-admin.actions';
import { selectSaasAdminPending, selectSelectedTenantFiscalConfig } from '../../../store/saas-admin.selectors';

const CUIT_PATTERN = /^\d{2}-?\d{8}-?\d$/;

function cuitValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) return null;
  return CUIT_PATTERN.test(value) ? null : { cuitPattern: true };
}

const CONDICION_IVA_OPTIONS: { label: string; value: CondicionIva }[] = [
  { label: 'Responsable Inscripto', value: 'RESPONSABLE_INSCRIPTO' },
  { label: 'Monotributista', value: 'RESPONSABLE_MONOTRIBUTO' },
  { label: 'Exento', value: 'EXENTO' },
];

const PROVIDER_OPTIONS: { label: string; value: FiscalProvider }[] = [
  { label: 'Solo Factura X', value: 'NONE' },
  { label: 'Facturación electrónica ARCA', value: 'ARCA' },
];

const ARCA_ENVIRONMENT_OPTIONS: { label: string; value: ArcaEnvironment }[] = [
  { label: 'Homologación', value: 'HOMO' },
  { label: 'Producción', value: 'PROD' },
];

@Component({
  selector: 'tenant-fiscal-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    DatePickerModule,
    TextareaModule,
  ],
  template: `
    <div class="saas-card">
      <p class="fiscal-hint">
        Estos datos salen impresos en el comprobante de los cobros de este laboratorio.
      </p>

      <form [formGroup]="form" (ngSubmit)="save()" class="fiscal-grid">
        <label class="field field--wide">
          <span>Proveedor de facturación</span>
          <p-select formControlName="provider" [options]="providerOptions" optionLabel="label"
                    optionValue="value" appendTo="body" />
        </label>

        <label class="field">
          <span>Punto de venta</span>
          <input pInputText formControlName="invoicePointOfSale" placeholder="0001" />
        </label>

        <label class="field">
          <span>Razón social</span>
          <input pInputText formControlName="razonSocial" placeholder="Laboratorio S.A." />
        </label>

        <label class="field">
          <span>CUIT</span>
          <input pInputText formControlName="cuit" placeholder="20-12345678-9" />
          @if (cuitInvalid()) {
            <small class="field-error">El CUIT debe tener el formato 20-12345678-9.</small>
          }
        </label>

        <label class="field">
          <span>Ingresos brutos</span>
          <input pInputText formControlName="ingresosBrutos" placeholder="901-123456-7" />
        </label>

        <label class="field field--wide">
          <span>Domicilio comercial</span>
          <input pInputText formControlName="domicilioComercial" placeholder="Av. Siempre Viva 742" />
        </label>

        <label class="field">
          <span>Condición IVA</span>
          <p-select formControlName="condicionIva" [options]="condicionIvaOptions" optionLabel="label"
                    optionValue="value" [showClear]="true" placeholder="Seleccioná una condición" appendTo="body" />
        </label>

        <label class="field">
          <span>Inicio de actividades</span>
          <p-datepicker formControlName="inicioActividades" dateFormat="dd/mm/yy" [showIcon]="true" appendTo="body" />
        </label>

        @if (isArca()) {
          <div class="field--wide arca-block">
            <p class="fiscal-hint arca-block__hint">
              <i class="pi" [class.pi-check-circle]="arcaCredentialsConfigured()"
                 [class.pi-exclamation-triangle]="!arcaCredentialsConfigured()"></i>
              {{ arcaCredentialsConfigured() ? 'Credenciales cargadas' : 'Sin credenciales cargadas' }}
            </p>

            <div class="fiscal-grid">
              <label class="field">
                <span>Ambiente</span>
                <p-select formControlName="arcaEnvironment" [options]="arcaEnvironmentOptions" optionLabel="label"
                          optionValue="value" placeholder="Seleccioná un ambiente" appendTo="body" />
              </label>

              <label class="field">
                <span>Porcentaje de IVA</span>
                <p-inputNumber formControlName="arcaIvaPercentage" suffix="%" [min]="0" [max]="100" />
              </label>

              <label class="field field--wide">
                <span>Certificado (PEM)</span>
                <textarea pTextarea formControlName="arcaCertificatePem" rows="4"
                          placeholder="Pegá acá el certificado X.509 en PEM solo para cargarlo o reemplazarlo"></textarea>
              </label>

              <label class="field field--wide">
                <span>Clave privada (PEM)</span>
                <textarea pTextarea formControlName="arcaPrivateKeyPem" rows="4"
                          placeholder="Pegá acá la clave privada en PEM solo para cargarla o reemplazarla"></textarea>
              </label>

              <p class="fiscal-hint field--wide">
                Por seguridad, el certificado y la clave privada nunca se muestran una vez cargados.
                Dejá estos dos campos vacíos para conservar las credenciales ya guardadas — para
                cambiar el ambiente o el IVA también hay que volver a pegar ambos.
              </p>
              @if (arcaPemIncomplete()) {
                <small class="field-error field--wide">
                  Certificado y clave privada se cargan juntos: completá los dos o dejá los dos vacíos.
                </small>
              }
            </div>
          </div>
        }

        <div class="fiscal-grid__footer">
          <p-button label="Guardar" type="submit" [loading]="pending()" [disabled]="!canSubmit()" />
        </div>
      </form>
    </div>
  `,
  styles: [`
    .saas-card {
      background: var(--saas-surface, #fff);
      padding: var(--space-5, 20px);
      border-radius: 10px;
      border: 1px solid var(--saas-border, #e6e8ef);
      box-shadow: 0 1px 2px rgba(15,23,42,.04);
    }
    .fiscal-hint { color: var(--saas-text-muted, #6b7280); font-size: 12px; margin: 0 0 16px; }
    .fiscal-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 500; color: var(--saas-text-muted, #6b7280); }
    .field--wide { grid-column: 1 / -1; }
    .field-error { color: var(--p-red-600, #dc2626); font-weight: 400; }
    .fiscal-grid__footer { grid-column: 1 / -1; display: flex; justify-content: flex-end; }
    .arca-block { border-top: 1px solid var(--saas-border, #e6e8ef); padding-top: 16px; margin-top: 4px; }
    .arca-block__hint { display: flex; align-items: center; gap: 6px; }
  `],
})
export class TenantFiscalTabComponent {
  readonly tenantId = input.required<number>();

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);

  private readonly current = this.store.selectSignal(selectSelectedTenantFiscalConfig);
  protected readonly pending = this.store.selectSignal(selectSaasAdminPending);
  protected readonly condicionIvaOptions = CONDICION_IVA_OPTIONS;
  protected readonly providerOptions = PROVIDER_OPTIONS;
  protected readonly arcaEnvironmentOptions = ARCA_ENVIRONMENT_OPTIONS;

  readonly form = this.fb.nonNullable.group({
    provider: ['NONE' as FiscalProvider],
    invoicePointOfSale: [''],
    razonSocial: [''],
    cuit: ['', [cuitValidator]],
    ingresosBrutos: [''],
    domicilioComercial: [''],
    condicionIva: [null as CondicionIva | null],
    inicioActividades: [null as Date | null],
    arcaEnvironment: [null as ArcaEnvironment | null],
    arcaIvaPercentage: [null as number | null],
    arcaCertificatePem: [''],
    arcaPrivateKeyPem: [''],
  });

  // Reflejo del status y del value del form como signals (angular-conventions §4), para que el
  // error inline del CUIT, el bloque condicional de ARCA y el disabled del botón compongan con
  // OnPush sin suscripciones manuales.
  private readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  protected readonly invalid = computed(() => this.status() === 'INVALID');
  protected readonly cuitInvalid = computed(() => {
    this.status();
    const ctrl = this.form.get('cuit')!;
    return ctrl.invalid && (ctrl.touched || ctrl.dirty);
  });

  protected readonly isArca = computed(() => this.formValue().provider === 'ARCA');
  protected readonly arcaCredentialsConfigured = computed(() => this.current()?.arcaCredentialsConfigured ?? false);

  protected readonly arcaPemIncomplete = computed(() => {
    const v = this.formValue();
    const certFilled = !!v.arcaCertificatePem;
    const keyFilled = !!v.arcaPrivateKeyPem;
    return certFilled !== keyFilled;
  });

  // El primer alta de ARCA no tiene credenciales previas que preservar: exige ambos PEM y los
  // dos campos de configuración. Sin esto, `buildFiscalConfigRequest` mandaría el bloque ARCA
  // entero en null (nada que preservar) y el proveedor quedaría en ARCA sin certificado.
  protected readonly arcaMissingFirstSetup = computed(() => {
    const v = this.formValue();
    if (v.provider !== 'ARCA') return false;
    const missingConfig = !v.arcaEnvironment || v.arcaIvaPercentage === null;
    const missingCredentials = !this.arcaCredentialsConfigured() && (!v.arcaCertificatePem || !v.arcaPrivateKeyPem);
    return missingConfig || missingCredentials;
  });

  protected readonly canSubmit = computed(
    () => !this.invalid() && !this.pending() && !this.arcaPemIncomplete() && !this.arcaMissingFirstSetup(),
  );

  constructor() {
    effect(() => {
      const cfg = this.current();
      // Solo hidrata si el usuario no editó nada todavía: el GET de la config puede resolver
      // después de que empezó a tipear, y un reset acá le borraría lo escrito.
      if (cfg && this.form.pristine) {
        this.form.reset({
          provider: cfg.provider,
          invoicePointOfSale: cfg.invoicePointOfSale ?? '',
          razonSocial: cfg.razonSocial ?? '',
          cuit: cfg.cuit ?? '',
          ingresosBrutos: cfg.ingresosBrutos ?? '',
          domicilioComercial: cfg.domicilioComercial ?? '',
          condicionIva: cfg.condicionIva ?? null,
          inicioActividades: dateFromIso(cfg.inicioActividades),
          arcaEnvironment: cfg.arcaEnvironment ?? null,
          arcaIvaPercentage: cfg.arcaIvaPercentage ?? null,
          // Los PEM nunca vienen del GET (S09): el form arranca siempre vacío acá.
          arcaCertificatePem: '',
          arcaPrivateKeyPem: '',
        });
      }
    });
  }

  save(): void {
    if (!this.canSubmit()) return;
    const raw = this.form.getRawValue();
    const req = buildFiscalConfigRequest(this.tenantId(), raw, {
      provider: raw.provider,
      arcaEnvironment: raw.arcaEnvironment,
      arcaIvaPercentage: raw.arcaIvaPercentage,
      arcaCertificatePem: raw.arcaCertificatePem,
      arcaPrivateKeyPem: raw.arcaPrivateKeyPem,
    });
    this.store.dispatch(upsertTenantFiscalConfig({ req }));
    this.form.markAsPristine();
  }
}
