import {
  ChangeDetectionStrategy, Component, Input, DestroyRef, inject, effect, signal,
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

import { selectCurrentSucursal } from '../../../../store/sucursal.selectors';
import {
  updateSucursal,
  updateSucursalSuccess,
  updateSucursalFailure,
} from '../../../../store/sucursal.actions';
import { SucursalStatus, SucursalUpdateInput } from '../../../../models/sucursal.model';
import { GeographyService, Province, City } from '../../../../services/geography.service';

const STATUS_OPTIONS: { label: string; value: SucursalStatus }[] = [
  { label: 'Activa', value: 'ACTIVE' },
  { label: 'Inactiva', value: 'INACTIVE' },
];

@Component({
  selector: 'app-datos-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule],
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
  private geographyService = inject(GeographyService);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly saving = signal(false);
  protected readonly provinces = signal<Province[]>([]);
  protected readonly cities = signal<City[]>([]);
  protected readonly current = this.store.selectSignal(selectCurrentSucursal);

  // provinceId vive en el form root porque NO se envía al back —
  // solo filtra las ciudades disponibles. cityId vive dentro de address
  // porque es lo que persiste el backend (AddressRequest.cityId).
  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(30)]],
    description: ['', [Validators.required, Validators.maxLength(120)]],
    status: ['ACTIVE' as SucursalStatus, Validators.required],
    provinceId: this.fb.control<number | null>(null),
    address: this.fb.group({
      street: [''],
      streetNumber: [''],
      cityId: this.fb.control<number | null>(null),
    }),
  });

  constructor() {
    // Load provinces once on init.
    this.geographyService.listProvinces()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(list => this.provinces.set(list));

    // Reload cities when province changes.
    this.form.controls.provinceId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(provinceId => {
        this.form.controls.address.controls.cityId.setValue(null, { emitEvent: false });
        if (provinceId == null) {
          this.cities.set([]);
          return;
        }
        this.geographyService.listCitiesByProvince(provinceId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(list => this.cities.set(list));
      });

    let lastId: number | null = null;
    effect(() => {
      const c = this.current();
      if (c && c.id !== lastId) {
        lastId = c.id;
        const cityId = c.address?.cityId ?? null;
        this.form.patchValue({
          code: c.code,
          description: c.description,
          status: c.status,
          // provinceId: we cannot derive it reliably without a cities lookup;
          // leave it null — the user can select it manually if needed.
          provinceId: null,
          address: {
            street: c.address?.street ?? '',
            streetNumber: c.address?.streetNumber ?? '',
            cityId,
          },
        }, { emitEvent: false });

        // If the branch already has a cityId, load cities for the city's
        // province so the select renders the saved value correctly.
        // We do this by loading all cities of the branch's current cityId:
        // since we don't know the provinceId, we skip pre-loading cities.
        // The user must select a province first to change the city.
      }
    });
  }

  submit() {
    if (this.form.invalid || this.saving()) return;
    const raw = this.form.getRawValue();
    const current = this.current();

    const input: SucursalUpdateInput = {
      code: raw.code.trim(),
      description: raw.description.trim(),
      status: raw.status,
      // Preserve existing boxes counts from store — not managed in this tab.
      atencionBoxesCount: current?.atencionBoxesCount ?? 1,
      extraccionBoxesCount: current?.extraccionBoxesCount ?? 1,
      address: {
        street: raw.address.street?.trim() ?? '',
        streetNumber: raw.address.streetNumber?.trim() ?? '',
        ...(raw.address.cityId != null ? { cityId: raw.address.cityId } : {}),
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
