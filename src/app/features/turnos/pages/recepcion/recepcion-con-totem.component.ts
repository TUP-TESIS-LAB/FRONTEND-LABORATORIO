import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
  selectQueueEntriesAll,
  selectQueueLoading,
} from '../../store/queue/queue.selectors';
import { QueueRowActionsComponent } from '../../components/queue-row-actions.component';
import { OperatorBranchContextService } from '../../services/operator-branch.context';
import { QueueEntry } from '../../models/queue-entry.model';

@Component({
  selector: 'app-recepcion-con-totem',
  standalone: true,
  imports: [TableModule, ButtonModule, CardModule, QueueRowActionsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recepcion-con-totem.component.html',
  styleUrl: './recepcion-con-totem.component.scss',
})
export class RecepcionConTotemComponent implements OnInit {
  private store = inject(Store);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private branchContext = inject(OperatorBranchContextService);

  protected entries = this.store.selectSignal(selectQueueEntriesAll);
  protected loading = this.store.selectSignal(selectQueueLoading);
  protected hasBranch = this.branchContext.branchId;

  ngOnInit(): void {
    this.refreshIfBranch();
    interval(5000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshIfBranch());
  }

  private refreshIfBranch(): void {
    // Sin branch no tiene sentido pegarle al endpoint — evita warn loop
    // cada 5s cuando el operador no tiene sucursal asignada todavia.
    if (this.branchContext.branchId() == null) return;
    this.store.dispatch(loadQueue({}));
  }

  protected onCall(id: number): void {
    const branchId = this.branchContext.branchId();
    if (branchId == null) return;
    this.store.dispatch(callQueueEntry({ id, branchId }));
  }

  protected onNuevaAtencion(id: number): void {
    this.router.navigate(['/turnos/atencion-turno', id]);
  }

  protected rowClass(entry: QueueEntry): string {
    return entry.publicCode.startsWith('ST') ? 'row-st' : '';
  }

  protected trackById = (_: number, e: QueueEntry) => e.id;
}
