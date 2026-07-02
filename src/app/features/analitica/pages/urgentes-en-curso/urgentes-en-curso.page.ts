import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { EMPTY } from 'rxjs';
import { TagModule } from 'primeng/tag';
import { PollingHandle, PollingService } from '@core/refresh';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { TableColumn } from '@shared/ui/models/table-column.model';
import { AttentionState } from '../../models/atencion.model';
import { urgentStageLabel } from '../../models/atencion-state-label';
import { UrgentInProgressItem } from '../../models/urgent-in-progress.model';
import { loadUrgentInProgress } from '../../store/urgent-in-progress/urgent-in-progress.actions';
import { selectUrgentInProgressBoard } from '../../store/urgent-in-progress/urgent-in-progress.selectors';

/** Umbral de "amarillo": a partir de qué % del SLA target se considera advertencia. */
const WARN_THRESHOLD_RATIO = 0.8;

export type SlaStatus = 'verde' | 'amarillo' | 'rojo';

/** Fila derivada de un `UrgentInProgressItem` con antigüedad y color de SLA calculados client-side. */
export interface UrgentesEnCursoRow extends UrgentInProgressItem {
  elapsedMinutes: number;
  slaStatus: SlaStatus;
}

const SLA_STATUS_RANK: Record<SlaStatus, number> = {
  rojo: 2,
  amarillo: 1,
  verde: 0,
};

/** Deriva `elapsedMinutes` + `slaStatus` para un item dado `nowMs` y el target del tenant. */
function toRow(item: UrgentInProgressItem, nowMs: number, slaTargetMinutes: number): UrgentesEnCursoRow {
  const elapsedMinutes = Math.floor((nowMs - Date.parse(item.urgentSince)) / 60000);
  const slaStatus: SlaStatus =
    elapsedMinutes >= slaTargetMinutes
      ? 'rojo'
      : elapsedMinutes < WARN_THRESHOLD_RATIO * slaTargetMinutes
        ? 'verde'
        : 'amarillo';
  return { ...item, elapsedMinutes, slaStatus };
}

/** Severidad de `p-tag` por estado de SLA. */
export function slaSeverity(status: SlaStatus): 'success' | 'warn' | 'danger' {
  if (status === 'rojo') return 'danger';
  if (status === 'amarillo') return 'warn';
  return 'success';
}

/**
 * Tablero de solo lectura "Urgentes en curso" (KAN-169 SP-3).
 *
 * Muestra las atenciones urgentes en curso (ya iniciadas, aún no finalizadas)
 * con la antigüedad desde que se marcaron urgentes y un semáforo de SLA
 * calculado client-side (verde/amarillo/rojo). Ordenado vencidos-primero.
 * Read-only: no dispara ninguna acción de mutación, solo `loadUrgentInProgress`.
 */
@Component({
  selector: 'lab-urgentes-en-curso',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TagModule, DataTableComponent, UiCellDirective],
  template: `
    <div class="py-2">
      <section class="bg-white rounded-lg shadow-sm p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold m-0">Urgentes en curso</h2>
          @if (overdueCount() > 0) {
            <p-tag [value]="overdueCount() + ' vencidos'" severity="danger" />
          }
        </div>

        <ui-table
          [value]="rows()"
          [loading]="loading()"
          [columns]="columns"
          emptyHeading="Sin atenciones urgentes en curso"
          emptyIcon="pi-inbox">

          <ng-template uiCell="paciente" let-row>
            <div class="font-medium">{{ $any(row).patientFullName ?? '—' }}</div>
            <div class="text-xs text-[var(--ds-text-muted)]">{{ $any(row).patientDni ?? '—' }}</div>
          </ng-template>

          <ng-template uiCell="numero" let-row>
            {{ $any(row).attentionNumber ?? '—' }}
          </ng-template>

          <ng-template uiCell="etapa" let-row>
            {{ stageLabel($any(row).attentionState) }}
          </ng-template>

          <ng-template uiCell="antiguedad" let-row>
            {{ $any(row).elapsedMinutes }} min
          </ng-template>

          <ng-template uiCell="sla" let-row>
            <p-tag [value]="slaLabel($any(row).slaStatus)" [severity]="slaSeverityOf($any(row).slaStatus)" />
          </ng-template>

        </ui-table>
      </section>
    </div>
  `,
})
export class UrgentesEnCursoPage implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly polling = inject(PollingService);

  readonly board = this.store.selectSignal(selectUrgentInProgressBoard);
  readonly loading = signal(false);

  /** Ticker de antigüedad: se actualiza cada 30s para recalcular elapsedMinutes/slaStatus. */
  private readonly nowMs = signal(Date.now());

  /** Filas derivadas: antigüedad + color de SLA, ordenadas vencidos-primero. */
  readonly rows = computed<UrgentesEnCursoRow[]>(() => {
    const board = this.board();
    if (!board) return [];
    const now = this.nowMs();
    const derived = board.items.map(item => toRow(item, now, board.slaTargetMinutes));
    return [...derived].sort((a, b) => {
      const rankDiff = SLA_STATUS_RANK[b.slaStatus] - SLA_STATUS_RANK[a.slaStatus];
      if (rankDiff !== 0) return rankDiff;
      return b.elapsedMinutes - a.elapsedMinutes;
    });
  });

  /** Contador de vencidos (SLA rojo) para el chip superior. */
  readonly overdueCount = computed(() => this.rows().filter(r => r.slaStatus === 'rojo').length);

  readonly columns: readonly TableColumn[] = [
    { field: 'paciente',   header: 'Paciente' },
    { field: 'numero',     header: 'Nº' },
    { field: 'etapa',      header: 'Etapa' },
    { field: 'antiguedad', header: 'Antigüedad' },
    { field: 'sla',        header: 'SLA' },
  ];

  private pollingHandle: PollingHandle | null = null;
  private tickerId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.pollingHandle = this.polling.startPolling({
      key: 'urgentes-en-curso',
      intervalMs: 10000,
      poll: () => {
        this.store.dispatch(loadUrgentInProgress());
        return EMPTY;
      },
    });

    this.tickerId = setInterval(() => this.nowMs.set(Date.now()), 30000);
  }

  ngOnDestroy(): void {
    this.pollingHandle?.stop();
    if (this.tickerId !== null) clearInterval(this.tickerId);
  }

  // ── Helpers de presentación (read-only, español, sin IDs) ───────────────────
  readonly stageLabel = (state: AttentionState | null | undefined): string => urgentStageLabel(state);

  slaLabel(status: SlaStatus): string {
    if (status === 'rojo') return 'Vencido';
    if (status === 'amarillo') return 'Por vencer';
    return 'En término';
  }

  slaSeverityOf(status: SlaStatus): 'success' | 'warn' | 'danger' {
    return slaSeverity(status);
  }
}
