import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { FormStepperHeaderComponent } from '@shared/ui/components/form-stepper-header/form-stepper-header.component';
import { FormStep } from '@shared/ui/models/form-step';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';
import { Patient } from '@features/pacientes/models/patient.model';
import { StepPacienteComponent } from './steps/step-paciente.component';
import { StepTiposComponent } from './steps/step-tipos.component';
import { StepFechaComponent } from './steps/step-fecha.component';
import { toLocalDateTimeString } from './services/sacar-turno-api.service';
import * as A from './store/sacar-turno.actions';
import * as S from './store/sacar-turno.selectors';

const STEPS: FormStep[] = [
  { key: 'datos-generales', title: 'Datos generales', subtitle: 'Paciente, sucursal y horario' },
  { key: 'analisis', title: 'Análisis', subtitle: 'Opcional' },
  { key: 'confirmar', title: 'Confirmar', subtitle: 'Revisar' },
];

@Component({
  selector: 'sacar-turno-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    SelectModule,
    ToastModule,
    FormStepperHeaderComponent,
    StepPacienteComponent,
    StepTiposComponent,
    StepFechaComponent,
  ],
  templateUrl: './sacar-turno.page.html',
  styles: [`
    /* Full-bleed: negamos el padding que el AdminShell aplica al content, para
       que el stepper header y el footer lleguen borde a borde y queden fijos
       (el body es el único que scrollea). Mismo enfoque que ui-wizard-shell. */
    :host {
      display: block;
      min-height: 0;
      overflow: hidden;
      margin: calc(-1 * var(--space-6));
      height: calc(100% + var(--space-6) * 2);
    }
    @media (max-width: 767px) {
      :host {
        margin: calc(-1 * var(--space-4));
        height: calc(100% + var(--space-4) * 2);
      }
    }
    .st-footer { border-top: 1px solid var(--ds-border); }
    /* Alinear el texto de las opciones del select con el del trigger: PrimeNG
       insetea la lista 4px y eso desplaza las opciones ~5px a la derecha. */
    :host ::ng-deep .p-select-overlay .p-select-list { padding-left: 0; padding-right: 0; }
  `],
})
export class SacarTurnoPage {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly branchCtx = inject(OperatorBranchContextService);

  protected readonly steps = STEPS;

  // ── Estado de la store ──────────────────────────────
  protected readonly tipos = this.store.selectSignal(S.selectTipos);
  protected readonly tiposLoading = this.store.selectSignal(S.selectTiposLoading);
  protected readonly branches = this.store.selectSignal(S.selectBranches);
  protected readonly slots = this.store.selectSignal(S.selectSlots);
  protected readonly slotsLoading = this.store.selectSignal(S.selectSlotsLoading);
  protected readonly creatingPatient = this.store.selectSignal(S.selectCreatingPatient);
  private readonly createdPatient = this.store.selectSignal(S.selectCreatedPatient);
  protected readonly booking = this.store.selectSignal(S.selectBooking);
  private readonly bookedId = this.store.selectSignal(S.selectBookedId);

  // ── Selecciones del wizard ──────────────────────────
  protected readonly currentStep = signal(0);
  protected readonly visited = signal<ReadonlySet<number>>(new Set([0]));
  protected readonly selectedPatient = signal<Patient | null>(null);
  protected readonly selectedTipoIds = signal<number[]>([]);
  protected readonly selectedBranchId = signal<number | null>(null);
  protected readonly selectedFecha = signal<Date | null>(null);
  protected readonly selectedHora = signal<string | null>(null);

  protected readonly currentKey = computed(() => this.steps[this.currentStep()]?.key);

  // El backend exige fecha >= hoy: se puede sacar turno para el mismo día, no para el pasado.
  protected readonly minBookingDate = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  protected readonly selectedBranchName = computed(() =>
    this.branches().find(b => b.id === this.selectedBranchId())?.name ?? null);

  protected readonly selectedTipos = computed(() =>
    this.tipos().filter(t => this.selectedTipoIds().includes(t.id)));

  protected readonly selectedTiposRequierenAyuno = computed(() =>
    this.selectedTipos().some(t => t.ayuno));

  protected readonly canProceed = computed(() => {
    switch (this.currentKey()) {
      case 'datos-generales': return this.selectedPatient() !== null
        && this.selectedBranchId() !== null && this.selectedFecha() !== null && this.selectedHora() !== null;
      // Opcional: el análisis definitivo se confirma en la atención (puede ir sin análisis).
      case 'analisis': return true;
      case 'confirmar': return true;
      default: return false;
    }
  });

