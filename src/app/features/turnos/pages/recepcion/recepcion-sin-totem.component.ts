import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { loadTodayAppointments } from '../../store/appointments/appointments.actions';
import {
  selectAppointmentsLoading,
  selectTodayAppointments,
} from '../../store/appointments/appointments.selectors';
import { callAppointmentForAttention } from '../../store/queue/queue.actions';
import { BoxOccupationWidgetComponent } from '../../box-occupation/components/box-occupation-widget.component';

@Component({
  selector: 'app-recepcion-sin-totem',
  standalone: true,
  imports: [DatePipe, TableModule, ButtonModule, BoxOccupationWidgetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recepcion-sin-totem.component.html',
  styleUrl: './recepcion-sin-totem.component.scss',
})
export class RecepcionSinTotemComponent implements OnInit {
  @Input({ required: true }) branchId!: number;
  /** Box-occupation inputs — resueltos por la página padre. */
  @Input() boxBranchId: number | null = null;
  @Input() boxCurrentUserId: number = 0;
  @Input() boxTotalBoxes: number = 1;

  private store = inject(Store);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  protected appointments = this.store.selectSignal(selectTodayAppointments);
  protected loading = this.store.selectSignal(selectAppointmentsLoading);

  ngOnInit(): void {
    this.store.dispatch(loadTodayAppointments({ branchId: this.branchId }));
    interval(5000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.store.dispatch(loadTodayAppointments({ branchId: this.branchId })));
  }

  protected onAtender(appointmentId: number): void {
    this.store.dispatch(callAppointmentForAttention({ appointmentId, dni: null }));
  }

  protected onWalkIn(): void {
    this.router.navigate(['/turnos/atencion-turno']);
  }
}
