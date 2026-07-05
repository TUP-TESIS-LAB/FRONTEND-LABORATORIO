import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { AutoCompleteModule, AutoCompleteCompleteEvent, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { take } from 'rxjs';

import { WizardShellComponent } from '@shared/ui/components/wizard-shell/wizard-shell.component';
import { FormStep } from '@shared/ui/models/form-step';
import { PatientSearchAutocompleteComponent } from '@features/pacientes/components/patient-search-autocomplete/patient-search-autocomplete.component';
import { Patient } from '@features/pacientes/models/patient.model';
import { AnalysisPickerComponent, PickerRow } from '@features/analitica/components/analysis-picker/analysis-picker.component';
import { EmployeeService } from '@features/sucursales/services/employee.service';
import { Employee } from '@features/sucursales/models/employee.model';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';

import { createHomeVisit, createHomeVisitSuccess, createHomeVisitFailure } from '../../store/home-visit.actions';
import { selectHomeVisitsPending } from '../../store/home-visit.selectors';

/**
 * Convierte un Date a string ISO local (sin zona) para el backend LocalDateTime.
 * `toISOString()` usa UTC y puede desplazar la fecha un día en GMT-3.
 */
function toLocalDateTimeString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

const STEPS: readonly FormStep[] = [
  { key: 'paciente', title: 'Paciente y horario', subtitle: 'Identificación del paciente, fecha y ventana horaria' },
  { key: 'direccion', title: 'Domicilio y análisis', subtitle: 'Dirección de la visita, extractor y análisis' },
];

@Component({
  selector: 'dom-nueva-visita-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    WizardShellComponent,
    PatientSearchAutocompleteComponent,
    AnalysisPickerComponent,
    AutoCompleteModule,
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    TextareaModule,
  ],
  styles: [`
    .nv-field { display: flex; flex-direction: column; gap: 4px; }
    .nv-field label { font-size: 14px; font-weight: 500; color: var(--ds-text); }
    .nv-field .nv-hint { font-size: 12px; color: var(--ds-text-muted); margin-top: 2px; }
    .nv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
    .nv-grid-3 { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: var(--space-4); }
    .nv-section { display: flex; flex-direction: column; gap: var(--space-4); }
    .nv-req { color: var(--color-danger, #ef4444); margin-left: 2px; }
  `],
  template: `
    <ui-wizard-shell
      heading="Nueva visita domiciliaria"
      [steps]="STEPS"
      [currentIndex]="currentIndex()"
      [visited]="visited()"
      [clickable]="true"
      continueLabel="Continuar"
      finishLabel="Agendar visita"
      [finishDisabled]="!step1Valid() || pending()"
      [finishLoading]="pending()"
      [continueDisabled]="!step0Valid()"
      (stepSelected)="goTo($event)"
      (next)="next()"
      (back)="prev()"
      (cancel)="cancel()"
      (finish)="onFinish()">

      <!-- ─── Paso 0: Paciente + Fecha + Horario ─── -->
      @if (currentIndex() === 0) {
        <div class="nv-section">
          <!-- Paciente (obligatorio) -->
          <div class="nv-field">
            <label>
              Paciente<span class="nv-req" aria-hidden="true">*</span>
            </label>
            <pat-search-autocomplete (selected)="onPatientSelected($event)" />
            @if (selectedPatient()) {
              <div class="nv-hint">
                Seleccionado: <strong>{{ selectedPatient()!.lastName }}, {{ selectedPatient()!.firstName }}</strong>
                — DNI {{ selectedPatient()!.dni }}
              </div>
            }
            @if (step0Touched() && !selectedPatient()) {
              <div class="text-xs" style="color: var(--color-danger, #ef4444);">
                El paciente es obligatorio.
              </div>
            }
          </div>

          <!-- Fecha de la visita (obligatorio) -->
          <div class="nv-field">
            <label for="scheduledAt">
              Fecha de la visita<span class="nv-req" aria-hidden="true">*</span>
            </label>
            <p-datepicker
              inputId="scheduledAt"
              [formControl]="form.controls.scheduledAt"
              dateFormat="dd/mm/yy"
              [showIcon]="true"
              [minDate]="today"
              appendTo="body" />
            @if (ctrl('scheduledAt').touched && ctrl('scheduledAt').invalid) {
              <div class="text-xs" style="color: var(--color-danger, #ef4444);">
                La fecha de la visita es obligatoria.
              </div>
            }
          </div>

          <!-- Ventana horaria (obligatoria) -->
          <div class="nv-grid">
            <div class="nv-field">
              <label for="timeWindowStart">
                Hora de inicio<span class="nv-req" aria-hidden="true">*</span>
              </label>
              <input
                pInputText
                id="timeWindowStart"
                type="time"
                [formControl]="form.controls.timeWindowStart" />
              @if (ctrl('timeWindowStart').touched && ctrl('timeWindowStart').invalid) {
                <div class="text-xs" style="color: var(--color-danger, #ef4444);">
                  La hora de inicio es obligatoria.
                </div>
              }
            </div>
            <div class="nv-field">
              <label for="timeWindowEnd">
                Hora de fin<span class="nv-req" aria-hidden="true">*</span>
              </label>
              <input
                pInputText
                id="timeWindowEnd"
                type="time"
                [formControl]="form.controls.timeWindowEnd" />
              @if (ctrl('timeWindowEnd').touched && ctrl('timeWindowEnd').invalid) {
                <div class="text-xs" style="color: var(--color-danger, #ef4444);">
                  La hora de fin es obligatoria.
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- ─── Paso 1: Dirección + Extractor + Análisis + Comentarios ─── -->
      @if (currentIndex() === 1) {
        <div class="nv-section">
          <!-- Dirección -->
          <div class="nv-grid-3">
            <div class="nv-field">
              <label for="addressStreet">
                Calle<span class="nv-req" aria-hidden="true">*</span>
              </label>
              <input
                pInputText
                id="addressStreet"
                [formControl]="form.controls.addressStreet" />
              @if (ctrl('addressStreet').touched && ctrl('addressStreet').invalid) {
                <div class="text-xs" style="color: var(--color-danger, #ef4444);">
                  La calle es obligatoria.
                </div>
              }
            </div>
            <div class="nv-field">
              <label for="addressNumber">Número</label>
              <input
                pInputText
                id="addressNumber"
                [formControl]="form.controls.addressNumber" />
            </div>
            <div class="nv-field">
              <label for="addressCity">
                Ciudad<span class="nv-req" aria-hidden="true">*</span>
              </label>
              <input
                pInputText
                id="addressCity"
                [formControl]="form.controls.addressCity" />
              @if (ctrl('addressCity').touched && ctrl('addressCity').invalid) {
                <div class="text-xs" style="color: var(--color-danger, #ef4444);">
                  La ciudad es obligatoria.
                </div>
              }
            </div>
          </div>

          <!-- Referencias de la dirección -->
          <div class="nv-field">
            <label for="addressReferences">Referencias / indicaciones de acceso</label>
            <input
              pInputText
              id="addressReferences"
              [formControl]="form.controls.addressReferences" />
          </div>

          <!-- Extractor asignado (opcional, autocomplete por nombre) -->
          <div class="nv-field">
            <label for="extractorSearch">Extractor asignado (opcional)</label>
            <p-autocomplete
              inputId="extractorSearch"
              [suggestions]="extractorSuggestions()"
              (completeMethod)="onExtractorSearch($event)"
              (onSelect)="onExtractorSelect($event)"
              (onClear)="onExtractorClear()"
              [delay]="200"
              optionLabel="displayName"
              [forceSelection]="true"
              appendTo="body">
              <ng-template let-emp pTemplate="item">
                <div>{{ emp.lastName }}, {{ emp.firstName }}</div>
              </ng-template>
            </p-autocomplete>
            @if (selectedExtractor()) {
              <div class="nv-hint">
                Asignado: <strong>{{ selectedExtractor()!.lastName }}, {{ selectedExtractor()!.firstName }}</strong>
              </div>
            }
          </div>

          <!-- Análisis / determinaciones -->
          <div class="nv-field">
            <label>Análisis / determinaciones (opcional)</label>
            <lab-analysis-picker
              (analysisAdded)="onAnalysisAdded($event)"
              (analysisRemoved)="onAnalysisRemoved($event)"
              [isParticular]="true" />
          </div>

          <!-- Comentarios -->
          <div class="nv-field">
            <label for="comments">Comentarios</label>
            <textarea
              pTextarea
              id="comments"
              rows="3"
              [formControl]="form.controls.comments">
            </textarea>
          </div>
        </div>
      }

    </ui-wizard-shell>
  `,
})
export class NuevaVisitaPage implements OnInit {
  protected readonly STEPS = STEPS;
  protected readonly router = inject(Router);

  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly employeeService = inject(EmployeeService);
  private readonly branchCtx = inject(OperatorBranchContextService);

