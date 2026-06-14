import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { of } from 'rxjs';
import { PollingHandle, PollingService } from '@core/refresh';
import { ExtractorBoxService } from '@core/services/extractor-box.service';
import { NotificationService } from '@core/services/notification.service';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { RefreshIndicatorComponent } from '@shared/ui/components/refresh-indicator/refresh-indicator.component';
import { BoxConfigBarComponent } from '../../components/box-config-bar/box-config-bar.component';
import { CancelExtractionDialogComponent } from '../../components/cancel-extraction-dialog/cancel-extraction-dialog.component';
import { FinishExtractionModalComponent } from '../../components/finish-extraction-modal/finish-extraction-modal.component';
import { InProgressListComponent } from '../../components/in-progress-list/in-progress-list.component';
import { TakePatientModalComponent } from '../../components/take-patient-modal/take-patient-modal.component';
import {
  AwaitingExtractionItem,
  BoxAssignment,
  InExtractionItem,
} from '../../models/extraction.model';
import * as A from '../../store/extraction/extraction.actions';
import {
  selectAwaitingToday,
  selectBoxAssignments,
  selectBranchExtractors,
  selectBranches,
  selectInProgressToday,
  selectLastAssigned,
  selectLastRefreshAt,
  selectMutating,
  selectSelectedBranchId,
} from '../../store/extraction/extraction.selectors';

const POLL_INTERVAL_MS = 5000;
const UNDO_TOAST_KEY = 'extraction-undo';
const UNDO_WINDOW_MS = 5000;