  constructor() {
    this.store.dispatch(A.resetSacarTurno());
    this.store.dispatch(A.loadTipos());
    this.store.dispatch(A.loadBranches());

    // Default de sucursal: la activa del staff si está en la lista; si no, la
    // primera. Se resuelve cuando las sucursales cargan (sin pisar una elección
    // manual posterior, porque sólo aplica mientras siga en null).
    effect(() => {
      const list = this.branches();
      if (list.length === 0 || this.selectedBranchId() !== null) return;
      const ctxId = this.branchCtx.branchId();
      this.selectedBranchId.set(list.find(b => b.id === ctxId)?.id ?? list[0].id);
    });

    // Alta rápida exitosa → seleccionar al paciente nuevo y consumir el flag.
    effect(() => {
      const p = this.createdPatient();
      if (p) {
        this.selectedPatient.set(p);
        this.store.dispatch(A.createPatientHandled());
      }
    });

    // Reserva exitosa → ir a la agenda (el toast lo emite el effect de la store).
    effect(() => {
      if (this.bookedId() != null) {
        this.store.dispatch(A.bookHandled());
        this.router.navigate(['/turnos/agenda']);
      }
    });
  }

  // ── Navegación (el footer del wizard-shell maneja Atrás/Cancelar/Finalizar) ──
  onNext(): void {
    const next = this.currentStep() + 1;
    this.currentStep.set(next);
    this.visited.update(v => new Set(v).add(next));
  }

  onBack(): void {
    this.currentStep.set(Math.max(0, this.currentStep() - 1));
  }

  onCancel(): void {
    this.router.navigate(['/turnos/agenda']);
  }

  onStepSelected(i: number): void {
    this.currentStep.set(i);
  }

  // ── Handlers de pasos ───────────────────────────────
  onPatientSelected(p: Patient): void {
    this.selectedPatient.set(p);
  }

  onCreatePatient(request: Parameters<typeof A.createPatient>[0]['request']): void {
    this.store.dispatch(A.createPatient({ request }));
  }

  onClearPatient(): void {
    this.selectedPatient.set(null);
  }

  onTiposChange(ids: number[]): void {
    this.selectedTipoIds.set(ids);
  }

  onBranchChange(id: number): void {
    this.selectedBranchId.set(id);
    this.selectedHora.set(null);
    if (this.selectedFecha()) this.loadSlots();
  }

  onFechaChange(fecha: Date): void {
    this.selectedFecha.set(fecha);
    this.selectedHora.set(null);
    this.loadSlots();
  }

  onHoraChange(hora: string): void {
    this.selectedHora.set(hora);
  }

  private loadSlots(): void {
    const branchId = this.selectedBranchId();
    const date = this.selectedFecha();
    if (branchId != null && date) {
      this.store.dispatch(A.loadSlots({ branchId, date }));
    }
  }

  // ── Confirmación ────────────────────────────────────
  onConfirm(): void {
    const patient = this.selectedPatient();
    const branchId = this.selectedBranchId();
    const fecha = this.selectedFecha();
    const hora = this.selectedHora();
    // El análisis es OPCIONAL: no se exige selectedTipoIds (puede ir vacío; el
    // detalle se define en la atención). Solo paciente + sucursal + fecha + hora.
    if (!patient || branchId == null || !fecha || !hora) return;

    const [hh, mm] = hora.split(':').map(Number);
    const scheduledAt = new Date(fecha);
    scheduledAt.setHours(hh, mm, 0, 0);

    // El análisis es opcional: si no se eligió ninguno, se reserva sin
    // determinaciones (el detalle se define en la atención).
    // TODO(futuro): que un paciente con turno facilite la atención pre-cargando
    // estos análisis en el alta de atención (hoy no se propagan).
    // Resolver determinationIds desde los tipos elegidos (sin duplicados).
    const tiposMap = new Map(this.tipos().map(t => [t.id, t]));
    const detIds: number[] = [];
    for (const id of this.selectedTipoIds()) {
      const t = tiposMap.get(id);
      if (!t) continue;
      for (const d of t.determinationIds) if (!detIds.includes(d)) detIds.push(d);
    }
    const determinations = detIds.map((determinationId, i) => ({ determinationId, orderNumber: i + 1 }));

    this.store.dispatch(A.book({
      request: {
        patientId: patient.id,
        branchId,
        scheduledAt: toLocalDateTimeString(scheduledAt),
        determinations,
      },
    }));
  }
}
