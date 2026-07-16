import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { buildFiscalConfigRequest, CondicionIva, dateFromIso } from '../../../models/tenant-fiscal-config.model';
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

@Component({
  selector: 'tenant-fiscal-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule, DatePickerModule],
  template: `
    <div class="saas-card">
      <p class="fiscal-hint">
        Estos datos salen impresos en el comprobante (Factura X) de los cobros de este laboratorio.
        Proveedor de facturación electrónica: <strong>Sin integración (NONE)</strong>.
      </p>

      <form [formGroup]="form" (ngSubmit)="save()" class="fiscal-grid">
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

        <div class="fiscal-grid__footer">
          <p-button label="Guardar" type="submit" [loading]="pending()" [disabled]="invalid() || pending()" />
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
  `],
})
export class TenantFiscalTabComponent {
  readonly tenantId = input.required<number>();

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);

  private readonly current = this.store.selectSignal(selectSelectedTenantFiscalConfig);
  protected readonly pending = this.store.selectSignal(selectSaasAdminPending);
  protected readonly condicionIvaOptions = CONDICION_IVA_OPTIONS;

  readonly form = this.fb.nonNullable.group({
    invoicePointOfSale: [''],
    razonSocial: [''],
    cuit: ['', [cuitValidator]],
    ingresosBrutos: [''],
    domicilioComercial: [''],
    condicionIva: [null as CondicionIva | null],
    inicioActividades: [null as Date | null],
  });

  // Reflejo del status del form como signal (angular-conventions §4), para que el
  // error inline del CUIT y el disabled del botón compongan con OnPush sin
  // suscripciones manuales.
  private readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  protected readonly invalid = computed(() => this.status() === 'INVALID');
  protected readonly cuitInvalid = computed(() => {
    this.status();
    const ctrl = this.form.get('cuit')!;
    return ctrl.invalid && (ctrl.touched || ctrl.dirty);
  });

  constructor() {
    effect(() => {
      const cfg = this.current();
      // Solo hidrata si el usuario no editó nada todavía: el GET de la config puede resolver
      // después de que empezó a tipear, y un reset acá le borraría lo escrito.
      if (cfg && this.form.pristine) {
        this.form.reset({
          invoicePointOfSale: cfg.invoicePointOfSale ?? '',
          razonSocial: cfg.razonSocial ?? '',
          cuit: cfg.cuit ?? '',
          ingresosBrutos: cfg.ingresosBrutos ?? '',
          domicilioComercial: cfg.domicilioComercial ?? '',
          condicionIva: cfg.condicionIva ?? null,
          inicioActividades: dateFromIso(cfg.inicioActividades),
        });
      }
    });
  }

  save(): void {
    if (this.form.invalid) return;
    const req = buildFiscalConfigRequest(this.tenantId(), this.form.getRawValue());
    this.store.dispatch(upsertTenantFiscalConfig({ req }));
    this.form.markAsPristine();
  }
}
