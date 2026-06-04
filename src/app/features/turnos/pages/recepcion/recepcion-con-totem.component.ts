import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import {
  attendWalkinEntry,
  callAppointmentForAttention,
  callQueueEntry,
  cancelQueueEntry,
  loadQueue,
} from '../../store/queue/queue.actions';
import {
  selectQueueEntriesAll,
  selectQueueLoading,
} from '../../store/queue/queue.selectors';
import { QueueRowActionsComponent } from '../../components/queue-row-actions.component';
import { ScheduledAppointmentsDrawerComponent } from '../../components/scheduled-appointments-drawer.component';
import { OperatorBranchContextService } from '../../services/operator-branch.context';
import { QueueEntry } from '../../models/queue-entry.model';
import { WaitingTimePipe } from '../../pipes/waiting-time.pipe';

@Component({
  selector: 'app-recepcion-con-totem',
  standalone: true,
  imports: [TableModule, ButtonModule, CardModule, ConfirmDialogModule, QueueRowActionsComponent, ScheduledAppointmentsDrawerComponent, WaitingTimePipe],
  providers: [ConfirmationService, MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recepcion-con-totem.component.html',
  styleUrl: './recepcion-con-totem.component.scss',
})
export class RecepcionConTotemComponent implements OnInit {
  private store = inject(Store);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private branchContext = inject(OperatorBranchContextService);
  private confirmService = inject(ConfirmationService);

  protected entries = this.store.selectSignal(selectQueueEntriesAll);
  protected loading = this.store.selectSignal(selectQueueLoading);
  protected hasBranch = this.branchContext.branchId;
  protected drawerOpen = signal(false);

  ngOnInit(): void {
    // Primera carga: visible (muestra el spinner del p-table mientras carga).
    this.refreshIfBranch({ silent: false });
    // Polling cada 5s: silent para no parpadear la tabla.
    interval(5000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshIfBranch({ silent: true }));
  }

  private refreshIfBranch({ silent }: { silent: boolean }): void {
    // Sin branch no tiene sentido pegarle al endpoint — evita warn loop
    // cada 5s cuando el operador no tiene sucursal asignada todavia.
    if (this.branchContext.branchId() == null) return;
    this.store.dispatch(loadQueue({ silent }));
  }

  protected onCall(id: number): void {
    const branchId = this.branchContext.branchId();
    if (branchId == null) return;
    this.store.dispatch(callQueueEntry({ id, branchId }));
  }

  protected onNuevaAtencion(id: number): void {
    const entry = this.entries().find(e => e.id === id);
    if (!entry) return;
    const dni = entry.nationalId ?? null;
    // CT (con appointment) usa /by-appointment/:id/call que crea queue_entry
    // si no existe + marca COMPLETED. ST walk-in no tiene appointment asi que
    // marcamos el entry directo via PATCH.
    if (entry.appointmentId != null) {
      this.store.dispatch(callAppointmentForAttention({ appointmentId: entry.appointmentId, dni }));
    } else {
      this.store.dispatch(attendWalkinEntry({ entryId: id, dni }));
    }
  }

  protected onCancel(id: number, publicCode: string): void {
    this.confirmService.confirm({
      message: `¿Cancelar la atención ${publicCode}? Se va a sacar de la cola.`,
      header: 'Confirmar cancelación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, cancelar',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.store.dispatch(cancelQueueEntry({ id })),
    });
  }

  protected toggleDrawer(): void {
    this.drawerOpen.update(v => !v);
  }

  protected onDrawerVisibleChange(visible: boolean): void {
    this.drawerOpen.set(visible);
  }

  protected rowClass(entry: QueueEntry): string {
    // CT (con turno) → fondo amarillo suave para diferenciarlos a primera
    // vista del walk-in. ST sigue con el naranja claro existente.
    if (entry.publicCode.startsWith('ST')) return 'row-st';
    if (entry.appointmentId != null) return 'row-ct';
    return '';
  }

  protected onNuevaAtencionBlanco(): void {
    // Atencion arrancada desde cero (sin DNI prellenado) — el operador
    // tipea todo en el wizard. NO pasa por la cola.
    this.router.navigate(['/analitica/atencion/nueva']);
  }

  protected trackById = (_: number, e: QueueEntry) => e.id;
}
