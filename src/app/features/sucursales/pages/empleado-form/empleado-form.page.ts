import {
  ChangeDetectionStrategy, Component, computed, effect, HostListener, inject, input, OnDestroy, signal,
} from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Actions, ofType } from '@ngrx/effects';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { FormStepperHeaderComponent } from '@shared/ui/components/form-stepper-header/form-stepper-header.component';
import { humanizeBackendError } from '@shared/utils/error-messages';
import {
  addEmployee, addEmployeeSuccess, updateEmployee, updateEmployeeSuccess,
  loadEmployee, loadEmployeeContacts, clearSelectedEmployee,
} from '../../store/employee.actions';
import {
  selectEmployeePending, selectEmployeeError, selectSelectedEmployee, selectSelectedEmployeeContacts,
} from '../../store/employee.selectors';
import {
  CreateEmployeeRequest, Employee, EmployeeContact, EmployeeContactInput, EmployeeContactType,
} from '../../models/employee.model';
import { EMPLOYEE_FORM_STEPS } from './employee-form-steps';
import { DatosStepComponent } from './steps/datos-step/datos-step.component';
import { ContactosStepComponent } from './steps/contactos-step/contactos-step.component';
import { ResumenStepComponent, EmployeeSummaryView } from './steps/resumen-step/resumen-step.component';

interface ContactRow { id: number | null; contactType: EmployeeContactType; value: string; }

