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
import { WizardShellComponent } from '@shared/ui/components/wizard-shell/wizard-shell.component';
import {
  addEmployee, addEmployeeSuccess, updateEmployee, updateEmployeeSuccess, createEmployeeWithUser,
  loadEmployee, loadEmployeeContacts, clearSelectedEmployee,
} from '../../store/employee.actions';
import {
  selectEmployeePending, selectSelectedEmployee, selectSelectedEmployeeContacts,
} from '../../store/employee.selectors';
import {
  CreateEmployeeRequest, Employee, EmployeeContact, EmployeeContactInput, EmployeeContactType, UpdateEmployeeRequest,
} from '../../models/employee.model';
import { CrearUsuarioPayload } from '@features/empresa/models/usuario.model';
import { AccessSection } from '@core/access/access.model';
import { EMPLOYEE_FORM_STEPS } from './employee-form-steps';
import { DatosStepComponent } from './steps/datos-step/datos-step.component';
import { ContactosStepComponent } from './steps/contactos-step/contactos-step.component';
import { DireccionStepComponent } from './steps/direccion-step/direccion-step.component';
import { UsuarioStepComponent } from './steps/usuario-step/usuario-step.component';
import { ResumenStepComponent, EmployeeSummaryView } from './steps/resumen-step/resumen-step.component';

interface ContactRow { id: number | null; contactType: EmployeeContactType; value: string; }

