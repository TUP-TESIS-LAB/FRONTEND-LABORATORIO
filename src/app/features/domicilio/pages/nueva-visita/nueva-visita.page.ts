import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
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
import { Patient, Address } from '@features/pacientes/models/patient.model';
import { PatientService } from '@features/pacientes/services/patient.service';
import { AnalysisPickerComponent, PickerRow } from '@features/analitica/components/analysis-picker/analysis-picker.component';
import { EmployeeService } from '@features/sucursales/services/employee.service';
import { Employee } from '@features/sucursales/models/employee.model';

/** Empleado + etiqueta lista para mostrar en el autocomplete (optionLabel). */
type ExtractorOption = Employee & { displayName: string };
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

/**
 * Combina la fecha elegida (día) con la hora de inicio de la ventana (`HH:mm`).
 * El `scheduledAt` se arma con la hora de la ventana, NO con la hora del instante
 * en que se abrió el datepicker: agendar hoy con esa hora ya pasada rompía la
 * validación `@Future` del backend (400 "scheduledAt debe ser una fecha futura").
 */
function combineDateAndTime(date: Date, timeHHmm: string): Date {
  const [h, m] = timeHHmm.split(':').map((n) => Number(n));
  const d = new Date(date);
  d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

const STEPS: readonly FormStep[] = [
  { key: 'paciente', title: 'Paciente y horario', subtitle: 'Identificación del paciente, fecha y ventana horaria' },
  { key: 'direccion', title: 'Dirección y extractor', subtitle: 'Dirección de la visita y extractor asignado' },
  { key: 'analisis', title: 'Análisis y comentarios', subtitle: 'Determinaciones a realizar y comentarios' },
  { key: 'resumen', title: 'Confirmación', subtitle: 'Revisá los datos antes de agendar' },
];

@Component({
  selector: 'dom-nueva-visita-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
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
    .nv-summary { gap: var(--space-3); }
    .nv-sum-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-block: var(--space-3);
      border-bottom: 1px solid var(--ds-border, #e5e7eb);
    }
    .nv-sum-row:last-child { border-bottom: none; }
    .nv-sum-row > span:first-child {
      font-size: 12px;
      font-weight: 500;
      color: var(--ds-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .nv-sum-row .nv-hint { color: var(--ds-text-muted); font-size: 13px; }
    .nv-banner {
      display: flex;
      align-items: flex-start;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.4;
    }
    .nv-banner i { margin-top: 1px; }
    .nv-banner--info {
      background: var(--ds-info-bg, #eff6ff);
      color: var(--ds-info, #2563eb);
    }
    .nv-banner--warn {
      background: var(--ds-warning-bg, #fffbeb);
      color: var(--ds-warning-strong, #b45309);
    }
    .nv-link {
      color: var(--brand-primary);
      cursor: pointer;
      font-size: 13px;
      width: fit-content;
    }
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
      [finishDisabled]="!(step0Valid() && step1Valid() && step2Valid()) || pending()"
      [finishLoading]="pending()"
      [continueDisabled]="continueDisabledForStep()"
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
            <a class="nv-link" (click)="goToAltaPaciente()" role="button" tabindex="0">
              ¿No está registrado? Darlo de alta
            </a>
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

      <!-- ─── Paso 1: Dirección + Extractor ─── -->
      @if (currentIndex() === 1) {
        <div class="nv-section">
          <!-- Banner de origen de la dirección (Task 3) -->
          @if (addressSource() === 'prefilled') {
            <div class="nv-banner nv-banner--info">
              <i class="pi pi-info-circle"></i>
              <span>Estás usando la dirección registrada de <strong>{{ prefillPatientName() }}</strong>. Podés modificarla para esta visita.</span>
            </div>
          } @else if (addressSource() === 'edited') {
            <div class="nv-banner nv-banner--warn">
              <i class="pi pi-exclamation-triangle"></i>
              <span>Modificaste la dirección registrada — se usará solo para esta visita.</span>
            </div>
          }

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

          <!-- Extractor asignado (obligatorio: sin extractor la visita no aparece en ninguna ruta) -->
          <div class="nv-field">
            <label for="extractorSearch">
              Extractor asignado<span class="nv-req" aria-hidden="true">*</span>
            </label>
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
            @if (step1Touched() && !selectedExtractor()) {
              <div class="text-xs" style="color: var(--color-danger, #ef4444);">
                Asigná un extractor para esta visita.
              </div>
            }
          </div>
        </div>
      }

      <!-- ─── Paso 2: Análisis + Comentarios ─── -->
      @if (currentIndex() === 2) {
        <div class="nv-section">
          <!-- Análisis / determinaciones (obligatorio: sin análisis no se pueden preparar los rótulos) -->
          <div class="nv-field">
            <label>
              Análisis / determinaciones<span class="nv-req" aria-hidden="true">*</span>
            </label>
            <lab-analysis-picker
              (analysisAdded)="onAnalysisAdded($event)"
              (analysisRemoved)="onAnalysisRemoved($event)"
              [isParticular]="true" />
            @if (step2Touched() && analysesCount() === 0) {
              <div class="text-xs" style="color: var(--color-danger, #ef4444);">
                Agregá al menos un análisis; sin determinaciones no se pueden preparar los rótulos.
              </div>
            }
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

      <!-- ─── Paso 3: Confirmación / resumen ─── -->
      @if (currentIndex() === 3) {
        <div class="nv-section nv-summary">
          <div class="nv-sum-row"><span>Paciente</span>
            <strong>{{ selectedPatient()?.lastName }}, {{ selectedPatient()?.firstName }}</strong>
            <span class="nv-hint">DNI {{ selectedPatient()?.dni }}</span>
          </div>
          <div class="nv-sum-row"><span>Fecha y horario</span>
            <strong>{{ form.controls.scheduledAt.value | date:'dd/MM/yyyy' }}</strong>
            <span>{{ form.controls.timeWindowStart.value }} – {{ form.controls.timeWindowEnd.value }}</span>
          </div>
          <div class="nv-sum-row"><span>Dirección</span>
            <strong>{{ form.controls.addressStreet.value }} {{ form.controls.addressNumber.value }}</strong>
            <span>{{ form.controls.addressCity.value }}</span>
            @if (form.controls.addressReferences.value) { <span class="nv-hint">{{ form.controls.addressReferences.value }}</span> }
            @if (addressSource() === 'prefilled') {
              <span class="nv-hint">Dirección registrada del paciente</span>
            } @else if (addressSource() === 'edited') {
              <span class="nv-hint">Modificada para esta visita</span>
            }
          </div>
          <div class="nv-sum-row"><span>Extractor</span>
            <strong>{{ selectedExtractor() ? (selectedExtractor()!.lastName + ', ' + selectedExtractor()!.firstName) : 'Sin asignar' }}</strong>
          </div>
          <div class="nv-sum-row"><span>Análisis</span>
            <strong>{{ analysesCount() > 0 ? (analysesCount() + ' determinación(es)') : 'Ninguno' }}</strong>
          </div>
          @if (form.controls.comments.value) {
            <div class="nv-sum-row"><span>Comentarios</span><span>{{ form.controls.comments.value }}</span></div>
          }
        </div>
      }

    </ui-wizard-shell>
  `,
})
export class NuevaVisitaPage implements OnInit {
  protected readonly STEPS = STEPS;
  protected readonly router = inject(Router);

  // Query param (bound automáticamente por withComponentInputBinding) usado cuando
  // volvemos del alta de paciente (Task 4): preselecciona el paciente recién creado.
  readonly patientId = input<string | undefined>(undefined);

  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly employeeService = inject(EmployeeService);
  private readonly patientService = inject(PatientService);
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
  readonly selectedExtractor = signal<ExtractorOption | null>(null);
  readonly extractorSuggestions = signal<ExtractorOption[]>([]);
  readonly step0Touched = signal(false);
  readonly step1Touched = signal(false);
  readonly step2Touched = signal(false);
  /** Cantidad de análisis seleccionados, para el resumen (paso 3) y la validez del paso 2. */
  readonly analysesCount = signal(0);

  /** Nombre del paciente cuya dirección se precargó (para el banner del paso 1, Task 3). */
  readonly prefillPatientName = signal<string | null>(null);
  /** Snapshot de la dirección precargada, para detectar si el usuario la editó (Task 3/4). */
  private readonly prefilledSnapshot = signal<{ street: string; number: string; city: string; references: string } | null>(null);

  private allEmployees: ExtractorOption[] = [];
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

  /** Paso 1 válido: dirección obligatoria (calle + ciudad) + extractor asignado. */
  readonly step1Valid = computed(() => {
    this.formValue(); // dependencia reactiva (ver step0Valid)
    const f = this.form.controls;
    return (
      this.step0Valid() &&
      f.addressStreet.value.trim().length > 0 &&
      f.addressCity.value.trim().length > 0 &&
      !!this.selectedExtractor()
    );
  });

  /** Paso 2 válido: al menos un análisis (sin determinaciones no hay rótulos). */
  readonly step2Valid = computed(() => this.analysesCount() > 0);

  /**
   * Origen de la dirección actual del form respecto de la precarga (Task 3):
   * - 'none': no hubo precarga (paciente sin dirección o aún no seleccionado).
   * - 'prefilled': la dirección coincide con la precargada del paciente.
   * - 'edited': el usuario modificó algún campo respecto de la precarga.
   */
  readonly addressSource = computed<'none' | 'prefilled' | 'edited'>(() => {
    this.formValue(); // dependencia reactiva del form
    const snap = this.prefilledSnapshot();
    if (!snap) return 'none';
    const f = this.form.controls;
    const same =
      f.addressStreet.value === snap.street &&
      f.addressNumber.value === snap.number &&
      f.addressCity.value === snap.city &&
      f.addressReferences.value === snap.references;
    return same ? 'prefilled' : 'edited';
  });

  /** `continueDisabled` del wizard-shell según el paso actual. */
  readonly continueDisabledForStep = computed(() => {
    switch (this.currentIndex()) {
      case 0: return !this.step0Valid();
      case 1: return !this.step1Valid();
      case 2: return !this.step2Valid(); // no se avanza al resumen sin análisis
      default: return false;
    }
  });

  constructor() {
    // Preselección al volver del alta de paciente (Task 4): con patientId en la ruta,
    // trae el paciente y reusa onPatientSelected (fetch + precarga de dirección, Task 2/3).
    effect(() => {
      const id = this.patientId();
      if (!id) return;
      const numeric = Number(id);
      if (Number.isNaN(numeric)) return;
      this.patientService.getById(numeric)
        .pipe(take(1), takeUntilDestroyed(this.destroyRef))
        .subscribe((p) => this.onPatientSelected(p));
    });
  }

  ngOnInit(): void {
    // Precargamos la lista de empleados para el autocomplete de extractor.
    this.employeeService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => {
        this.allEmployees = list
          .filter((e) => e.active)
          .map((e) => ({ ...e, displayName: `${e.lastName}, ${e.firstName}` }));
      });
  }

  // ── Step navigation ────────────────────────────────────────────────────────
  goTo(i: number): void {
    // Solo permite saltar a pasos ya visitados, igual que el patrón del repo.
    if (this.visited().has(i)) this.currentIndex.set(i);
  }

  next(): void {
    const idx = this.currentIndex();
    if (idx === 0) this.step0Touched.set(true);
    if (idx === 1) { this.step1Touched.set(true); this.form.markAllAsTouched(); }
    if (idx === 2) this.step2Touched.set(true);
    if (this.continueDisabledForStep()) return;
    const next = Math.min(idx + 1, STEPS.length - 1);
    this.visited.update((s) => new Set([...s, next]));
    this.currentIndex.set(next);
  }

  prev(): void {
    if (this.currentIndex() > 0) this.currentIndex.update((i) => i - 1);
  }

  cancel(): void {
    this.router.navigate(['/domicilio/agenda']);
  }

  /** Redirige al alta de paciente (Task 4); vuelve acá con `patientId` para preseleccionarlo. */
  goToAltaPaciente(): void {
    this.router.navigate(['/pacientes/nuevo'], { queryParams: { returnTo: '/domicilio/nueva' } });
  }

  // ── Patient search ─────────────────────────────────────────────────────────
  onPatientSelected(p: Patient): void {
    this.selectedPatient.set(p);
    this.patientService.getById(p.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (full) => this.applyPatientAddress(full),
        error: () => this.clearPrefill(), // sin dirección; el error de red no debe romper el wizard
      });
  }

  /** Precarga la dirección primaria (o activa, o la primera) del paciente en el paso 1. */
  private applyPatientAddress(p: Patient): void {
    const addr: Address | undefined =
      p.addresses?.find((a) => a.isPrimary && a.active) ??
      p.addresses?.find((a) => a.active) ??
      p.addresses?.[0];
    if (!addr || !(addr.street || addr.city)) { this.clearPrefill(); return; }
    const references = [addr.apartment, addr.neighborhood].filter(Boolean).join(' · ');
    const snap = {
      street: addr.street ?? '', number: addr.streetNumber ?? '',
      city: addr.city ?? '', references,
    };
    this.form.patchValue({
      addressStreet: snap.street, addressNumber: snap.number,
      addressCity: snap.city, addressReferences: snap.references,
    });
    this.prefilledSnapshot.set(snap);
    this.prefillPatientName.set(`${p.lastName}, ${p.firstName}`);
  }

  /** Limpia la precarga de dirección (paciente sin dirección o error al obtenerlo). */
  private clearPrefill(): void {
    this.form.patchValue({ addressStreet: '', addressNumber: '', addressCity: '', addressReferences: '' });
    this.prefilledSnapshot.set(null);
    this.prefillPatientName.set(null);
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
    this.selectedExtractor.set(e.value as ExtractorOption);
  }

  onExtractorClear(): void {
    this.selectedExtractor.set(null);
  }

  // ── Analysis picker ────────────────────────────────────────────────────────
  onAnalysisAdded(row: PickerRow): void {
    this.selectedAnalyses = [...this.selectedAnalyses, row];
    this.analysesCount.set(this.selectedAnalyses.length);
  }

  onAnalysisRemoved(id: number): void {
    this.selectedAnalyses = this.selectedAnalyses.filter((r) => r.id !== id);
    this.analysesCount.set(this.selectedAnalyses.length);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  /** Llamado por el WizardShell en el último paso al presionar "Agendar visita". */
  protected onFinish(): void {
    this.submit();
  }

  private submit(): void {
    if (!this.step1Valid() || !this.step2Valid()) {
      this.step0Touched.set(true);
      this.step1Touched.set(true);
      this.step2Touched.set(true);
      this.form.markAllAsTouched();
      return;
    }

    const patient = this.selectedPatient()!;
    const f = this.form.getRawValue();
    const branchId = this.branchCtx.branchId() ?? 1;

    const scheduledAtDate = f.scheduledAt as Date;
    // scheduledAt = día elegido + hora de inicio de la ventana. Antes usaba la hora
    // del instante en que se abrió el datepicker, y agendar hoy con esa hora ya
    // pasada rompía la validación @Future del backend. Construcción local-aware:
    // evita el desfase UTC de toISOString() en GMT-3 (puede retroceder un día).
    const scheduledAt = scheduledAtDate
      ? toLocalDateTimeString(combineDateAndTime(scheduledAtDate, f.timeWindowStart))
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