@Component({
  selector: 'emp-empleado-form-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, ButtonModule, ConfirmDialogModule,
    FormStepperHeaderComponent, DatosStepComponent, ContactosStepComponent, ResumenStepComponent,
  ],
  providers: [ConfirmationService],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col h-full">
      <header class="flex items-center gap-3 px-6 py-3 bg-surface-0 border-b sticky top-0 z-10">
        <p-button [text]="true" icon="pi pi-arrow-left" label="Volver" type="button" (onClick)="onBack()" />
        <h1 class="text-base font-semibold m-0">
          {{ isEdit() ? 'Editar empleado' : 'Nuevo empleado' }}
          @if (isEdit() && employee(); as e) {
            <span class="text-surface-500 font-normal ml-2">· {{ e.lastName }}, {{ e.firstName }}</span>
          }
        </h1>
        <nav class="ml-auto text-xs text-surface-500">Sucursales › Empleados › {{ isEdit() ? 'Editar' : 'Nuevo' }}</nav>
      </header>

      <ui-form-stepper-header
        [steps]="steps" [currentIndex]="currentStep()" [visited]="visited()"
        (stepSelected)="goToStep($event)" />

      <div class="flex-1 overflow-y-auto px-8 py-6">
        @if (saveError(); as err) {
          <div class="mb-3 p-3 rounded" style="background:#fef2f2;border:1px solid var(--ds-danger);color:var(--ds-danger);">
            {{ saveErrorMessage(err) }}
          </div>
        }
        @switch (currentStep()) {
          @case (0) { <emp-datos-step [group]="datosGroup" /> }
          @case (1) { <emp-contactos-step [array]="contactosArray" /> }
          @case (2) { <emp-resumen-step [data]="summaryView()" (editStep)="goToStep($event)" /> }
        }
      </div>

      <footer class="flex items-center gap-3 px-6 py-3 bg-surface-0 border-t sticky bottom-0">
        <span class="text-xs text-surface-500">{{ formStatusLabel() }}</span>
        <span class="text-xs text-surface-400 ml-2">Paso {{ currentStep() + 1 }} de {{ steps.length }}</span>
        <div class="ml-auto flex flex-row-reverse gap-2">
          @if (showSubmitButton()) {
            <p-button [label]="isEdit() ? 'Guardar cambios' : 'Registrar empleado'" type="submit"
                      severity="success" [loading]="pending()" [disabled]="!canSubmit()" />
          }
          @if (showContinueButton()) {
            <p-button label="Continuar →" type="button" [disabled]="!canContinue()" (onClick)="goNext()" />
          }
          @if (!isFirstStep()) {
            <p-button label="← Atrás" [text]="true" type="button" (onClick)="goBack()" />
          }
          <p-button label="Cancelar" severity="secondary" [outlined]="true" type="button" (onClick)="onBack()" />
        </div>
      </footer>
      <p-confirmDialog />
    </form>
  `,
})
export class EmpleadoFormPage implements OnDestroy {
  readonly id = input<string | undefined>(undefined);

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly actions$ = inject(Actions);
  private readonly confirm = inject(ConfirmationService);

  readonly steps = EMPLOYEE_FORM_STEPS;

  readonly pending = this.store.selectSignal(selectEmployeePending);
  readonly saveError = this.store.selectSignal(selectEmployeeError);
  readonly employee = this.store.selectSignal(selectSelectedEmployee);
  private readonly contacts = this.store.selectSignal(selectSelectedEmployeeContacts);

  private originalContacts: EmployeeContact[] = [];

  readonly form: FormGroup = this.fb.group({
    datos: this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      document: ['', Validators.required],
      registration: [''],
      isBiochemist: [false],
    }),
    contactos: this.fb.array<FormGroup>([]),
  });

  readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  readonly isEdit = computed(() => { const v = this.id(); return v != null && v !== ''; });
  readonly datosValid = computed(() => { void this.value(); void this.status(); return this.datosGroup.valid; });
  readonly contactosValid = computed(() => { void this.value(); void this.status(); return this.contactosArray.valid; });

  readonly currentStep = signal(0);
  readonly visited = signal<ReadonlySet<number>>(new Set([0]));

  readonly isFirstStep = computed(() => this.currentStep() === 0);
  readonly isLastStep = computed(() => this.currentStep() === this.steps.length - 1);

  readonly canContinue = computed(() => {
    if (this.currentStep() === 0) return this.datosValid();
    if (this.currentStep() === 1) return this.contactosValid();
    return true;
  });
  readonly canSubmit = computed(() =>
    this.datosValid() && this.contactosValid() && !this.pending() && (this.isEdit() || this.isLastStep()));
  readonly showContinueButton = computed(() => !this.isLastStep() && !this.isEdit());
  readonly showSubmitButton = computed(() => this.isEdit() || this.isLastStep());

  readonly formStatusLabel = computed(() => {
    if (this.pending()) return 'Guardando…';
    void this.value();
    return this.form.dirty ? '● Cambios sin guardar' : 'Sin cambios';
  });

  readonly summaryView = computed<EmployeeSummaryView>(() => {
    void this.value();
    const d = this.datosGroup.getRawValue() as {
      firstName: string; lastName: string; document: string; registration: string; isBiochemist: boolean;
    };
    return {
      firstName: d.firstName, lastName: d.lastName, document: d.document,
      registration: d.registration || null, isBiochemist: d.isBiochemist,
      contacts: this.filledContacts().map((c) => ({ contactType: c.contactType, value: c.value })),
    };
  });

  get datosGroup(): FormGroup { return this.form.get('datos') as FormGroup; }
  get contactosArray(): FormArray<FormGroup> { return this.form.get('contactos') as FormArray<FormGroup>; }

  private hydratedForId: string | undefined = undefined;

  constructor() {
    effect(() => {
      const id = this.id();
      if (!id) {
        if (this.hydratedForId !== undefined) { this.resetForCreate(); this.hydratedForId = undefined; }
        return;
      }
      const numericId = Number(id);
      if (Number.isNaN(numericId)) { this.router.navigate(['/sucursales/empleados']); return; }
      if (this.hydratedForId !== id) {
        this.store.dispatch(loadEmployee({ id: numericId }));
        this.store.dispatch(loadEmployeeContacts({ employeeId: numericId }));
        this.hydratedForId = id;
      }
    });

    effect(() => {
      const e = this.employee();
      if (this.isEdit() && e && String(e.id) === this.id()) {
        this.hydrateDatos(e);
        this.visited.set(new Set([0, 1, 2]));
      }
    });

    effect(() => {
      const list = this.contacts();
      if (this.isEdit() && this.hydratedForId === this.id()) {
        this.hydrateContacts(list);
      }
    });

    this.actions$.pipe(ofType(addEmployeeSuccess, updateEmployeeSuccess), takeUntilDestroyed())
      .subscribe(() => this.router.navigateByUrl('/sucursales/empleados'));
  }

  goNext(): void {
    if (!this.canContinue()) {
      (this.currentStep() === 0 ? this.datosGroup : this.contactosArray).markAllAsTouched();
      return;
    }
    const next = Math.min(this.currentStep() + 1, this.steps.length - 1);
    this.currentStep.set(next);
    this.visited.update((s) => new Set(s).add(next));
  }
  goBack(): void { this.currentStep.set(Math.max(this.currentStep() - 1, 0)); }
  goToStep(i: number): void { if (this.visited().has(i)) this.currentStep.set(i); }

  private contactGroup(row: Partial<ContactRow>): FormGroup {
    return this.fb.group({
      id: [row.id ?? null],
      contactType: [(row.contactType ?? 'EMAIL') as EmployeeContactType, Validators.required],
      value: [row.value ?? '', Validators.required],
    });
  }

  private filledContacts(): ContactRow[] {
    return (this.contactosArray.getRawValue() as ContactRow[]).filter((c) => c.value?.trim());
  }

  private resetForCreate(): void {
    this.form.reset({ datos: { firstName: '', lastName: '', document: '', registration: '', isBiochemist: false } });
    this.contactosArray.clear();
    this.originalContacts = [];
    this.currentStep.set(0);
    this.visited.set(new Set([0]));
  }

  private hydrateDatos(e: Employee): void {
    this.datosGroup.patchValue({
      firstName: e.firstName, lastName: e.lastName, document: e.document,
      registration: e.registration ?? '', isBiochemist: e.isBiochemist,
    });
    this.form.markAsPristine();
  }

  private hydrateContacts(list: EmployeeContact[]): void {
    this.originalContacts = list;
    this.contactosArray.clear();
    for (const c of list) {
      this.contactosArray.push(this.contactGroup({ id: c.id, contactType: c.contactType, value: c.value }));
    }
    this.form.markAsPristine();
  }

  saveErrorMessage(err: { status?: number; error?: { message?: string } }): string {
    return humanizeBackendError(err, {
      fallback: 'No se pudo guardar el empleado.',
      byStatus: {
        409: 'Ya existe un empleado con ese documento.',
        400: 'Algunos datos del empleado no son válidos. Revisalos e intentá de nuevo.',
        422: 'Algunos datos del empleado no son válidos. Revisalos e intentá de nuevo.',
        500: 'No se pudo guardar el empleado. Intentá de nuevo en unos minutos.',
      },
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); this.onSubmit(); return; }
    if (e.key === 'Escape') {
      if (document.querySelector('.p-overlay-mask, .p-select-overlay')) return;
      e.preventDefault(); this.onBack();
    }
  }

  onSubmit(): void {
    if (!this.canSubmit()) return;
    const d = this.datosGroup.getRawValue() as {
      firstName: string; lastName: string; document: string; registration: string; isBiochemist: boolean;
    };
    const req: CreateEmployeeRequest = {
      firstName: d.firstName, lastName: d.lastName, document: d.document,
      isBiochemist: d.isBiochemist, registration: d.registration?.trim() ? d.registration.trim() : null,
    };
    const rows = this.filledContacts();
    const editId = this.id();

    if (!editId) {
      const contacts: EmployeeContactInput[] = rows.map((r) => ({ contactType: r.contactType, value: r.value.trim() }));
      this.store.dispatch(addEmployee({ req, contacts }));
      return;
    }

    const toCreate: EmployeeContactInput[] = rows
      .filter((r) => r.id == null)
      .map((r) => ({ contactType: r.contactType, value: r.value.trim() }));
    const toUpdate = rows
      .filter((r) => r.id != null)
      .filter((r) => {
        const orig = this.originalContacts.find((o) => o.id === r.id);
        return orig && (orig.contactType !== r.contactType || orig.value !== r.value.trim());
      })
      .map((r) => ({ contactId: r.id as number, input: { contactType: r.contactType, value: r.value.trim() } }));
    const currentIds = new Set(rows.filter((r) => r.id != null).map((r) => r.id as number));
    const toDelete = this.originalContacts.filter((o) => !currentIds.has(o.id)).map((o) => o.id);

    this.store.dispatch(updateEmployee({ id: Number(editId), req, toCreate, toUpdate, toDelete }));
  }

  onBack(): void {
    if (!this.form.dirty) { this.router.navigate(['/sucursales/empleados']); return; }
    this.confirm.confirm({
      header: '¿Descartar cambios?',
      message: 'Vas a perder los cambios sin guardar.',
      acceptLabel: 'Descartar', rejectLabel: 'Seguir editando',
      accept: () => this.router.navigate(['/sucursales/empleados']),
    });
  }

  ngOnDestroy(): void { this.store.dispatch(clearSelectedEmployee()); }
}