@Component({
  selector: 'emp-empleado-form-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, ButtonModule, ConfirmDialogModule,
    WizardShellComponent, DatosStepComponent, ContactosStepComponent, DireccionStepComponent,
    UsuarioStepComponent, ResumenStepComponent,
  ],
  providers: [ConfirmationService],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col h-full">
      <ui-wizard-shell
        [customFooter]="true"
        [heading]="pageHeading()"
        [breadcrumb]="'Sucursales › Empleados › ' + (isEdit() ? 'Editar' : 'Nuevo')"
        [steps]="steps"
        [currentIndex]="currentStep()"
        [visited]="visited()"
        (stepSelected)="goToStep($event)">
        @switch (currentStep()) {
          @case (0) { <emp-datos-step [group]="datosGroup" /> }
          @case (1) { <emp-contactos-step [array]="contactosArray" /> }
          @case (2) { <emp-direccion-step [group]="direccionGroup" /> }
          @case (3) {
            <emp-usuario-step [group]="usuarioGroup" [mode]="usuarioMode()"
                              [isEdit]="isEdit()" [currentUserId]="employee()?.userId ?? null" />
          }
          @case (4) { <emp-resumen-step [data]="summaryView()" (editStep)="goToStep($event)" /> }
        }

        <ng-container wizardFooter>
          <span class="text-xs text-surface-400 hidden sm:inline">{{ formStatusLabel() }}</span>
          <div class="flex flex-row-reverse gap-2">
            @if (showSubmitButton()) {
              <p-button [label]="isEdit() ? 'Guardar cambios' : 'Registrar empleado'" type="submit"
                        severity="success" [loading]="pending()" [disabled]="!canSubmit()" />
            }
            @if (showContinueButton()) {
              <p-button label="Continuar" type="button" [disabled]="!canContinue()" (onClick)="goNext()" />
            }
            @if (!isFirstStep()) {
              <p-button label="Atrás" [text]="true" type="button" (onClick)="goBack()" />
            }
            <p-button label="Cancelar" severity="secondary" [outlined]="true" type="button" (onClick)="onBack()" />
          </div>
        </ng-container>
      </ui-wizard-shell>
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
    direccion: this.fb.group({
      street: [''],
      streetNumber: [''],
    }),
    usuario: this.fb.group({
      mode: ['none' as 'none' | 'existing' | 'new'],
      existingUserId: [null as number | null],
      newUser: this.fb.group({
        firstName: [''],
        lastName: [''],
        email: ['', Validators.email],
        username: [''],
        document: [''],
        roleId: [null as number | null],
        branchId: [null as number | null],
      }),
      sections: [[] as AccessSection[]],
    }),
  });

  readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  readonly isEdit = computed(() => { const v = this.id(); return v != null && v !== ''; });

  /** Título de la página (lo consume `ui-wizard-shell`); en edición sufija el nombre. */
  readonly pageHeading = computed(() => {
    if (!this.isEdit()) return 'Nuevo empleado';
    const e = this.employee();
    return e ? `Editar empleado · ${e.lastName}, ${e.firstName}` : 'Editar empleado';
  });

  readonly datosValid = computed(() => { void this.value(); void this.status(); return this.datosGroup.valid; });
  readonly contactosValid = computed(() => { void this.value(); void this.status(); return this.contactosArray.valid; });
  readonly usuarioMode = computed<string>(() => { void this.value(); return this.usuarioGroup.get('mode')!.value as string; });
  readonly usuarioValid = computed(() => {
    void this.value(); void this.status();
    const mode = this.usuarioMode();
    if (mode === 'existing') return this.usuarioGroup.get('existingUserId')!.value != null;
    if (mode === 'new') {
      const n = this.usuarioGroup.get('newUser') as FormGroup;
      const v = n.getRawValue() as { firstName: string; lastName: string; email: string; username: string; document: string; branchId: number | null };
      const emailOk = !n.get('email')!.hasError('email');
      return !!(v.firstName?.trim() && v.lastName?.trim() && v.username?.trim() && v.document?.trim() && v.email?.trim() && emailOk && v.branchId != null);
    }
    return true;
  });

  readonly currentStep = signal(0);
  readonly visited = signal<ReadonlySet<number>>(new Set([0]));

  readonly isFirstStep = computed(() => this.currentStep() === 0);
  readonly isLastStep = computed(() => this.currentStep() === this.steps.length - 1);

  readonly canContinue = computed(() => {
    if (this.currentStep() === 0) return this.datosValid();
    if (this.currentStep() === 1) return this.contactosValid();
    if (this.currentStep() === 3) return this.usuarioValid();
    return true;
  });
  readonly canSubmit = computed(() =>
    this.datosValid() && this.contactosValid() && this.usuarioValid() && !this.pending() && (this.isEdit() || this.isLastStep()));
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
    const dir = this.direccionGroup.getRawValue() as { street: string; streetNumber: string };
    return {
      firstName: d.firstName, lastName: d.lastName, document: d.document,
      registration: d.registration || null, isBiochemist: d.isBiochemist,
      street: dir.street?.trim() || null, streetNumber: dir.streetNumber?.trim() || null,
      userLabel: this.userSummaryLabel(),
      contacts: this.filledContacts().map((c) => ({ contactType: c.contactType, value: c.value })),
    };
  });

  get datosGroup(): FormGroup { return this.form.get('datos') as FormGroup; }
  get contactosArray(): FormArray<FormGroup> { return this.form.get('contactos') as FormArray<FormGroup>; }
  get direccionGroup(): FormGroup { return this.form.get('direccion') as FormGroup; }
  get usuarioGroup(): FormGroup { return this.form.get('usuario') as FormGroup; }

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
        this.visited.set(new Set([0, 1, 2, 3, 4]));
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
    this.form.reset({
      datos: { firstName: '', lastName: '', document: '', registration: '', isBiochemist: false },
      direccion: { street: '', streetNumber: '' },
      usuario: {
        mode: 'none', existingUserId: null,
        newUser: { firstName: '', lastName: '', email: '', username: '', document: '', roleId: null, branchId: null },
        sections: [],
      },
    });
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
    this.direccionGroup.patchValue({
      street: e.address?.street ?? '', streetNumber: e.address?.streetNumber ?? '',
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
    const dir = this.direccionGroup.getRawValue() as { street: string; streetNumber: string };
    const street = (dir.street ?? '').trim();
    const req: CreateEmployeeRequest = {
      firstName: d.firstName, lastName: d.lastName, document: d.document,
      isBiochemist: d.isBiochemist, registration: d.registration?.trim() ? d.registration.trim() : null,
      address: street ? { street, streetNumber: (dir.streetNumber ?? '').trim() || undefined } : null,
    };
    const rows = this.filledContacts();
    const editId = this.id();

    if (!editId) {
      const contacts: EmployeeContactInput[] = rows.map((r) => ({ contactType: r.contactType, value: r.value.trim() }));
      const u = this.usuarioGroup.getRawValue() as {
        mode: string; existingUserId: number | null;
        newUser: { firstName: string; lastName: string; email: string; username: string; document: string; roleId: number | null; branchId: number | null };
        sections: AccessSection[];
      };
      if (u.mode === 'new') {
        const userPayload: CrearUsuarioPayload = {
          firstName: u.newUser.firstName.trim(),
          lastName: u.newUser.lastName.trim(),
          email: u.newUser.email.trim(),
          username: u.newUser.username.trim(),
          document: u.newUser.document.trim(),
          roleIds: u.newUser.roleId != null ? [u.newUser.roleId] : [],
          sections: u.sections ?? [],
          branchId: u.newUser.branchId!,
        };
        this.store.dispatch(createEmployeeWithUser({ userPayload, req, contacts }));
        return;
      }
      const createReq: CreateEmployeeRequest = u.mode === 'existing' && u.existingUserId != null
        ? { ...req, userId: u.existingUserId } : req;
      this.store.dispatch(addEmployee({ req: createReq, contacts }));
      return;
    }

    // Update: preservamos el userId actual (el alta/vinculación de usuario solo ocurre en el create).
    const updateReq: UpdateEmployeeRequest = { ...req, userId: this.employee()?.userId ?? null };
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

    this.store.dispatch(updateEmployee({ id: Number(editId), req: updateReq, toCreate, toUpdate, toDelete }));
  }

  private userSummaryLabel(): string {
    if (this.isEdit()) {
      const uid = this.employee()?.userId;
      return uid ? `Usuario vinculado (#${uid})` : 'Sin usuario';
    }
    const mode = this.usuarioMode();
    if (mode === 'existing') {
      const uid = this.usuarioGroup.get('existingUserId')!.value as number | null;
      return uid ? `Usuario existente (#${uid})` : 'Usuario existente (sin seleccionar)';
    }
    if (mode === 'new') {
      const username = (this.usuarioGroup.get('newUser.username')!.value as string) || '';
      return username ? `Nuevo usuario (${username})` : 'Nuevo usuario';
    }
    return 'Sin usuario';
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
