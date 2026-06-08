import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal,
} from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { InsurerTypeCode, SpecificData, humanizeInsurerType } from '../../models/insurer.model';
import { WizardCreate, WizardContact, PlanWithAgreement } from '../../models/wizard.model';
import { createObraSocial, createObraSocialSuccess, loadObraSocialCatalogs } from '../../store/obra-social.actions';
import { selectObraSocialCreating, selectNbuOptions } from '../../store/obra-social.selectors';
import { FormStepperHeaderComponent } from '@shared/ui/components/form-stepper-header/form-stepper-header.component';
import { OBRA_SOCIAL_FORM_STEPS } from './obra-social-form-steps';
import { AseguradoraStepComponent } from './steps/aseguradora-step.component';
import { PlanesStepComponent } from './steps/planes-step.component';
import { ResumenStepComponent, ResumenView } from './steps/resumen-step.component';

function isoFromDate(d: unknown): string {
  if (!d) return '';
  if (typeof d === 'string') return d;
  if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return '';
}

@Component({
  selector: 'os-obra-social-form-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [
    ReactiveFormsModule, ButtonModule, ConfirmDialogModule,
    FormStepperHeaderComponent, AseguradoraStepComponent, PlanesStepComponent, ResumenStepComponent,
  ],
  template: `
    <form [formGroup]="form" class="flex flex-col h-full">
      <header class="flex items-center gap-3 px-6 py-3 bg-surface-0 border-b sticky top-0 z-10">
        <p-button [text]="true" icon="pi pi-arrow-left" label="Volver" type="button" (onClick)="onBack()" />
        <h1 class="text-base font-semibold m-0">Nueva obra social</h1>
        <nav class="ml-auto text-xs text-surface-500">Obras Sociales › Nueva</nav>
      </header>

      <ui-form-stepper-header
        [steps]="steps"
        [currentIndex]="currentStep()"
        [visited]="visited()"
        (stepSelected)="goToStep($event)" />

      <div class="flex-1 overflow-y-auto px-8 py-6">
        @switch (currentStep()) {
          @case (0) { <os-aseguradora-step [group]="aseguradoraGroup" /> }
          @case (1) { <os-planes-step [array]="planesArray" [nbuOptions]="nbuOptions()" /> }
          @case (2) { <os-resumen-step [data]="resumenView()" /> }
        }
      </div>

      <footer class="flex items-center gap-3 px-6 py-3 bg-surface-0 border-t sticky bottom-0">
        <span class="text-xs text-surface-400">Paso {{ currentStep() + 1 }} de {{ steps.length }}</span>
        <div class="ml-auto flex flex-row-reverse gap-2">
          @if (isLastStep()) {
            <p-button label="Guardar" type="button" severity="success" [loading]="creating()" [disabled]="!canSubmit()" (onClick)="confirmSave()" />
          } @else {
            <p-button label="Continuar" icon="pi pi-arrow-right" iconPos="right" type="button" [disabled]="!canContinue()" (onClick)="goNext()" />
          }
          @if (!isFirstStep()) {
            <p-button label="Atrás" icon="pi pi-arrow-left" [text]="true" type="button" (onClick)="goBack()" />
          }
          <p-button label="Cancelar" severity="secondary" [outlined]="true" type="button" (onClick)="onBack()" />
        </div>
      </footer>
      <p-confirmDialog />
    </form>
  `,
})
export class ObraSocialFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly actions$ = inject(Actions);
  private readonly confirm = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly steps = OBRA_SOCIAL_FORM_STEPS;
  readonly creating = this.store.selectSignal(selectObraSocialCreating);
  readonly nbuOptions = this.store.selectSignal(selectNbuOptions);

  readonly form: FormGroup = this.fb.group({
    aseguradora: this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(20)]],
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      acronym: ['', [Validators.required, Validators.maxLength(10)]],
      insurerType: ['SOCIAL' as InsurerTypeCode, Validators.required],
      cuit: ['', [Validators.required, Validators.pattern(/^\d{2}-?\d{8}-?\d$/)]],
      authorizationUrl: ['', [Validators.maxLength(255)]],
      description: ['', [Validators.maxLength(255)]],
      phone: [''],
      email: ['', [Validators.email]],
    }),
    planes: this.fb.array<FormGroup>([]),
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  private readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  readonly currentStep = signal(0);
  readonly visited = signal<ReadonlySet<number>>(new Set([0]));

  readonly isFirstStep = computed(() => this.currentStep() === 0);
  readonly isLastStep = computed(() => this.currentStep() === this.steps.length - 1);

  readonly aseguradoraValid = computed(() => {
    void this.value(); void this.status();
    return this.aseguradoraGroup.valid;
  });
  readonly hasPlans = computed(() => {
    void this.value();
    return this.planesArray.length >= 1;
  });

  readonly canContinue = computed(() => {
    if (this.currentStep() === 0) return this.aseguradoraValid();
    if (this.currentStep() === 1) return this.hasPlans();
    return true;
  });
  readonly canSubmit = computed(() => this.aseguradoraValid() && this.hasPlans() && !this.creating());

  get aseguradoraGroup(): FormGroup { return this.form.get('aseguradora') as FormGroup; }
  get planesArray(): FormArray<FormGroup> { return this.form.get('planes') as FormArray<FormGroup>; }

  readonly resumenView = computed<ResumenView>(() => {
    void this.value();
    const a = this.aseguradoraGroup.getRawValue() as {
      code: string; name: string; acronym: string; insurerType: InsurerTypeCode;
      cuit: string; authorizationUrl: string; description: string; phone: string; email: string;
    };
    const contacts: { label: string; value: string }[] = [];
    if (a.phone?.trim()) contacts.push({ label: 'Teléfono', value: a.phone.trim() });
    if (a.email?.trim()) contacts.push({ label: 'Email', value: a.email.trim() });
    const plans = this.planesArray.controls.map((c) => {
      const v = c.getRawValue() as {
        code: string; name: string; acronym: string; validFromDate: string;
        versionNbu: number; ubValue: number; iva: number;
      };
      return {
        code: v.code, name: v.name, acronym: v.acronym, validFromDate: v.validFromDate,
        nbuLabel: this.nbuOptions().find((o) => o.value === Number(v.versionNbu))?.label ?? String(v.versionNbu),
        ubValue: Number(v.ubValue), iva: Number(v.iva),
      };
    });
    return {
      code: a.code, name: a.name, acronym: a.acronym,
      insurerTypeLabel: humanizeInsurerType(a.insurerType), cuit: a.cuit,
      authorizationUrl: a.authorizationUrl, description: a.description,
      contacts, plans,
    };
  });

  ngOnInit(): void {
    this.store.dispatch(loadObraSocialCatalogs());
    this.actions$
      .pipe(ofType(createObraSocialSuccess), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.router.navigate(['/obras-sociales']));
  }

  goNext(): void {
    if (!this.canContinue()) {
      if (this.currentStep() === 0) this.aseguradoraGroup.markAllAsTouched();
      return;
    }
    const next = Math.min(this.currentStep() + 1, this.steps.length - 1);
    this.currentStep.set(next);
    this.visited.update((s) => new Set(s).add(next));
  }
  goBack(): void { this.currentStep.set(Math.max(this.currentStep() - 1, 0)); }
  goToStep(i: number): void { if (this.visited().has(i)) this.currentStep.set(i); }

  private buildPayload(): WizardCreate {
    const a = this.aseguradoraGroup.getRawValue() as {
      code: string; name: string; acronym: string; insurerType: InsurerTypeCode;
      cuit: string; authorizationUrl: string; description: string; phone: string; email: string;
    };
    let specificData: SpecificData | null = null;
    if (a.insurerType === 'SOCIAL') specificData = { socialHealth: { cuit: a.cuit } };
    else if (a.insurerType === 'PRIVATE') specificData = { privateHealth: { cuit: a.cuit, copayPolicy: '' } };

    const contacts: WizardContact[] = [];
    if (a.phone?.trim()) contacts.push({ contactType: 'PHONE', contact: a.phone.trim() });
    if (a.email?.trim()) contacts.push({ contactType: 'EMAIL', contact: a.email.trim() });

    const plans: PlanWithAgreement[] = this.planesArray.controls.map((c) => {
      const v = c.getRawValue() as {
        code: string; name: string; acronym: string; validFromDate: unknown;
        versionNbu: number; ubValue: number; iva: number;
      };
      return {
        plan: { code: v.code, acronym: v.acronym, name: v.name, iva: Number(v.iva) },
        agreement: {
          versionNbu: Number(v.versionNbu), ubValue: Number(v.ubValue),
          validFromDate: isoFromDate(v.validFromDate),
        },
      };
    });

    return {
      insurer: {
        code: a.code, name: a.name, acronym: a.acronym, insurerType: a.insurerType,
        description: a.description || undefined, authorizationUrl: a.authorizationUrl || undefined,
        specificData,
      },
      plans, contacts,
    };
  }

  confirmSave(): void {
    if (!this.canSubmit()) return;
    this.confirm.confirm({
      header: 'Confirmar guardado',
      message: '¿Guardar la obra social y sus planes?',
      acceptLabel: 'Guardar',
      rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(createObraSocial({ payload: this.buildPayload() })),
    });
  }

  onBack(): void {
    if (!this.form.dirty) { this.router.navigate(['/obras-sociales']); return; }
    this.confirm.confirm({
      header: '¿Descartar cambios?',
      message: 'Vas a perder los datos cargados.',
      acceptLabel: 'Descartar',
      rejectLabel: 'Seguir editando',
      accept: () => this.router.navigate(['/obras-sociales']),
    });
  }
}
