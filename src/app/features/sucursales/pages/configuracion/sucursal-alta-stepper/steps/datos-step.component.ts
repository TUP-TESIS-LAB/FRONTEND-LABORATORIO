import {
  ChangeDetectionStrategy, Component, EventEmitter, Output,
  DestroyRef, inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';

import { addSucursal, addSucursalSuccess, addSucursalFailure } from '../../../../store/sucursal.actions';
import { SucursalCreateInput, SucursalStatus } from '../../../../models/sucursal.model';

const STATUS_OPTIONS: { label: string; value: SucursalStatus }[] = [
  { label: 'Activa', value: 'ACTIVE' },
  { label: 'Inactiva', value: 'INACTIVE' },
];

@Component({
  selector: 'app-datos-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule],
  templateUrl: './datos-step.component.html',
  styleUrl: './datos-step.component.scss',
})
export class DatosStepComponent {
  @Output() completed = new EventEmitter<number>();

  private fb = inject(FormBuilder);
  private store = inject(Store);
  private actions$ = inject(Actions);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected saving = false;

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(30)]],
    description: ['', [Validators.required, Validators.maxLength(120)]],
    status: ['ACTIVE' as SucursalStatus, Validators.required],
    address: this.fb.group({
      street: [''],
      streetNumber: [''],
    }),
  });

  submit() {
    if (this.form.invalid || this.saving) return;
    const raw = this.form.getRawValue();

    const street = raw.address.street?.trim() ?? '';
    const streetNumber = raw.address.streetNumber?.trim() ?? '';
    const hasAddress = street.length > 0 || streetNumber.length > 0;

    const input: SucursalCreateInput = {
      code: raw.code.trim(),
      description: raw.description.trim(),
      status: raw.status,
      ...(hasAddress ? { address: { street, streetNumber } } : {}),
    };

    this.saving = true;
    this.store.dispatch(addSucursal({ input }));

    this.actions$.pipe(
      ofType(addSucursalSuccess),
      take(1),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ sucursal }) => {
      this.saving = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Sucursal creada',
        detail: `${sucursal.code} — ${sucursal.description}`,
      });
      this.completed.emit(sucursal.id);
    });

    this.actions$.pipe(
      ofType(addSucursalFailure),
      take(1),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ error }) => {
      this.saving = false;
      const detail = typeof error === 'string' ? error : 'Ocurrió un error inesperado.';
      this.messageService.add({
        severity: 'error',
        summary: 'No se pudo crear la sucursal',
        detail,
      });
    });
  }
}
