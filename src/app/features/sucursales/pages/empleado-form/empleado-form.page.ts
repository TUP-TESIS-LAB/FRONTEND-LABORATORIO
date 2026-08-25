import {
  ChangeDetectionStrategy, Component, computed, effect, HostListener, inject, input, OnDestroy, signal,
} from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Actions, ofType } from '@ngrx/effects';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
  CreateEmployeeRequest, Employee, EmployeeContact, EmployeeContactInput, UpdateEmployeeRequest,
} from '../../models/employee.model';
import { Address } from '../../models/address.model';
import { CrearUsuarioPayload } from '@features/empresa/models/usuario.model';
import { AccessSection } from '@core/access/access.model';
import { EmployeeService } from '../../services/employee.service';
import { buildEmployeeFormSteps } from './employee-form-steps';
import { DatosStepComponent } from './steps/datos-step/datos-step.component';
import { UsuarioStepComponent } from './steps/usuario-step/usuario-step.component';
import { FirmaStepComponent } from './steps/firma-step/firma-step.component';
import { ResumenStepComponent, EmployeeSummaryView } from './steps/resumen-step/resumen-step.component';

interface DatosValue {
  firstName: string; lastName: string; document: string; registration: string; isBiochemist: boolean;
  email: string; mobile: string;
}
interface DireccionValue { street: string; streetNumber: string; neighborhood: string; city: string; province: string; }

