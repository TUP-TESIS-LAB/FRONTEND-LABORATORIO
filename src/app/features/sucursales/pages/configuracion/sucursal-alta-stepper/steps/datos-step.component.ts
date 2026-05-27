import {
  ChangeDetectionStrategy, Component, EventEmitter, Output,
  DestroyRef, inject, signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';

import { addSucursal, addSucursalSuccess, addSucursalFailure } from '../../../../store/sucursal.actions';
import { SucursalCreateInput, SucursalStatus } from '../../../../models/sucursal.model';

@Component({
  selector: 'app-datos-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule],
  templateUrl: './datos-step.component.html',
  styleUrl: './datos-step.component.scss',
})
export class DatosStepComponent {
  @Output() completed = new EventEmitter<number>();

  private fb = inject(FormBuilder);
  private store = inject(Store);
  private actions$ = inject(Actions);
  private destroyRef = inject(DestroyRef);
  private messageService = inject(MessageService);

  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(30)]],
    description: ['', [Validators.required, Validators.maxLength(120)]],
    address: this.fb.group({
      street: [''],
      streetNumber: [''],
    }),
  });

  submit() {
    if (this.form.invalid || this.saving()) return;
    const raw = this.form.getRawValue();

    const street = raw.address.street?.trim() ?? '';
    const streetNumber = raw.address.streetNumber?.trim() ?? '';
    const hasAddress = street.length > 0 || streetNumber.length > 0;

    const input: SucursalCreateInput = {
      code: raw.code.trim(),
      description: raw.description.trim(),
      status: 'ACTIVE' as SucursalStatus,
      ...(hasAddress ? { address: { street, streetNumber } } : {}),
    };

    this.saving.set(true);
    this.store.dispatch(addSucursal({ input }));

    this.actions$.pipe(
      ofType(addSucursalSuccess),
      take(1),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ sucursal }) => {
      this.saving.set(false);
      this.completed.emit(sucursal.id);
    });

    this.actions$.pipe(
      ofType(addSucursalFailure),
      take(1),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ error }) => {
      this.saving.set(false);
      const detail = typeof error === 'string' ? error : 'Ocurrió un error inesperado.';
      this.messageService.add({
        severity: 'error',
        summary: 'No se pudo crear la sucursal',
        detail,
      });
    });
  }
}
