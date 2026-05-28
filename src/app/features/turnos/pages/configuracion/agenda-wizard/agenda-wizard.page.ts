import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { race, Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

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
    RouterLink,
    StepperModule,
    ButtonModule,
    ToastModule,
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

  protected readonly currentStep = signal<number>(1);
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
    this.currentStep.set(2);
  }

  onHorarioNext(payload: HorarioFormValue): void {
    this.horario.set(payload);
    this.currentStep.set(3);
  }

  onPeriodoNext(payload: PeriodoFormValue): void {
    this.periodo.set(payload);
    this.currentStep.set(4);
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= 4) this.currentStep.set(step);
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