@Component({
  selector: 'emp-empleado-form-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, ButtonModule, ConfirmDialogModule,
    WizardShellComponent, DatosStepComponent, UsuarioStepComponent, FirmaStepComponent, ResumenStepComponent,
  ],
  providers: [ConfirmationService],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col h-full">
      <ui-wizard-shell
        [customFooter]="true"
        [steps]="steps()"
        [currentIndex]="currentStep()"
        [visited]="visited()"
        (stepSelected)="goToStep($event)">
        @switch (currentStepKey()) {
          @case ('datos') { <emp-datos-step [group]="datosGroup" [addressGroup]="direccionGroup" /> }
          @case ('usuario') {
            <emp-usuario-step [group]="usuarioGroup" [mode]="usuarioMode()"
                              [isEdit]="isEdit()" [currentUserId]="employee()?.userId ?? null"
                              [identity]="usuarioPreload()" />
          }
          @case ('firma') { <emp-firma-step [group]="firmaGroup" /> }
          @case ('resumen') { <emp-resumen-step [data]="summaryView()" (editStep)="goToStep($event)" /> }
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
      <p-confirmDialog [draggable]="false" />
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
  private readonly employeeService = inject(EmployeeService);

  /** El paso "Firma" solo aplica a bioquímicos; los pasos son dinámicos por rol. */
  readonly isBiochemist = computed<boolean>(() => {
    void this.value();
    return !!this.datosGroup.get('isBiochemist')!.value;
  });
  readonly steps = computed(() => buildEmployeeFormSteps(this.isBiochemist()));
  readonly currentStepKey = computed<string>(() => this.steps()[this.currentStep()]?.key ?? 'datos');

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
      // Contacto: 2 campos fijos (ocultan los 6 tipos del back); mapean a EMAIL/MOBILE.
      email: ['', [Validators.email]],
      mobile: [''],
    }),
    // Dirección texto-libre, igual a paciente.
    direccion: this.fb.group({
      street: [''], streetNumber: [''], neighborhood: [''], city: [''], province: [''],
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
    firma: this.fb.group({
      signature: [null as string | null],
    }),
  });

  readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  readonly isEdit = computed(() => { const v = this.id(); return v != null && v !== ''; });

  readonly datosValid = computed(() => { void this.value(); void this.status(); return this.datosGroup.valid; });
  readonly usuarioMode = computed<string>(() => { void this.value(); return this.usuarioGroup.get('mode')!.value as string; });

  /** Identidad del empleado para precargar el usuario nuevo (nombre/apellido/documento; NO email). */
  readonly usuarioPreload = computed<{ firstName: string; lastName: string; document: string }>(() => {
    void this.value();
    const d = this.datosGroup.getRawValue() as DatosValue;
    return { firstName: d.firstName ?? '', lastName: d.lastName ?? '', document: d.document ?? '' };
  });

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
  readonly isLastStep = computed(() => this.currentStep() === this.steps().length - 1);

  readonly canContinue = computed(() => {
    switch (this.currentStepKey()) {
      case 'datos': return this.datosValid();
      case 'usuario': return this.usuarioValid();
      default: return true;
    }
  });
  readonly canSubmit = computed(() =>
    this.datosValid() && this.usuarioValid() && !this.pending() && (this.isEdit() || this.isLastStep()));
  readonly showContinueButton = computed(() => !this.isLastStep() && !this.isEdit());
  readonly showSubmitButton = computed(() => this.isEdit() || this.isLastStep());

  readonly formStatusLabel = computed(() => {
    if (this.pending()) return 'Guardando…';
    void this.value();
    return this.form.dirty ? '● Cambios sin guardar' : 'Sin cambios';
  });

  readonly summaryView = computed<EmployeeSummaryView>(() => {
    void this.value();
    const d = this.datosGroup.getRawValue() as DatosValue;
    const dir = this.direccionGroup.getRawValue() as DireccionValue;
    return {
      firstName: d.firstName, lastName: d.lastName, document: d.document,
      registration: d.registration || null, isBiochemist: d.isBiochemist,
      email: d.email?.trim() || null, mobile: d.mobile?.trim() || null,
      street: dir.street?.trim() || null, streetNumber: dir.streetNumber?.trim() || null,
      neighborhood: dir.neighborhood?.trim() || null, city: dir.city?.trim() || null, province: dir.province?.trim() || null,
      userLabel: this.userSummaryLabel(),
      signature: d.isBiochemist ? (this.firmaGroup.get('signature')!.value as string | null) : null,
    };
  });

  get datosGroup(): FormGroup { return this.form.get('datos') as FormGroup; }
  get direccionGroup(): FormGroup { return this.form.get('direccion') as FormGroup; }
  get usuarioGroup(): FormGroup { return this.form.get('usuario') as FormGroup; }
  get firmaGroup(): FormGroup { return this.form.get('firma') as FormGroup; }

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
        // En edición todos los pasos son navegables; el set cubre el total actual
        // (que puede incluir o no el paso "firma" según el rol cargado).
        this.visited.set(new Set(this.steps().map((_, i) => i)));
      }
    });

    // El paso "Firma" solo existe para bioquímicos. Al desactivar isBiochemist:
    // limpiar la firma (evita firma huérfana) y clamprear el paso actual para
    // que no quede apuntando a un índice que ya no existe.
    effect(() => {
      const isBio = this.isBiochemist();
      if (!isBio && this.firmaGroup.get('signature')!.value != null) {
        this.firmaGroup.get('signature')!.setValue(null);
      }
      const lastIndex = this.steps().length - 1;
      if (this.currentStep() > lastIndex) this.currentStep.set(lastIndex);
      // Mantener navegables todos los pasos visitados existentes dentro del rango.
      this.visited.update((s) => new Set([...s].filter((i) => i <= lastIndex)));
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
      if (this.currentStepKey() === 'datos') this.datosGroup.markAllAsTouched();
      if (this.currentStepKey() === 'usuario') this.usuarioGroup.markAllAsTouched();
      return;
    }
    const next = Math.min(this.currentStep() + 1, this.steps().length - 1);
    this.currentStep.set(next);
    this.visited.update((s) => new Set(s).add(next));
  }
  goBack(): void { this.currentStep.set(Math.max(this.currentStep() - 1, 0)); }
  goToStep(i: number): void { if (this.visited().has(i)) this.currentStep.set(i); }

  private resetForCreate(): void {
    this.form.reset({
      datos: { firstName: '', lastName: '', document: '', registration: '', isBiochemist: false, email: '', mobile: '' },
      direccion: { street: '', streetNumber: '', neighborhood: '', city: '', province: '' },
      usuario: {
        mode: 'none', existingUserId: null,
        newUser: { firstName: '', lastName: '', email: '', username: '', document: '', roleId: null, branchId: null },
        sections: [],
      },
      firma: { signature: null },
    });
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
      neighborhood: e.address?.neighborhood ?? '', city: e.address?.city ?? '', province: e.address?.province ?? '',
    });
    // La firma (base64) ya NO viaja en el GET del empleado por seguridad. Si el empleado
    // tiene firma cargada, la pedimos al endpoint admin `/{id}/signature` para precargarla
    // en edición; si no, dejamos null. Best-effort: ante error dejamos el campo vacío.
    if (e.hasSignature) {
      this.employeeService.getSignature(e.id).subscribe({
        next: ({ signature }) => {
          // Solo precargar si seguimos editando el mismo empleado (evita pisar otro form).
          if (this.isEdit() && String(e.id) === this.id()) {
            this.firmaGroup.patchValue({ signature: signature ?? null });
            this.firmaGroup.markAsPristine();
          }
        },
        error: () => {
          if (this.isEdit() && String(e.id) === this.id()) {
            this.firmaGroup.patchValue({ signature: null });
          }
        },
      });
    } else {
      this.firmaGroup.patchValue({ signature: null });
    }
    this.form.markAsPristine();
  }

  /** En edición precarga email/celular desde los contactos EMAIL/MOBILE existentes. */
  private hydrateContacts(list: EmployeeContact[]): void {
    this.originalContacts = list;
    const email = list.find((c) => c.contactType === 'EMAIL')?.value ?? '';
    const mobile = list.find((c) => c.contactType === 'MOBILE')?.value ?? '';
    this.datosGroup.patchValue({ email, mobile });
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
    const d = this.datosGroup.getRawValue() as DatosValue;
    const address = this.buildAddress();
    // La firma solo viaja para bioquímicos, y solo si la cargó él mismo (dibujada, subida o
    // texto elegido por él). NO se genera ninguna firma automática: una firma es un acto que el
    // empleado debe realizar. Sin firma cargada, el back rechaza el intento de firmar un estudio
    // ("El empleado no tiene firma electrónica registrada").
    const signature = d.isBiochemist ? (this.firmaGroup.get('signature')!.value as string | null) : null;
    const req: CreateEmployeeRequest = {
      firstName: d.firstName, lastName: d.lastName, document: d.document,
      isBiochemist: d.isBiochemist, registration: d.registration?.trim() ? d.registration.trim() : null,
      address, signature: signature || null,
    };
    const email = d.email?.trim() ?? '';
    const mobile = d.mobile?.trim() ?? '';
    const editId = this.id();

    if (!editId) {
      const contacts: EmployeeContactInput[] = [];
      if (email) contacts.push({ contactType: 'EMAIL', value: email });
      if (mobile) contacts.push({ contactType: 'MOBILE', value: mobile });
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
    const { toCreate, toUpdate, toDelete } = this.reconcileContacts(email, mobile);
    this.store.dispatch(updateEmployee({ id: Number(editId), req: updateReq, toCreate, toUpdate, toDelete }));
  }

  private buildAddress(): Address | null {
    const dir = this.direccionGroup.getRawValue() as DireccionValue;
    const street = (dir.street ?? '').trim();
    const streetNumber = (dir.streetNumber ?? '').trim();
    const neighborhood = (dir.neighborhood ?? '').trim();
    const city = (dir.city ?? '').trim();
    const province = (dir.province ?? '').trim();
    if (!street && !streetNumber && !neighborhood && !city && !province) return null;
    return {
      street: street || undefined, streetNumber: streetNumber || undefined,
      neighborhood: neighborhood || undefined, city: city || undefined, province: province || undefined,
    };
  }

  /**
   * Upsert acotado a EMAIL + MOBILE desde los 2 campos fijos. NO toca contactos de otros
   * tipos (PHONE/WHATSAPP/etc.) preexistentes — quedan como estaban.
   */
  private reconcileContacts(email: string, mobile: string): {
    toCreate: EmployeeContactInput[];
    toUpdate: { contactId: number; input: EmployeeContactInput }[];
    toDelete: number[];
  } {
    const toCreate: EmployeeContactInput[] = [];
    const toUpdate: { contactId: number; input: EmployeeContactInput }[] = [];
    const toDelete: number[] = [];
    const reconcileType = (type: 'EMAIL' | 'MOBILE', value: string) => {
      const orig = this.originalContacts.find((c) => c.contactType === type);
      if (value) {
        if (!orig) toCreate.push({ contactType: type, value });
        else if (orig.value !== value) toUpdate.push({ contactId: orig.id, input: { contactType: type, value } });
      } else if (orig) {
        toDelete.push(orig.id);
      }
    };
    reconcileType('EMAIL', email);
    reconcileType('MOBILE', mobile);
    return { toCreate, toUpdate, toDelete };
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