  readonly pending = this.store.selectSignal(selectHomeVisitsPending);

  // ── Wizard navigation ──────────────────────────────────────────────────────
  readonly currentIndex = signal(0);
  readonly visited = signal<ReadonlySet<number>>(new Set([0]));

  // ── Form ───────────────────────────────────────────────────────────────────
  readonly form = this.fb.group({
    scheduledAt:        this.fb.control<Date | null>(null, Validators.required),
    timeWindowStart:    this.fb.control('', Validators.required),
    timeWindowEnd:      this.fb.control('', Validators.required),
    addressStreet:      this.fb.control('', Validators.required),
    addressNumber:      this.fb.control(''),
    addressCity:        this.fb.control('', Validators.required),
    addressReferences:  this.fb.control(''),
    comments:           this.fb.control(''),
  });

  /**
   * Espejo del valor del form como signal. Los `computed` de validez (step0Valid /
   * step1Valid) leen `form.controls.X.value`, que NO son signals: sin esto el computed
   * solo se re-evaluaba al cambiar `selectedPatient()` y quedaba stale cuando se
   * completaban fecha/horas/dirección después del paciente -> "Continuar" no se
   * habilitaba nunca (no se podía pasar del primer paso).
   */
  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  // ── State ──────────────────────────────────────────────────────────────────
  readonly selectedPatient  = signal<Patient | null>(null);
  readonly selectedExtractor = signal<Employee | null>(null);
  readonly extractorSuggestions = signal<Employee[]>([]);
  readonly step0Touched = signal(false);

