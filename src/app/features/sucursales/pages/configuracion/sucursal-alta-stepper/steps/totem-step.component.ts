import {
  ChangeDetectionStrategy, Component, Input, OnInit, computed, inject, effect, signal, DestroyRef,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageService } from 'primeng/api';

import { selectTotemConfig, selectCurrentSucursal } from '../../../../store/sucursal.selectors';
import {
  loadTotemConfig,
  upsertTotemConfig,
  updateSucursal,
  updateSucursalSuccess,
  updateSucursalFailure,
} from '../../../../store/sucursal.actions';
import { SucursalUpdateInput } from '../../../../models/sucursal.model';

@Component({
  selector: 'app-totem-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ReactiveFormsModule, ButtonModule, ToggleSwitch, InputNumberModule],
  templateUrl: './totem-step.component.html',
  styleUrl: './totem-step.component.scss',
})
export class TotemStepComponent implements OnInit {
  @Input({ required: true }) branchId!: number;

  private fb = inject(FormBuilder);
  private store = inject(Store);
  private actions$ = inject(Actions);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);

  protected readonly totemConfig = this.store.selectSignal(selectTotemConfig);
  protected readonly enabled = computed(() => this.totemConfig()?.enabled ?? false);
  protected readonly atencionDisplay = computed(() => this.totemConfig()?.atencionDisplayEnabled ?? false);
  protected readonly extraccionDisplay = computed(() => this.totemConfig()?.extraccionDisplayEnabled ?? false);
  protected readonly current = this.store.selectSignal(selectCurrentSucursal);
  protected readonly savingBoxes = signal(false);

  protected readonly boxesForm = this.fb.nonNullable.group({
    atencionBoxesCount: [1, [Validators.required, Validators.min(1)]],
    extraccionBoxesCount: [1, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    let lastId: number | null = null;
    effect(() => {
      const c = this.current();
      if (c && c.id !== lastId) {
        lastId = c.id;
        this.boxesForm.patchValue({
          atencionBoxesCount: c.atencionBoxesCount,
          extraccionBoxesCount: c.extraccionBoxesCount,
        }, { emitEvent: false });
      }
    });
  }

  ngOnInit() {
    this.store.dispatch(loadTotemConfig({ branchId: this.branchId }));
  }

  onToggle(value: boolean) {
    this.upsert({ enabled: value });
  }

  /** Upsert del config preservando los flags que no se tocaron. */
  upsert(partial: Partial<{ enabled: boolean; atencionDisplayEnabled: boolean; extraccionDisplayEnabled: boolean }>) {
    this.store.dispatch(upsertTotemConfig({
      branchId: this.branchId,
      enabled: partial.enabled ?? this.enabled(),
      atencionDisplayEnabled: partial.atencionDisplayEnabled ?? this.atencionDisplay(),
      extraccionDisplayEnabled: partial.extraccionDisplayEnabled ?? this.extraccionDisplay(),
    }));
  }

  saveBoxes() {
    this.boxesForm.markAllAsTouched();
    if (this.boxesForm.invalid || this.savingBoxes()) return;

    const current = this.current();
    const raw = this.boxesForm.getRawValue();

    const input: SucursalUpdateInput = {
      code: current?.code ?? '',
      description: current?.description ?? '',
      status: current?.status ?? 'ACTIVE',
      atencionBoxesCount: raw.atencionBoxesCount,
      extraccionBoxesCount: raw.extraccionBoxesCount,
      address: current?.address ?? undefined,
    };

    this.savingBoxes.set(true);
    this.store.dispatch(updateSucursal({ id: this.branchId, input }));

    this.actions$.pipe(
      ofType(updateSucursalSuccess),
      take(1),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.savingBoxes.set(false);
      this.messageService.add({
        severity: 'success',
        summary: 'Boxes guardados',
        detail: 'La cantidad de boxes fue guardada correctamente.',
      });
    });

    this.actions$.pipe(
      ofType(updateSucursalFailure),
      take(1),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ error }) => {
      this.savingBoxes.set(false);
      const detail = typeof error === 'string' ? error : 'Error al guardar los boxes.';
      this.messageService.add({ severity: 'error', summary: 'Error', detail });
    });
  }
}
