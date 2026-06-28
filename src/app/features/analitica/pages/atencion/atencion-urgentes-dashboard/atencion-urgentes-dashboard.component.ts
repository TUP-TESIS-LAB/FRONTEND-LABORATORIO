import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  output,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { EMPTY } from 'rxjs';
import { TagModule } from 'primeng/tag';
import { PollingHandle, PollingService } from '@core/refresh';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { TableAction, TableColumn } from '@shared/ui/models/table-column.model';
import { AttentionResponse } from '../../../models/atencion.model';
import { loadUrgentPending } from '../../../store/urgent-pending/urgent-pending.actions';
import {
  selectUrgentPending,
  selectUrgentPendingLoading,
} from '../../../store/urgent-pending/urgent-pending.selectors';

@Component({
  selector: 'lab-atencion-urgentes-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, TagModule, DataTableComponent, UiCellDirective],
  template: `
    <div class="py-2">
      <section class="bg-white rounded-lg shadow-sm p-4">
        <ui-table
          [value]="rows()"
          [loading]="loading()"
          [columns]="columns"
          [actions]="rowActions"
          emptyHeading="Sin atenciones urgentes pendientes"
          emptyIcon="pi-inbox"
          (action)="onAction($event)">

          <ng-template uiCell="paciente" let-row>
            <div class="font-medium">{{ $any(row).patientFullName ?? '—' }}</div>
            <div class="text-xs text-[var(--ds-text-muted)]">{{ $any(row).patientDni ?? '—' }}</div>
          </ng-template>

          <ng-template uiCell="fecha" let-row>
            {{ $any(row).createdAt ? ($any(row).createdAt | date: 'dd/MM/yy HH:mm') : '—' }}
          </ng-template>

          <ng-template uiCell="estado" let-row>
            {{ $any(row).attentionState ?? '—' }}
          </ng-template>

          <ng-template uiCell="pendientes" let-row>
            <div class="flex flex-wrap gap-1">
              @if ($any(row).cobroPendiente) {
                <p-tag value="Cobro" severity="warn" />
              }
              @if ($any(row).autorizacionPendiente) {
                <p-tag value="Autorización" severity="warn" />
              }
              @if ($any(row).datosAdministrativosIncompletos) {
                <p-tag value="Datos" severity="warn" />
              }
            </div>
          </ng-template>

        </ui-table>
      </section>
    </div>
  `,
})
export class AtencionUrgentesDashboardComponent implements OnInit, OnDestroy {
  private readonly store   = inject(Store);
  private readonly polling = inject(PollingService);

  protected readonly rows    = this.store.selectSignal(selectUrgentPending);
  protected readonly loading = this.store.selectSignal(selectUrgentPendingLoading);

  /** Emite la atención seleccionada para "Resolver" (drawer wired in Task 9). */
  readonly resolver = output<AttentionResponse>();

  readonly columns: readonly TableColumn[] = [
    { field: 'paciente',   header: 'Paciente' },
    { field: 'fecha',      header: 'Fecha' },
    { field: 'estado',     header: 'Estado' },
    { field: 'pendientes', header: 'Pendientes' },
  ];

  readonly rowActions: readonly TableAction[] = [
    {
      key: 'resolver',
      icon: 'pi-bolt',
      label: 'Resolver',
    },
  ];

  private pollingHandle: PollingHandle | null = null;

  ngOnInit(): void {
    this.store.dispatch(loadUrgentPending());

    // Polling cada 5 s según regla #5 del CLAUDE.md.
    // El store effect usa concatMap + ETag/304, así que si no hay datos nuevos
    // la acción loadUrgentPendingNotModified no toca la lista.
    // TODO(Task 9): pausar el polling mientras el drawer de resolución esté abierto
    //   (pollingHandle.setActive(false) al abrir / setActive(true) al cerrar).
    this.pollingHandle = this.polling.startPolling({
      key: 'atencion-urgentes-dashboard',
      intervalMs: 5000,
      poll: () => {
        this.store.dispatch(loadUrgentPending());
        // Dispatch es sincrónico; devolvemos EMPTY para que PollingService
        // considere el tick completado sin suscribirse a nada extra.
        return EMPTY;
      },
    });
  }

  ngOnDestroy(): void {
    this.pollingHandle?.stop();
  }

  onAction(ev: { key: string; row: unknown }): void {
    if (ev.key === 'resolver') {
      // TODO(Task 9): abrir drawer de resolución con la atención seleccionada.
      this.resolver.emit(ev.row as AttentionResponse);
    }
  }
}