  private allEmployees: Employee[] = [];
  private selectedAnalyses: PickerRow[] = [];

  readonly today = new Date();

  // ── Computed validity ──────────────────────────────────────────────────────
  /** Paso 0 válido: paciente seleccionado + fecha + ventana horaria. */
  readonly step0Valid = computed(() => {
    this.formValue(); // dependencia reactiva: recomputar cuando cambia cualquier control del form
    const f = this.form.controls;
    return (
      !!this.selectedPatient() &&
      !!f.scheduledAt.value &&
      !!f.timeWindowStart.value &&
      !!f.timeWindowEnd.value
    );
  });

  /** Paso 1 válido: dirección obligatoria (calle + ciudad). */
  readonly step1Valid = computed(() => {
    this.formValue(); // dependencia reactiva (ver step0Valid)
    const f = this.form.controls;
    return (
      this.step0Valid() &&
      f.addressStreet.value.trim().length > 0 &&
      f.addressCity.value.trim().length > 0
    );
  });

  ngOnInit(): void {
    // Precargamos la lista de empleados para el autocomplete de extractor.
    this.employeeService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => {
        this.allEmployees = list.filter((e) => e.active);
      });
  }

  // ── Step navigation ────────────────────────────────────────────────────────
  goTo(i: number): void {
    // Solo permite saltar a pasos ya visitados, igual que el patrón del repo.
    if (this.visited().has(i)) this.currentIndex.set(i);
  }

  next(): void {
    this.step0Touched.set(true);
    if (!this.step0Valid()) return;
    const next = 1;
    this.visited.update((s) => new Set([...s, next]));
    this.currentIndex.set(next);
  }

  prev(): void {
    if (this.currentIndex() > 0) this.currentIndex.update((i) => i - 1);
  }

  cancel(): void {
    this.router.navigate(['/domicilio/agenda']);
  }

  // ── Patient search ─────────────────────────────────────────────────────────
  onPatientSelected(p: Patient): void {
    this.selectedPatient.set(p);
  }

  // ── Extractor autocomplete ─────────────────────────────────────────────────
  onExtractorSearch(e: AutoCompleteCompleteEvent): void {
    const q = (e.query ?? '').trim().toLowerCase();
    if (!q) {
      this.extractorSuggestions.set(this.allEmployees.slice(0, 10));
      return;
    }
    const filtered = this.allEmployees.filter(
      (emp) =>
        emp.firstName.toLowerCase().includes(q) ||
        emp.lastName.toLowerCase().includes(q),
    );
    this.extractorSuggestions.set(filtered.slice(0, 10));
  }

  onExtractorSelect(e: AutoCompleteSelectEvent): void {
    this.selectedExtractor.set(e.value as Employee);
  }

  onExtractorClear(): void {
    this.selectedExtractor.set(null);
  }

  // ── Analysis picker ────────────────────────────────────────────────────────
  onAnalysisAdded(row: PickerRow): void {
    this.selectedAnalyses = [...this.selectedAnalyses, row];
  }

  onAnalysisRemoved(id: number): void {
    this.selectedAnalyses = this.selectedAnalyses.filter((r) => r.id !== id);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  /** Llamado por el WizardShell en el último paso al presionar "Agendar visita". */
  protected onFinish(): void {
    this.submit();
  }

  private submit(): void {
    if (!this.step1Valid()) {
      this.form.markAllAsTouched();
      return;
    }

    const patient = this.selectedPatient()!;
    const f = this.form.getRawValue();
    const branchId = this.branchCtx.branchId() ?? 1;

    const scheduledAtDate = f.scheduledAt as Date;
    // Construcción local-aware: evita el desfase UTC que produce toISOString()
    // en zonas horarias negativas (ej. GMT-3 puede retroceder la fecha un día).
    const scheduledAt = scheduledAtDate
      ? toLocalDateTimeString(scheduledAtDate)
      : '';

    this.store.dispatch(
      createHomeVisit({
        payload: {
          patientId:          patient.id,
          branchId,
          scheduledAt,
          addressStreet:      f.addressStreet.trim(),
          addressNumber:      f.addressNumber.trim() || null,
          addressCity:        f.addressCity.trim(),
          addressReferences:  f.addressReferences.trim() || null,
          timeWindowStart:    f.timeWindowStart,
          timeWindowEnd:      f.timeWindowEnd,
          assignedExtractorId: this.selectedExtractor()?.id ?? null,
          comments:           f.comments.trim() || null,
          determinations: this.selectedAnalyses.map((r, i) => ({
            determinationId: r.id,
            orderNumber:     i + 1,
          })),
        },
      }),
    );

    // Navegar en success; el toast ya lo dispara el effect.
    this.actions$
      .pipe(
        ofType(createHomeVisitSuccess, createHomeVisitFailure),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((action) => {
        if (action.type === createHomeVisitSuccess.type) {
          this.router.navigate(['/domicilio/agenda']);
        }
        // En failure: el effect ya mostró el toast; el form queda editable.
      });
  }

  // ── Helper ────────────────────────────────────────────────────────────────
  ctrl(name: string): AbstractControl {
    return this.form.get(name)!;
  }
}