@Component({
  selector: 'app-extraction-queue-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    TooltipModule,
    EmptyStateComponent,
    PageHeaderComponent,
    RefreshIndicatorComponent,
    BoxConfigBarComponent,
    InProgressListComponent,
    TakePatientModalComponent,
    CancelExtractionDialogComponent,
    FinishExtractionModalComponent,
  ],
  template: `
    <section class="page">
      <ui-page-header
        heading="Cola de extracción"
        subtitle="Operá la cola y las extracciones en curso de la sucursal."
      >
        <div class="head-right">
          <ui-refresh-indicator
            [lastRefreshAt]="lastRefreshAt()"
            [paused]="paused()"
          />
        </div>
      </ui-page-header>

      @if (branches().length === 0) {
        <div class="empty-state-big">
          <i class="pi pi-lock"></i>
          <h2>No tenés sucursales asignadas</h2>
          <p>Pedile al administrador que te asigne una sucursal. La pantalla queda bloqueada hasta entonces.</p>
        </div>
      } @else if (selectedBranchId() != null) {
        <app-box-config-bar
          [assignments]="boxAssignments()"
          [extractors]="branchExtractors()"
          (assign)="onBoxAssign($event)"
        />

        <div class="columns">
          <!-- Columna izquierda: la cola -->
          <section class="block">
            <div class="block__header">
              <h2>Cola de extracción</h2>
            </div>

            @if (awaiting().length === 0) {
              <ui-empty-state
                icon="pi-check-circle"
                heading="No hay pacientes esperando"
                description="Cuando ingresen pacientes esperando extracción aparecerán acá."
              />
            } @else {
              <p-table [value]="awaiting()" styleClass="p-datatable-sm">
                <ng-template pTemplate="header">
                  <tr>
                    <th></th>
                    <th>Turno</th>
                    <th>Paciente</th>
                    <th>DNI</th>
                    <th class="actions-col">Acciones</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-row>
                  <tr [class.is-urgent]="row.isUrgent">
                    <td>
                      @if (row.isUrgent) {
                        <p-tag value="URGENTE" severity="danger" icon="pi pi-exclamation-triangle" />
                      }
                    </td>
                    <td><strong>{{ row.publicCode ?? row.attentionNumber }}</strong></td>
                    <td>{{ row.patientFullName }}</td>
                    <td>{{ row.patientDni }}</td>
                    <td class="actions-col">
                      <div class="actions-cell">
                        <p-button
                          label="Tomar"
                          size="small"
                          [disabled]="mutating()"
                          (onClick)="onTake(row)"
                        />
                      </div>
                    </td>
                  </tr>
                </ng-template>
              </p-table>
            }
          </section>

          <!-- Columna derecha: en curso -->
          <section class="block">
            <div class="block__header">
              <h2>En curso</h2>
            </div>
            <app-in-progress-list
              [items]="inProgress()"
              [mutating]="mutating()"
              (noShow)="onNoShow($event)"
              (cancel)="onCancelRequest($event)"
              (end)="onEnd($event)"
            />
          </section>
        </div>
      }

      <app-take-patient-modal
        [(visible)]="takeModalOpen"
        [patient]="selectedPatient()"
        [boxes]="boxAssignments()"
        [inProgressExtractorIds]="inProgressExtractorIds()"
        (assign)="onAssignToBox($event)"
      />

      <app-cancel-extraction-dialog
        [(visible)]="cancelDialogOpen"
        [patient]="cancelTarget()"
        [saving]="mutating()"
        (cancelConfirmed)="onCancelConfirmed($event)"
      />

      <app-finish-extraction-modal
        [(visible)]="finishModalOpen"
        [patient]="finishTarget()"
        [saving]="mutating()"
        (confirmed)="onEndConfirmed($event)"
        (dismissed)="onFinishDismissed()"
      />

      <!-- Toast de undo (5s) — usa MessageService local a la page. -->
      <p-toast [key]="undoToastKey" position="top-right">
        <ng-template let-message pTemplate="message">
          <div class="undo-toast">
            <i class="pi pi-check-circle undo-toast__icon"></i>
            <div class="undo-toast__body">
              <span class="undo-toast__text">{{ message.summary }}</span>
              @if (message.detail) {
                <span class="undo-toast__detail">{{ message.detail }}</span>
              }
            </div>
            <p-button
              label="Deshacer"
              severity="secondary"
              size="small"
              [text]="true"
              (onClick)="onUndoAssign()"
            />
          </div>
        </ng-template>
      </p-toast>
    </section>
  `,
  styles: [`
    :host { display: block; min-height: 100%; }
    .page { display: flex; flex-direction: column; gap: 18px; }
    .head-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    h2 { margin: 0; font-size: 16px; display: inline-flex; align-items: center; gap: 8px; }

    .columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      align-items: stretch;
    }
    @media (max-width: 1023px) {
      .columns { grid-template-columns: 1fr; }
    }

    .block { background: #fff; border: 1px solid var(--ds-border); border-radius: 12px; padding: 16px; box-shadow: 0 1px 2px rgba(28,30,55,.06); height: 100%; min-height: 360px; box-sizing: border-box; display: flex; flex-direction: column; }
    /* Centrar verticalmente el empty-state de cada columna (Cola: directo; En curso: dentro de app-in-progress-list). */
    .block > ui-empty-state { margin: auto 0; }
    .block > app-in-progress-list { flex: 1; min-height: 0; }
    .block__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 12px; flex-wrap: wrap; }
    .actions-col { width: 1%; white-space: nowrap; text-align: right; }
    .actions-cell { display: inline-flex; gap: 6px; justify-content: flex-end; align-items: center; }
    tr.is-urgent { background: rgba(239,68,68,.04); }

    .empty-state-big {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #fff;
      border: 1px dashed #e2e8f0;
      border-radius: 12px;
      padding: 56px 24px;
      text-align: center;
      color: #64748b;
      gap: 8px;
    }
    .empty-state-big i {
      font-size: 38px;
      color: #0f766e;
      opacity: .8;
      margin-bottom: 6px;
    }
    .empty-state-big h2 {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .empty-state-big p {
      max-width: 460px;
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
    }

    .undo-toast {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
    }
    .undo-toast__icon { color: #16a34a; font-size: 18px; flex-shrink: 0; }
    .undo-toast__body { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .undo-toast__text { font-size: 13px; font-weight: 600; color: var(--ds-text, #1a1a2e); }
    .undo-toast__detail { font-size: 12px; color: var(--ds-text-muted, #6b7280); }
  `],
})
export class ExtractionQueuePage implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly polling = inject(PollingService);
  private readonly notifier = inject(NotificationService);
  private readonly messages = inject(MessageService);
  private readonly boxService = inject(ExtractorBoxService);
  private readonly operatorBranch = inject(OperatorBranchContextService);

  readonly pollIntervalMs = POLL_INTERVAL_MS;
  readonly undoToastKey = UNDO_TOAST_KEY;

  readonly awaiting = this.store.selectSignal(selectAwaitingToday);
  readonly inProgress = this.store.selectSignal(selectInProgressToday);
  readonly mutating = this.store.selectSignal(selectMutating);
  readonly lastRefreshAt = this.store.selectSignal(selectLastRefreshAt);
  readonly branches = this.store.selectSignal(selectBranches);
  readonly selectedBranchId = this.store.selectSignal(selectSelectedBranchId);
  readonly boxAssignments = this.store.selectSignal(selectBoxAssignments);
  readonly branchExtractors = this.store.selectSignal(selectBranchExtractors);
  readonly lastAssigned = this.store.selectSignal(selectLastAssigned);

  /** Extractores que ya tienen una extracción en curso (para marcar boxes ocupados). */
  readonly inProgressExtractorIds = computed<number[]>(() =>
    this.inProgress().map((i) => i.extractorId),
  );

  readonly takeModalOpen = signal(false);
  readonly cancelDialogOpen = signal(false);
  readonly finishModalOpen = signal(false);
  readonly cancelTarget = signal<InExtractionItem | null>(null);
  readonly finishTarget = signal<InExtractionItem | null>(null);
  readonly selectedPatient = signal<AwaitingExtractionItem | null>(null);
  readonly paused = computed(
    () => this.takeModalOpen() || this.cancelDialogOpen() || this.finishModalOpen(),
  );

  private handle: PollingHandle | null = null;
  /**
   * Guard para no auto-seleccionar la sucursal más de una vez. El effect que
   * sincroniza branches → selectedBranch corre cada vez que cambia la lista, y
   * sin este flag entraríamos en loop.
   */
  private autoSelectedOnce = false;
  /** attentionId del último lastAssigned ya mostrado en toast (dedup). */
  private lastAssignedShownId: number | null = null;
  /** Timer de la ventana de 5s; se limpia si el usuario deshace antes. */
  private undoTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Pausar el polling mientras un overlay está abierto. Al cerrar, dispara
    // un poke inmediato para sincronizar.
    effect(() => {
      const open = this.paused();
      if (!this.handle) return;
      this.handle.setActive(!open);
      if (!open) this.handle.pokeNow();
    });

    // Auto-seleccionar la sucursal del operador (regla: 1 usuario = 1 sucursal).
    // Prioridad: contexto del operador → valor persistido en localStorage → primera de la lista.
    // El selector de sucursal fue eliminado de la UI; la sucursal se siembra aquí
    // una sola vez (autoSelectedOnce garantiza idempotencia ante re-runs del effect).
    effect(() => {
      const list = this.branches();
      if (list.length === 0 || this.autoSelectedOnce) return;
      const currentSelected = this.selectedBranchId();
      if (currentSelected != null) {
        // Validar que la selección vigente siga en la lista; si no, corregir.
        if (!list.some((b) => b.id === currentSelected)) {
          this.dispatchBranchChange(list[0].id);
        }
        this.autoSelectedOnce = true;
        return;
      }
      // Sembrar desde el contexto del operador si está en la lista de sucursales permitidas.
      const ctxBranchId = this.operatorBranch.branchId();
      const persisted = this.boxService.selectedBranchId();
      const startId =
        ctxBranchId != null && list.some((b) => b.id === ctxBranchId) ? ctxBranchId
        : persisted != null && list.some((b) => b.id === persisted) ? persisted
        : list[0].id;
      this.dispatchBranchChange(startId);
      this.autoSelectedOnce = true;
    });

    // Sincronizar el branchId del service con el del store cuando éste cambia
    // (ej. el effect de 403 lo nullea).
    effect(() => {
      const fromStore = this.selectedBranchId();
      if (fromStore !== this.boxService.selectedBranchId()) {
        this.boxService.setSelectedBranch(fromStore);
      }
    });

    // Ventana de undo de 5s: cuando aparece un lastAssigned nuevo (tras
    // assignExtractorSuccess), mostramos el toast con acción "Deshacer".
    effect(() => {
      const la = this.lastAssigned();
      if (!la || la.attentionId === this.lastAssignedShownId) return;
      this.lastAssignedShownId = la.attentionId;
      this.showUndoToast(la.boxNumber, la.attentionId);
    });
  }

  ngOnInit(): void {
    this.store.dispatch(A.loadBranches());
    this.handle = this.polling.startPolling({
      key: 'extraction-queue',
      intervalMs: POLL_INTERVAL_MS,
      poll: () => {
        this.store.dispatch(A.loadBranches());
        this.store.dispatch(A.refreshAll());
        return of(void 0);
      },
    });
  }

  ngOnDestroy(): void {
    this.handle?.stop();
    this.handle = null;
    this.clearUndoTimer();
  }

  private dispatchBranchChange(branchId: number | null): void {
    this.boxService.setSelectedBranch(branchId);
    this.store.dispatch(A.setSelectedBranch({ branchId }));
  }

  // --- Box config bar ------------------------------------------------------

  /**
   * Asigna/desasigna un extractor a un box: hace merge por boxNumber sobre la
   * lista actual y dispatch saveBoxAssignments con la lista completa (el backend
   * hace replace del set).
   */
  onBoxAssign(ev: { boxNumber: number; extractorId: number | null }): void {
    const next = this.boxAssignments().map((b) =>
      b.boxNumber === ev.boxNumber ? { ...b, extractorId: ev.extractorId } : b,
    );
    this.saveBoxes(next);
  }

  private saveBoxes(boxes: BoxAssignment[]): void {
    this.store.dispatch(A.saveBoxAssignments({
      boxes: boxes.map((b) => ({ boxNumber: b.boxNumber, extractorUserId: b.extractorId })),
    }));
  }

  // --- Cola / tomar --------------------------------------------------------

  onTake(item: AwaitingExtractionItem): void {
    if (this.selectedBranchId() == null) {
      this.notifier.error('No hay sucursal asignada. Pedile al administrador que te asigne una.');
      return;
    }
    this.selectedPatient.set(item);
    this.takeModalOpen.set(true);
  }

  /** El modal emite el boxNumber elegido. Dispara la asignación y cierra. */
  onAssignToBox(boxNumber: number): void {
    const patient = this.selectedPatient();
    const branchId = this.selectedBranchId();
    this.takeModalOpen.set(false);
    this.selectedPatient.set(null);
    if (!patient || branchId == null) return;
    this.store.dispatch(A.assignExtractor({ id: patient.id, boxNumber, branchId }));
  }

  // --- En curso ------------------------------------------------------------

  onNoShow(target: InExtractionItem): void {
    this.store.dispatch(A.cancelExtraction({ id: target.id, reason: 'NO_SE_PRESENTO' }));
  }

  onCancelRequest(target: InExtractionItem): void {
    this.cancelTarget.set(target);
    this.cancelDialogOpen.set(true);
  }

  onCancelConfirmed(payload: { reason: string }): void {
    const target = this.cancelTarget();
    this.cancelDialogOpen.set(false);
    if (!target) return;
    // Cancelación TERMINAL: la atención pasa a CANCELED y muere el flujo
    // (NO vuelve a la cola). "No se presentó" sigue usando cancelExtraction.
    this.store.dispatch(A.cancelAttention({ id: target.id, reason: payload.reason }));
    this.cancelTarget.set(null);
  }

  /** Abre el modal de confirmación en vez de finalizar directo (evita misclicks). */
  onEnd(target: InExtractionItem): void {
    this.finishTarget.set(target);
    this.finishModalOpen.set(true);
  }

  /** El modal confirma con la observación (puede ser ''). Dispara endExtraction y cierra. */
  onEndConfirmed(observation: string): void {
    const target = this.finishTarget();
    this.finishModalOpen.set(false);
    if (!target) return;
    this.store.dispatch(A.endExtraction({ id: target.id, observation }));
    this.finishTarget.set(null);
  }

  onFinishDismissed(): void {
    this.finishTarget.set(null);
  }

  // --- Undo de 5s ----------------------------------------------------------

  /**
   * Muestra el toast de undo con timer de 5s. El nombre del extractor se resuelve
   * desde boxAssignments por boxNumber (fuente de verdad de quién atiende ese box).
   */
  private showUndoToast(boxNumber: number, attentionId: number): void {
    this.clearUndoTimer();
    const extractorName =
      this.boxAssignments().find((b) => b.boxNumber === boxNumber)?.extractorFullName ?? null;
    const detail = extractorName ? `Box ${boxNumber} · ${extractorName}` : `Box ${boxNumber}`;
    this.messages.add({
      key: UNDO_TOAST_KEY,
      severity: 'success',
      summary: 'Extracción asignada',
      detail,
      data: { attentionId },
      life: UNDO_WINDOW_MS,
      closable: true,
    });
    // Cuando se cierra la ventana, el toast desaparece y la asignación queda firme.
    this.undoTimer = setTimeout(() => {
      this.undoTimer = null;
    }, UNDO_WINDOW_MS);
  }

  /** Click en "Deshacer": revierte la asignación dentro de la ventana de 5s. */
  onUndoAssign(): void {
    const la = this.lastAssigned();
    this.messages.clear(UNDO_TOAST_KEY);
    this.clearUndoTimer();
    if (!la) return;
    this.store.dispatch(A.unassignExtraction({ id: la.attentionId }));
  }

  private clearUndoTimer(): void {
    if (this.undoTimer != null) {
      clearTimeout(this.undoTimer);
      this.undoTimer = null;
    }
  }
}
