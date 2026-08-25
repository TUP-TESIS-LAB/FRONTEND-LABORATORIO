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
import { humanizeBackendError } from '@shared/utils/error-messages';
import {
  addDoctor, addDoctorSuccess, updateDoctor, updateDoctorSuccess,
  loadDoctor, clearSelectedDoctor,
} from '../../store/doctor.actions';
import { selectDoctorPending, selectDoctorError, selectSelectedDoctor } from '../../store/doctor.selectors';
import { CreateDoctorRequest, Doctor, RegistrationType } from '../../models/doctor.model';
import { DOCTOR_FORM_STEPS } from './doctor-form-steps';
import { DatosStepComponent } from './steps/datos-step/datos-step.component';
import { ContactoStepComponent } from './steps/contacto-step/contacto-step.component';
import { FirmaStepComponent } from './steps/firma-step/firma-step.component';
import { ResumenStepComponent, DoctorSummaryView } from './steps/resumen-step/resumen-step.component';

function emptyToNull(v: string | null | undefined): string | null {
  const t = (v ?? '').trim();
  return t ? t : null;
}

@Component({
  selector: 'med-medico-form-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, ButtonModule, ConfirmDialogModule,
    WizardShellComponent, DatosStepComponent, ContactoStepComponent, FirmaStepComponent, ResumenStepComponent,
  ],
  providers: [ConfirmationService],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col h-full">
      <ui-wizard-shell
        [customFooter]="true"
        [steps]="steps"
        [currentIndex]="currentStep()"
        [visited]="visited()"
        (stepSelected)="goToStep($event)">
        @if (saveError(); as err) {
          <div class="mb-3 p-3 rounded" style="background:#fef2f2;border:1px solid var(--ds-danger);color:var(--ds-danger);">
            {{ saveErrorMessage(err) }}
          </div>
        }
        @switch (currentStep()) {
          @case (0) { <med-datos-step [group]="datosGroup" /> }
          @case (1) { <med-contacto-step [group]="contactoGroup" /> }
          @case (2) { <med-firma-step [group]="firmaGroup" /> }
          @case (3) { <med-resumen-step [data]="summaryView()" (editStep)="goToStep($event)" /> }
        }

        <ng-container wizardFooter>
          <span class="text-xs text-surface-400 hidden sm:inline">{{ formStatusLabel() }}</span>
          <div class="flex flex-row-reverse gap-2">
            @if (showSubmitButton()) {
              <p-button [label]="isEdit() ? 'Guardar cambios' : 'Registrar médico'" type="submit"
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
export class MedicoFormPage implements OnDestroy {
  readonly id = input<string | undefined>(undefined);

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly actions$ = inject(Actions);
  private readonly confirm = inject(ConfirmationService);

  readonly steps = DOCTOR_FORM_STEPS;

  readonly pending = this.store.selectSignal(selectDoctorPending);
  readonly saveError = this.store.selectSignal(selectDoctorError);
  readonly doctor = this.store.selectSignal(selectSelectedDoctor);

  readonly form: FormGroup = this.fb.group({
    datos: this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      tuition: ['', Validators.required],
      registrationType: [null as RegistrationType | null, Validators.required],
      specialty: [''],
      institution: [''],
    }),
    contacto: this.fb.group({
      email: ['', Validators.email],
      phone: [''],
      street: [''],
      streetNumber: [''],
    }),
    firma: this.fb.group({
      signature: [null as string | null],
    }),
  });

  readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  readonly isEdit = computed(() => { const v = this.id(); return v != null && v !== ''; });

  readonly datosValid = computed(() => { void this.value(); void this.status(); return this.datosGroup.valid; });
  readonly contactoValid = computed(() => { void this.value(); void this.status(); return this.contactoGroup.valid; });

  readonly currentStep = signal(0);
  readonly visited = signal<ReadonlySet<number>>(new Set([0]));

  readonly isFirstStep = computed(() => this.currentStep() === 0);
  readonly isLastStep = computed(() => this.currentStep() === this.steps.length - 1);

  readonly canContinue = computed(() => {
    switch (this.currentStep()) {
      case 0: return this.datosValid();
      case 1: return this.contactoValid();
      default: return true;
    }
  });
  readonly canSubmit = computed(() =>
    this.datosValid() && this.contactoValid() && !this.pending() && (this.isEdit() || this.isLastStep()));
  readonly showContinueButton = computed(() => !this.isLastStep() && !this.isEdit());
  readonly showSubmitButton = computed(() => this.isEdit() || this.isLastStep());

  readonly formStatusLabel = computed(() => {
    if (this.pending()) return 'Guardando…';
    void this.value();
    return this.form.dirty ? '● Cambios sin guardar' : 'Sin cambios';
  });

  readonly summaryView = computed<DoctorSummaryView>(() => {
    void this.value();
    const d = this.datosGroup.getRawValue();
    const c = this.contactoGroup.getRawValue();
    const f = this.firmaGroup.getRawValue();
    return {
      firstName: d.firstName, lastName: d.lastName, tuition: d.tuition, registrationType: d.registrationType,
      specialty: d.specialty, institution: d.institution,
      email: c.email, phone: c.phone, street: c.street, streetNumber: c.streetNumber,
      signature: f.signature,
    };
  });

  get datosGroup(): FormGroup { return this.form.get('datos') as FormGroup; }
  get contactoGroup(): FormGroup { return this.form.get('contacto') as FormGroup; }
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
      if (Number.isNaN(numericId)) { this.router.navigate(['/medicos']); return; }
      if (this.hydratedForId !== id) { this.store.dispatch(loadDoctor({ id: numericId })); this.hydratedForId = id; }
    });

    effect(() => {
      const d = this.doctor();
      if (this.isEdit() && d && String(d.id) === this.id()) {
        this.hydrate(d);
        this.visited.set(new Set([0, 1, 2, 3]));
      }
    });

    this.actions$.pipe(ofType(addDoctorSuccess, updateDoctorSuccess), takeUntilDestroyed())
      .subscribe(() => this.router.navigateByUrl('/medicos'));
  }

  goNext(): void {
    if (!this.canContinue()) {
      if (this.currentStep() === 0) this.datosGroup.markAllAsTouched();
      if (this.currentStep() === 1) this.contactoGroup.markAllAsTouched();
      return;
    }
    const next = Math.min(this.currentStep() + 1, this.steps.length - 1);
    this.currentStep.set(next);
    this.visited.update((s) => new Set(s).add(next));
  }
  goBack(): void { this.currentStep.set(Math.max(this.currentStep() - 1, 0)); }
  goToStep(i: number): void { if (this.visited().has(i)) this.currentStep.set(i); }

  private resetForCreate(): void {
    this.form.reset({
      datos: { firstName: '', lastName: '', tuition: '', registrationType: null, specialty: '', institution: '' },
      contacto: { email: '', phone: '', street: '', streetNumber: '' },
      firma: { signature: null },
    });
    this.currentStep.set(0);
    this.visited.set(new Set([0]));
  }

  private hydrate(d: Doctor): void {
    this.form.patchValue({
      datos: {
        firstName: d.firstName, lastName: d.lastName, tuition: d.tuition, registrationType: d.registrationType,
        specialty: d.specialty ?? '', institution: d.institution ?? '',
      },
      contacto: {
        email: d.email ?? '', phone: d.phone ?? '',
        street: d.address?.street ?? '', streetNumber: d.address?.streetNumber ?? '',
      },
      firma: { signature: d.signature ?? null },
    });
    this.form.markAsPristine();
  }

  saveErrorMessage(err: { status?: number; error?: { message?: string } }): string {
    return humanizeBackendError(err, {
      fallback: 'No se pudo guardar el médico.',
      byStatus: {
        409: 'Ya existe un médico con esa matrícula.',
        400: 'Algunos datos del médico no son válidos. Revisalos e intentá de nuevo.',
        422: 'Algunos datos del médico no son válidos. Revisalos e intentá de nuevo.',
        500: 'No se pudo guardar el médico. Intentá de nuevo en unos minutos.',
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
      firstName: string; lastName: string; tuition: string; registrationType: RegistrationType;
      specialty: string; institution: string;
    };
    const c = this.contactoGroup.getRawValue() as {
      email: string; phone: string; street: string; streetNumber: string;
    };
    const f = this.firmaGroup.getRawValue() as { signature: string | null };
    const street = (c.street ?? '').trim();
    const req: CreateDoctorRequest = {
      firstName: d.firstName, lastName: d.lastName, tuition: d.tuition, registrationType: d.registrationType,
      specialty: emptyToNull(d.specialty), institution: emptyToNull(d.institution),
      email: emptyToNull(c.email), phone: emptyToNull(c.phone),
      signature: f.signature || null,
      address: street ? { street, streetNumber: emptyToNull(c.streetNumber) } : null,
    };
    const editId = this.id();
    if (editId) this.store.dispatch(updateDoctor({ id: Number(editId), req }));
    else this.store.dispatch(addDoctor({ req }));
  }

  onBack(): void {
    if (!this.form.dirty) { this.router.navigate(['/medicos']); return; }
    this.confirm.confirm({
      header: '¿Descartar cambios?',
      message: 'Vas a perder los cambios sin guardar.',
      acceptLabel: 'Descartar', rejectLabel: 'Seguir editando',
      accept: () => this.router.navigate(['/medicos']),
    });
  }

  ngOnDestroy(): void { this.store.dispatch(clearSelectedDoctor()); }
}
