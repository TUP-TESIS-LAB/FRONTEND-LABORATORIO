import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { toSignal } from '@angular/core/rxjs-interop';

import * as A from '../store/sucursal.actions';
import { selectSucursalSaving } from '../store/sucursal.selectors';
import { Sucursal, SucursalCreateInput, SucursalStatus } from '../models/sucursal.model';

const STATUS_OPTIONS: { label: string; value: SucursalStatus }[] = [
  { label: 'Activa', value: 'ACTIVE' },
  { label: 'Inactiva', value: 'INACTIVE' },
];

@Component({
  selector: 'app-sucursal-form-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    InputNumberModule,
  ],
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [draggable]="false"
      [style]="{ width: '38rem' }"
      [header]="sucursal ? 'Editar sucursal' : 'Nueva sucursal'"
      (onHide)="onHide()">

      <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">

        <div class="form-field">
          <label for="code">Código *</label>
          <input
            id="code"
            pInputText
            formControlName="code"
            placeholder="Ej: SUC-01"
            [class.ng-invalid]="form.controls.code.invalid && form.controls.code.touched" />
          @if (form.controls.code.errors?.['required'] && form.controls.code.touched) {
            <small class="form-error">El código es requerido.</small>
          }
        </div>

        <div class="form-field">
          <label for="description">Descripción *</label>
          <input
            id="description"
            pInputText
            formControlName="description"
            placeholder="Nombre de la sucursal"
            [class.ng-invalid]="form.controls.description.invalid && form.controls.description.touched" />
          @if (form.controls.description.errors?.['required'] && form.controls.description.touched) {
            <small class="form-error">La descripción es requerida.</small>
          }
        </div>

        <div class="form-field">
          <label for="status">Estado *</label>
          <p-select
            id="status"
            formControlName="status"
            [options]="statusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Seleccionar estado" />
        </div>

        <fieldset class="address-fieldset">
          <legend>Dirección</legend>
          <div formGroupName="address" class="form-grid">
            <div class="form-field">
              <label for="street">Calle</label>
              <input id="street" pInputText formControlName="street" placeholder="Nombre de la calle" />
            </div>
            <div class="form-field">
              <label for="streetNumber">Número</label>
              <input id="streetNumber" pInputText formControlName="streetNumber" placeholder="Ej: 1234" />
            </div>
            <div class="form-field">
              <label for="cityId">Ciudad (ID)</label>
              <p-inputnumber id="cityId" formControlName="cityId" [useGrouping]="false" placeholder="ID de ciudad" />
            </div>
            <div class="form-field">
              <label for="neighborhoodId">Barrio (ID)</label>
              <p-inputnumber id="neighborhoodId" formControlName="neighborhoodId" [useGrouping]="false" placeholder="ID de barrio" />
            </div>
          </div>
        </fieldset>

        <div class="form-actions">
          <p-button
            type="button"
            label="Cancelar"
            severity="secondary"
            text
            (onClick)="onHide()" />
          <p-button
            type="submit"
            [label]="sucursal ? 'Guardar cambios' : 'Crear sucursal'"
            [loading]="saving()"
            [disabled]="form.invalid" />
        </div>

      </form>
    </p-dialog>
  `,
  styles: [`
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-3, 1rem);
    }
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .form-field label {
      font-size: 0.875rem;
      font-weight: 500;
    }
    .form-field input,
    .form-field p-select,
    .form-field p-inputnumber {
      width: 100%;
    }
    .form-error {
      color: var(--ds-danger, #ef4444);
      font-size: 0.75rem;
    }
    .address-fieldset {
      grid-column: 1 / -1;
      border: 1px solid var(--surface-border, #e5e7eb);
      border-radius: 6px;
      padding: var(--space-3, 1rem);
      margin: 0;
    }
    .address-fieldset legend {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-color-secondary, #6b7280);
      padding: 0 0.25rem;
    }
    .form-actions {
      grid-column: 1 / -1;
      display: flex;
      justify-content: flex-end;
      gap: var(--space-2, 0.5rem);
      padding-top: var(--space-2, 0.5rem);
    }
  `],
})
export class SucursalFormModalComponent implements OnInit, OnChanges {
  @Input() sucursal: Sucursal | null = null;
  @Output() closed = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);

  readonly saving = this.store.selectSignal(selectSucursalSaving);

  visible = true;

  readonly statusOptions = STATUS_OPTIONS;

  readonly form = this.fb.group({
    code:        ['', [Validators.required]],
    description: ['', [Validators.required]],
    status:      ['ACTIVE' as SucursalStatus, [Validators.required]],
    address: this.fb.group({
      street:         [''],
      streetNumber:   [''],
      cityId:         [null as number | null],
      neighborhoodId: [null as number | null],
    }),
  });

  ngOnInit(): void {
    this.patchFromInput();
  }

  ngOnChanges(): void {
    this.patchFromInput();
  }

  private patchFromInput(): void {
    if (!this.sucursal) {
      this.form.reset({ status: 'ACTIVE', address: {} });
      return;
    }
    const s = this.sucursal;
    this.form.patchValue({
      code:        s.code,
      description: s.description,
      status:      s.status,
      address: {
        street:         s.address?.street ?? '',
        streetNumber:   s.address?.streetNumber ?? '',
        cityId:         s.address?.cityId ?? null,
        neighborhoodId: s.address?.neighborhoodId ?? null,
      },
    });
  }

  submit(): void {
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const addr = raw.address;
    const hasAddress = addr.street || addr.streetNumber || addr.cityId || addr.neighborhoodId;

    const input: SucursalCreateInput = {
      code:        raw.code!,
      description: raw.description!,
      status:      raw.status as SucursalStatus,
      ...(hasAddress ? {
        address: {
          street:         addr.street || undefined,
          streetNumber:   addr.streetNumber || undefined,
          cityId:         addr.cityId ?? undefined,
          neighborhoodId: addr.neighborhoodId ?? undefined,
        },
      } : {}),
    };

    if (this.sucursal) {
      this.store.dispatch(A.updateSucursal({ id: this.sucursal.id, input }));
    } else {
      this.store.dispatch(A.addSucursal({ input }));
    }

    this.onHide();
  }

  onHide(): void {
    this.visible = false;
    this.closed.emit();
  }
}
