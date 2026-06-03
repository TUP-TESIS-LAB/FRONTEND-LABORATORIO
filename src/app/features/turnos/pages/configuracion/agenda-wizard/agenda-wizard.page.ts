import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { race, Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { FormStepperHeaderComponent } from '@shared/ui/components/form-stepper-header/form-stepper-header.component';
import { AGENDA_WIZARD_STEPS } from './agenda-wizard.steps';

import { StepSucursalComponent } from './steps/step-sucursal.component';
import { StepHorarioComponent, HorarioFormValue } from './steps/step-horario.component';
import { StepPeriodoComponent, PeriodoFormValue } from './steps/step-periodo.component';
import { StepConfirmarComponent, AgendaWizardState } from './steps/step-confirmar.component';

import {
  createAgenda,
  createAgendaSuccess,
  createAgendaFailure,
  updateAgenda,
  updateAgendaSuccess,
  updateAgendaFailure,
} from '../../../store/agendas/agendas.actions';
import { mapAgendaError } from '../../../utils/agenda-error-mapper';
import { AgendaConfig, WEEK_DAYS } from '../../../models/agenda-config.model';
import { SucursalesService } from '../../../../sucursales/services/sucursales.service';

/** Maps ISO weekday number (1=Mon … 7=Sun) to the string the backend expects. */
const ISO_TO_WEEKDAY: Record<number, typeof WEEK_DAYS[number]> = {
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
  7: 'SUNDAY',
};

@Component({
  selector: 'app-agenda-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonModule,
    ToastModule,
    FormStepperHeaderComponent,
    StepSucursalComponent,
    StepHorarioComponent,
    StepPeriodoComponent,
    StepConfirmarComponent,
  ],
  templateUrl: './agenda-wizard.page.html',
  styleUrl: './agenda-wizard.page.scss',
  providers: [MessageService],
})
export class AgendaWizardPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);
  private readonly sucursalesService = inject(SucursalesService);

  /** Emite cuando un nuevo `confirm()` arranca, para cancelar el subscribe anterior. */
  private readonly cancelInFlight = new Subject<void>();

  protected readonly steps = AGENDA_WIZARD_STEPS;

  /**
   * currentStep es 0-indexed para alinearse con el `currentIndex` del
   * componente compartido `ui-form-stepper-header`. Antes era 1-indexed
   * por la API de PrimeNG <p-stepper>; el mapeo nuevo es directo
   * (0=sucursal, 1=horario, 2=periodo, 3=confirmar).
   */
  protected readonly currentStep = signal<number>(0);

  /**
   * Set de pasos visitados (clickeables desde el header). Arranca con sólo
   * el paso 0 (sucursal). Si entramos en modo edición se desbloquean todos
   * porque todos los datos ya están precargados.
   */
  protected readonly visited = signal<ReadonlySet<number>>(new Set([0]));

  protected readonly isFirstStep = computed(() => this.currentStep() === 0);
  protected readonly isLastStep = computed(() => this.currentStep() === this.steps.length - 1);

  protected readonly saving = signal(false);
  protected readonly editingId = signal<number | null>(null);

  /** Accumulated wizard state — filled step by step. */
  protected readonly branchId = signal<number | null>(null);
  protected readonly branchName = signal('');
  protected readonly horario = signal<HorarioFormValue | null>(null);
  protected readonly periodo = signal<PeriodoFormValue | null>(null);

  protected readonly summary = computed<AgendaWizardState>(() => ({
    branchName: this.branchName(),
    horario: this.horario()!,
    periodo: this.periodo()!,
  }));

  protected readonly canShowConfirmar = computed(
    () => this.branchId() != null && this.horario() != null && this.periodo() != null,
  );

  /**
   * Estado de validez de cada step (0/1/2). Cada step component emite
   * `(validChange)` desde un effect interno sobre su FormGroup, y la pagina
   * solo mantiene 3 signals locales que reflejan ese estado. Esto reemplaza
   * al patron viejo de @ViewChild + queueMicrotask que solo sincronizaba al
   * cambiar de step (y por eso el boton "Continuar →" quedaba disabled
   * eternamente al tipear).
   */
  protected readonly step0Valid = signal(false);
  protected readonly step1Valid = signal(false);
  protected readonly step2Valid = signal(false);

  protected readonly canContinueCurrentStep = computed(() => {
    const i = this.currentStep();
    if (i === 0) return this.step0Valid();
    if (i === 1) return this.step1Valid();
    if (i === 2) return this.step2Valid();
    return false;
  });

  @ViewChild('step0') step0?: StepSucursalComponent;
  @ViewChild('step1') step1?: StepHorarioComponent;
  @ViewChild('step2') step2?: StepPeriodoComponent;

  ngOnInit(): void {
    const agenda = this.route.snapshot.data['agenda'] as AgendaConfig | null;
    if (agenda) {
      this.editingId.set(agenda.id);
      this.branchId.set(agenda.branchId);

      // Parse stored "HH:mm:ss" or "HH:mm" back to "HH:mm"
      const fromTime = agenda.startTime.slice(0, 5);
      const toTime = agenda.endTime.slice(0, 5);

      this.horario.set({
        fromTime,
        toTime,
        slotDurationMinutes: agenda.slotDurationMinutes,
        patientsPerSlot: agenda.patientsPerSlot,
      });

      // Convert "MONDAY,TUESDAY" → ISO number array
      const dayNames = agenda.recurringDaysOfWeek?.split(',') ?? [];
      const weekdayToIso: Record<string, number> = {
        MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4,
        FRIDAY: 5, SATURDAY: 6, SUNDAY: 7,
      };
      const daysOfWeek = dayNames
        .map(d => weekdayToIso[d])
        .filter(Boolean)
        .sort((a, b) => a - b);

      this.periodo.set({
        daysOfWeek,
        validFrom: new Date(agenda.validFromDate + 'T00:00:00'),
        validTo: agenda.validToDate
          ? new Date(agenda.validToDate + 'T00:00:00')
          : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });

      // Placeholder mientras carga el nombre real (evita flash de "")
      this.branchName.set(`Sucursal #${agenda.branchId}`);
      this.loadBranchName(agenda.branchId);

      // Modo edición: todos los pasos están visitados (datos ya precargados),
      // permitir navegar libre entre ellos desde el header.
      this.visited.set(new Set([0, 1, 2, 3]));
    } else {
      // Pre-seleccionar branch desde queryParams (set por "Agregar" en accordion)
      const queryBranchId = this.route.snapshot.queryParamMap.get('branchId');
      if (queryBranchId) {
        const branchId = Number(queryBranchId);
        if (!Number.isNaN(branchId)) {
          this.branchId.set(branchId);
          this.loadBranchName(branchId);
        }
      }
    }
  }

  private loadBranchName(branchId: number): void {
    this.sucursalesService
      .listBranchesForSelector()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(list => {
        const branch = list.find(b => b.id === branchId);
        if (branch) this.branchName.set(branch.name);
      });
  }

  onSucursalNext(payload: { branchId: number }): void {
    this.branchId.set(payload.branchId);
    // Fetch branch name for the confirmation summary
    this.sucursalesService.listBranchesForSelector().pipe(take(1)).subscribe(list => {
      const branch = list.find(b => b.id === payload.branchId);
      if (branch) this.branchName.set(branch.name);
    });
    this.goNext();
  }

  onHorarioNext(payload: HorarioFormValue): void {
    this.horario.set(payload);
    this.goNext();
  }

  onPeriodoNext(payload: PeriodoFormValue): void {
    this.periodo.set(payload);
    this.goNext();
  }

  /**
   * Disparado por el boton "Continuar →" del footer. Llama al submit() del
   * step actual via @ViewChild para que valide y emita su (next) event,
   * que termina llamando a onSucursalNext / onHorarioNext / onPeriodoNext
   * y avanza al siguiente paso.
   */
  onContinueFromCurrentStep(): void {
    const i = this.currentStep();
    if (i === 0) this.step0?.submit();
    else if (i === 1) this.step1?.submit();
    else if (i === 2) this.step2?.submit();
  }

  /** Avanza al siguiente paso y lo agrega al set de visitados. */
  goNext(): void {
    const next = Math.min(this.currentStep() + 1, this.steps.length - 1);
    this.visited.update(s => new Set([...s, next]));
    this.currentStep.set(next);
  }

  /** Retrocede al paso anterior (no toca el set de visitados). */
  goBack(): void {
    this.currentStep.update(s => Math.max(0, s - 1));
  }

  /**
   * Navegación entre steps disparada por el header compartido. El shared
   * component sólo emite `stepSelected` para pasos ya visitados, así que el
   * guard cubre los requisitos previos (branch elegida, horario completado).
   */
  goToStep(step: number): void {
    if (step < 0 || step >= this.steps.length) return;
    if (!this.visited().has(step)) return;
    this.currentStep.set(step);
  }

  /** Cancel-and-bail (boton Volver del header + Cancelar del footer). */
  cancel(): void {
    this.router.navigate(['/turnos/configuracion']);
  }

  confirm(): void {
    if (!this.canShowConfirmar()) return;

    // Cancelar cualquier subscription previa (si el user re-confirma tras un error)
    this.cancelInFlight.next();
    this.saving.set(true);

    const h = this.horario()!;
    const p = this.periodo()!;
    const recurringDaysOfWeek = p.daysOfWeek
      .map(n => ISO_TO_WEEKDAY[n])
      .filter(Boolean)
      .join(',');

    const editId = this.editingId();
    const isEdit = editId != null;

    // Shared request shape. `branchId` SOLO va dentro del request en create;
    // en update va como arg separado de la action.
    const baseRequest = {
      startTime: h.fromTime,
      endTime: h.toTime,
      slotDurationMinutes: h.slotDurationMinutes,
      patientsPerSlot: h.patientsPerSlot,
      isRecurring: recurringDaysOfWeek.length > 0,
      validFromDate: this.toIsoDate(p.validFrom),
      validToDate: this.toIsoDate(p.validTo),
      recurringDaysOfWeek: recurringDaysOfWeek || undefined,
    };

    if (isEdit) {
      this.store.dispatch(
        updateAgenda({ id: editId!, branchId: this.branchId()!, request: baseRequest }),
      );
    } else {
      this.store.dispatch(
        createAgenda({ request: { branchId: this.branchId()!, ...baseRequest } }),
      );
    }

    const success$ = this.actions$.pipe(
      ofType(isEdit ? updateAgendaSuccess : createAgendaSuccess),
    );
    const failure$ = this.actions$.pipe(
      ofType(isEdit ? updateAgendaFailure : createAgendaFailure),
    );

    race(success$, failure$)
      .pipe(
        take(1),
        takeUntil(this.cancelInFlight),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(action => {
        this.saving.set(false);
        if ('error' in action) {
          const mapped = mapAgendaError(action.error as any);
          this.messageService.add({
            severity: mapped.severity,
            summary: 'Error',
            detail: mapped.message,
          });
        } else {
          this.router.navigate(['/turnos/configuracion']);
        }
      });
  }

  private toIsoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
