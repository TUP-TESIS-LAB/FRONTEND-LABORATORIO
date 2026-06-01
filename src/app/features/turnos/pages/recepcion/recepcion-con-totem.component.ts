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
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { callQueueEntry, loadQueue } from '../../store/queue/queue.actions';
import {
  selectQueueEntriesWalkIn,
  selectQueueEntriesWithAppointment,
  selectQueueLoading,
} from '../../store/queue/queue.selectors';
import { QueueRowActionsComponent } from '../../components/queue-row-actions.component';

@Component({
  selector: 'app-recepcion-con-totem',
  standalone: true,
  imports: [TableModule, ButtonModule, CardModule, QueueRowActionsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recepcion-con-totem.component.html',
  styleUrl: './recepcion-con-totem.component.scss',
})
export class RecepcionConTotemComponent implements OnInit {
  @Input({ required: true }) branchId!: number;

  private store = inject(Store);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  protected withAppointment = this.store.selectSignal(selectQueueEntriesWithAppointment);
  protected walkIn = this.store.selectSignal(selectQueueEntriesWalkIn);
  protected loading = this.store.selectSignal(selectQueueLoading);

  ngOnInit(): void {
    this.store.dispatch(loadQueue({ branchId: this.branchId }));
    interval(5000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.store.dispatch(loadQueue({ branchId: this.branchId })));
  }

  protected onCall(id: number): void {
    this.store.dispatch(callQueueEntry({ id, branchId: this.branchId }));
  }

  protected onNuevaAtencion(id: number): void {
    this.router.navigate(['/turnos/atencion-turno', id]);
  }
}
