import {
  ChangeDetectionStrategy, Component, Input, OnInit, DestroyRef, inject, effect, signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';

import { selectCurrentSucursal } from '../../../../store/sucursal.selectors';
import {
  updateSucursal,
  updateSucursalSuccess,
  updateSucursalFailure,
} from '../../../../store/sucursal.actions';
import { SucursalStatus, SucursalUpdateInput } from '../../../../models/sucursal.model';

const STATUS_OPTIONS: { label: string; value: SucursalStatus }[] = [
  { label: 'Activa', value: 'ACTIVE' },
  { label: 'Inactiva', value: 'INACTIVE' },
];

@Component({
  selector: 'app-datos-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, InputNumberModule, SelectModule],
  templateUrl: './datos-tab.component.html',
  styleUrl: './datos-tab.component.scss',
})
export class DatosTabComponent {
  @Input({ required: true }) branchId!: number;

  private fb = inject(FormBuilder);
  private store = inject(Store);
  private actions$ = inject(Actions);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly saving = signal(false);
  protected readonly current = this.store.selectSignal(selectCurrentSucursal);

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(30)]],
    description: ['', [Validators.required, Validators.maxLength(120)]],
    status: ['ACTIVE' as SucursalStatus, Validators.required],
    atencionBoxesCount: [1, [Validators.required, Validators.min(1)]],
    extraccionBoxesCount: [1, [Validators.required, Validators.min(1)]],
    address: this.fb.group({
      street: [''],
      streetNumber: [''],
    }),
  });

  constructor() {
    let lastId: number | null = null;
    effect(() => {
      const c = this.current();
      if (c && c.id !== lastId) {
        lastId = c.id;
        this.form.patchValue({
          code: c.code,
          description: c.description,
          status: c.status,
          atencionBoxesCount: c.atencionBoxesCount,
          extraccionBoxesCount: c.extraccionBoxesCount,
          address: {
            street: c.address?.street ?? '',
            streetNumber: c.address?.streetNumber ?? '',
          },
        }, { emitEvent: false });
      }
    });
  }

  submit() {
    if (this.form.invalid || this.saving()) return;
    const raw = this.form.getRawValue();
    const input: SucursalUpdateInput = {
      code: raw.code.trim(),
      description: raw.description.trim(),
      status: raw.status,
      atencionBoxesCount: raw.atencionBoxesCount,
      extraccionBoxesCount: raw.extraccionBoxesCount,
      address: {
        street: raw.address.street?.trim() ?? '',
        streetNumber: raw.address.streetNumber?.trim() ?? '',
      },
    };

    this.saving.set(true);
    this.store.dispatch(updateSucursal({ id: this.branchId, input }));

    this.actions$.pipe(
      ofType(updateSucursalSuccess),
      take(1),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ sucursal }) => {
      this.saving.set(false);
      this.messageService.add({
        severity: 'success',
        summary: 'Datos actualizados',
        detail: `${sucursal.code}`,
      });
    });

    this.actions$.pipe(
      ofType(updateSucursalFailure),
      take(1),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ error }) => {
      this.saving.set(false);
      const detail = typeof error === 'string' ? error : 'Error al actualizar';
      this.messageService.add({ severity: 'error', summary: 'Error', detail });
    });
  }
}
