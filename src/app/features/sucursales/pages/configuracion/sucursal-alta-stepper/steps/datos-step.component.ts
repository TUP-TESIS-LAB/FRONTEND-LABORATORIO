import {
  ChangeDetectionStrategy, Component, EventEmitter, Output, output, effect,
  DestroyRef, inject, signal,
} from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { take } from 'rxjs/operators';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';

import { addSucursal, addSucursalSuccess, addSucursalFailure } from '../../../../store/sucursal.actions';
import { SucursalCreateInput, SucursalStatus } from '../../../../models/sucursal.model';
import { GeographyService, Province, City } from '../../../../services/geography.service';

@Component({
  selector: 'app-datos-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputTextModule, SelectModule],
  templateUrl: './datos-step.component.html',
  styleUrl: './datos-step.component.scss',
})
export class DatosStepComponent {
  // Emite el branchId recien creado para que la pagina avance al siguiente paso.
  @Output() completed = new EventEmitter<number>();

  /**
   * Emite cuando el submit fallo (p.ej. 409 codigo duplicado). La pagina
   * lo consume para resetear su flag `creatingBranch` y desbloquear el boton
   * "Continuar →". Sin este output, el padre setea `creatingBranch=true` en
   * onContinueFromDatos() y nunca tiene como saber que hubo error → el boton
   * queda en loading state forever y el usuario no puede reintentar.
   */
  @Output() failed = new EventEmitter<void>();

  /**
   * Emite el estado de validez del form en cada cambio. La pagina lo consume
   * para habilitar reactivamente el boton "Continuar →" del footer sin tener
   * que mirar el FormGroup interno via @ViewChild ni depender de queueMicrotask
   * al cambiar de step.
   */
  readonly validChange = output<boolean>();

  private fb = inject(FormBuilder);
  private store = inject(Store);
  private actions$ = inject(Actions);
  private destroyRef = inject(DestroyRef);
  private messageService = inject(MessageService);
  private geographyService = inject(GeographyService);

  protected readonly saving = signal(false);
  protected readonly provinces = signal<Province[]>([]);
  protected readonly cities = signal<City[]>([]);

  // provinceId vive en el form root porque NO se envia al back -- solo
  // filtra las ciudades disponibles. cityId vive dentro de address porque
  // es lo que realmente persiste el backend (AddressRequest.cityId).
  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(30)]],
    provinceId: this.fb.control<number | null>(null),
    address: this.fb.group({
      street: [''],
      streetNumber: [''],
      cityId: this.fb.control<number | null>(null),
    }),
  });

  // Espejo signal del estado del form para que la pagina pueda habilitar
  // su boton "Continuar" en el footer reactivamente via @ViewChild.
  private readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  readonly formValid = (): boolean => this.status() === 'VALID';
  readonly isSaving = (): boolean => this.saving();

  constructor() {
    // Emite validChange en cada cambio de status. La pagina (parent) se subscribe
    // y actualiza su signal local — esto reemplaza al patron viejo de
    // @ViewChild + effect + queueMicrotask que solo se disparaba al cambiar de step.
    effect(() => {
      this.validChange.emit(this.formValid());
    });

    this.geographyService.listProvinces()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(list => this.provinces.set(list));

    this.form.controls.provinceId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(provinceId => {
        // Al cambiar de provincia, limpiar ciudad y recargar ciudades.
        this.form.controls.address.controls.cityId.setValue(null);
        if (provinceId == null) {
          this.cities.set([]);
          return;
        }
        this.geographyService.listCitiesByProvince(provinceId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(list => this.cities.set(list));
      });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.saving()) return;
    const raw = this.form.getRawValue();

    const street = raw.address.street?.trim() ?? '';
    const streetNumber = raw.address.streetNumber?.trim() ?? '';
    const cityId = raw.address.cityId;
    const hasAddress = street.length > 0 || streetNumber.length > 0 || cityId != null;

    const code = raw.code.trim();
    const input: SucursalCreateInput = {
      code,
      // Backend requiere description -- mandamos el mismo code para
      // satisfacer @NotBlank. El field se quito de la UI por decision UX
      // (no aportaba valor; ver tambien sucursales.service formato del selector).
      description: code,
      status: 'ACTIVE' as SucursalStatus,
      ...(hasAddress ? {
        address: {
          ...(street.length > 0 ? { street } : {}),
          ...(streetNumber.length > 0 ? { streetNumber } : {}),
          ...(cityId != null ? { cityId } : {}),
        },
      } : {}),
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
      this.failed.emit();
      this.messageService.add({
        severity: 'error',
        summary: 'No se pudo crear la sucursal',
        detail: this.mapCreateError(error),
      });
    });
  }

  /** Mapea HttpErrorResponse del back a mensaje user-friendly en espanol. */
  private mapCreateError(error: unknown): string {
    if (typeof error === 'string') return error;
    const raw = (error as { error?: { message?: string }, status?: number, message?: string });
    const backMsg = raw?.error?.message ?? raw?.message ?? '';
    if (raw?.status === 409) {
      if (backMsg.includes('description already exists')) {
        return 'Ya existe una sucursal con ese nombre.';
      }
      if (backMsg.includes('code already exists')) {
        return 'Ya existe una sucursal con ese código.';
      }
      return 'La sucursal ya existe.';
    }
    if (raw?.status === 400) return 'Algun dato no es valido. Revisá los campos.';
    return 'Ocurrió un error inesperado.';
  }
}
