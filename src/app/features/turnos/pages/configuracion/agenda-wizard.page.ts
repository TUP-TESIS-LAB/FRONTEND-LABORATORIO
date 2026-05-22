import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import {
  AgendaConfig,
  CreateAgendaConfigRequest,
  UpdateAgendaConfigRequest,
} from '../../models/agenda-config.model';
import * as AgendasActions from '../../store/agendas/agendas.actions';
import { selectAgendasPending } from '../../store/agendas/agendas.selectors';
import { mapAgendaError } from '../../utils/agenda-error-mapper';
import { StepSucursalComponent } from './steps/step-sucursal.component';
import { StepHorarioComponent } from './steps/step-horario.component';
import { StepVigenciaComponent } from './steps/step-vigencia.component';
import { StepConfirmarComponent } from './steps/step-confirmar.component';

@Component({
  selector: 'app-agenda-wizard-page',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    ButtonModule, ToastModule,
    StepSucursalComponent, StepHorarioComponent, StepVigenciaComponent, StepConfirmarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './agenda-wizard.page.html',
  styleUrl: './agenda-wizard.page.scss',
  providers: [MessageService],
})
export class AgendaWizardPage implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private store = inject(Store);
  private actions$ = inject(Actions);
  private messages = inject(MessageService);

  protected form: FormGroup = this.fb.group({
    branchId: [null, Validators.required],
    startTime: ['08:00', Validators.required],
    endTime: ['12:00', Validators.required],
    slotDurationMinutes: [15, [Validators.required, Validators.min(1)]],
    patientsPerSlot: [1, [Validators.required, Validators.min(1)]],
    isRecurring: [true],
    validFromDate: [this.todayISO(), Validators.required],
    validToDate: [null],
    recurringDaysOfWeek: [[] as string[]],
  });

  protected stepIndex = signal<number>(0);
  protected submitted = signal<boolean>(false);
  protected pending = this.store.selectSignal(selectAgendasPending);

  protected editAgenda = signal<AgendaConfig | null>(null);
  protected isEdit = computed(() => this.editAgenda() != null);

  ngOnInit(): void {
    const agenda = this.route.snapshot.data['agenda'] as AgendaConfig | null;
    if (agenda) {
      this.editAgenda.set(agenda);
      this.form.patchValue({
        branchId: agenda.branchId,
        startTime: agenda.startTime.slice(0, 5),
        endTime: agenda.endTime.slice(0, 5),
        slotDurationMinutes: agenda.slotDurationMinutes,
        patientsPerSlot: agenda.patientsPerSlot,
        isRecurring: agenda.isRecurring,
        validFromDate: agenda.validFromDate,
        validToDate: agenda.validToDate,
        recurringDaysOfWeek: agenda.recurringDaysOfWeek?.split(',') ?? [],
      });
      this.form.get('branchId')?.disable();
    } else {
      const presetBranch = this.route.snapshot.queryParamMap.get('branchId');
      if (presetBranch) {
        this.form.patchValue({ branchId: Number(presetBranch) });
        this.stepIndex.set(1);
      }
    }

    this.actions$
      .pipe(ofType(AgendasActions.createAgendaFailure, AgendasActions.updateAgendaFailure))
      .subscribe(({ error }) => {
        const mapped = mapAgendaError(error as any);
        this.messages.add({ severity: mapped.severity, summary: 'Error', detail: mapped.message });
        if (mapped.returnToStep) this.stepIndex.set(mapped.returnToStep - 1);
        this.submitted.set(false);
      });

    this.actions$
      .pipe(ofType(AgendasActions.createAgendaSuccess, AgendasActions.updateAgendaSuccess))
      .subscribe(() => {
        this.router.navigate(['/turnos/configuracion']);
      });
  }

  protected next(): void {
    this.stepIndex.update((i) => Math.min(i + 1, 3));
  }
  protected back(): void {
    this.stepIndex.update((i) => Math.max(i - 1, 0));
  }

  protected submit(): void {
    this.submitted.set(true);
    const value = this.form.getRawValue();
    const days: string[] = value.recurringDaysOfWeek ?? [];
    const recurringDaysOfWeek = value.isRecurring && days.length > 0 ? days.join(',') : undefined;

    if (this.isEdit()) {
      const id = this.editAgenda()!.id;
      const branchId = this.editAgenda()!.branchId;
      const request: UpdateAgendaConfigRequest = {
        startTime: value.startTime,
        endTime: value.endTime,
        slotDurationMinutes: value.slotDurationMinutes,
        patientsPerSlot: value.patientsPerSlot,
        isRecurring: value.isRecurring,
        validFromDate: value.validFromDate,
        validToDate: value.validToDate ?? undefined,
        recurringDaysOfWeek,
      };
      this.store.dispatch(AgendasActions.updateAgenda({ id, branchId, request }));
    } else {
      const request: CreateAgendaConfigRequest = {
        branchId: value.branchId,
        startTime: value.startTime,
        endTime: value.endTime,
        slotDurationMinutes: value.slotDurationMinutes,
        patientsPerSlot: value.patientsPerSlot,
        isRecurring: value.isRecurring,
        validFromDate: value.validFromDate,
        validToDate: value.validToDate ?? undefined,
        recurringDaysOfWeek,
      };
      this.store.dispatch(AgendasActions.createAgenda({ request }));
    }
  }

  private todayISO(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
