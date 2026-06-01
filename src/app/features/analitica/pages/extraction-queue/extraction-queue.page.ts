import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Subject, debounceTime, of } from 'rxjs';
import { PollingHandle, PollingService } from '@core/refresh';
import { TokenService } from '@core/auth/token.service';
import { ExtractorBoxService } from '@core/services/extractor-box.service';
import { NotificationService } from '@core/services/notification.service';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { RefreshIndicatorComponent } from '@shared/ui/components/refresh-indicator/refresh-indicator.component';
import { StatCardComponent } from '@shared/ui/components/stat-card/stat-card.component';
import { BranchSelectorChipComponent } from '../../components/branch-selector-chip/branch-selector-chip.component';
import { BoxFabComponent } from '../../components/box-fab/box-fab.component';
import { CancelExtractionDialogComponent } from '../../components/cancel-extraction-dialog/cancel-extraction-dialog.component';
import { InProgressExtractionCardComponent } from '../../components/in-progress-extraction-card/in-progress-extraction-card.component';
import { TakePatientDrawerComponent } from '../../components/take-patient-drawer/take-patient-drawer.component';
import { AwaitingExtractionItem, BranchOption, InExtractionItem } from '../../models/extraction.model';
import * as A from '../../store/extraction/extraction.actions';
import {
  selectAwaiting,
  selectBoxOccupancy,
  selectBranches,
  selectLastRefreshAt,
  selectMine,
  selectMutating,
  selectSelectedBranch,
  selectSelectedBranchId,
  selectStats,
} from '../../store/extraction/extraction.selectors';

const POLL_INTERVAL_MS = 5000;

@Component({
  selector: 'app-extraction-queue-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    InputTextModule,
    TooltipModule,
    EmptyStateComponent,
    RefreshIndicatorComponent,
    StatCardComponent,
    BranchSelectorChipComponent,
    BoxFabComponent,
    InProgressExtractionCardComponent,
    CancelExtractionDialogComponent,
    TakePatientDrawerComponent,
  ],
  template: `
    <section class="page">
      <header class="page__header">
        <div class="page__title">
          <h1>Cola de extracción</h1>
          <p class="muted">Pacientes esperando ser atendidos por extracción.</p>
        </div>
        <div class="head-right">
          <ui-refresh-indicator
            [lastRefreshAt]="lastRefreshAt()"
            [paused]="paused()"
          />
          <app-branch-selector-chip
            [selected]="selectedBranch()"
            [options]="branches()"
            (selectBranch)="onBranchChange($event)"
          />
          <app-box-fab
            [occupancy]="occupancy()"
            [myBox]="myBox()"
            [myUserId]="myUserId()"
            [mutating]="mutating()"
            (boxSelected)="onBoxChange($event)"
          />
        </div>
      </header>

      @if (selectedBranchId() == null) {
        <div class="empty-state-big">
          @if (branches().length > 0) {
            <i class="pi pi-map-marker"></i>
            <h2>Elegí una sucursal arriba para empezar</h2>
            <p>Las extracciones se filtran por sucursal. Seleccioná una desde el chip para ver la cola.</p>
          } @else {
            <i class="pi pi-lock"></i>
            <h2>No tenés sucursales asignadas</h2>
            <p>Pedile al administrador que te asigne una sucursal. La pantalla queda bloqueada hasta entonces.</p>
          }
        </div>
      } @else {
        @if (stats(); as st) {
          <div class="stats-strip">
            <ui-stat-card label="En cola" [value]="st.queueSize" />
            <ui-stat-card label="Mis extracciones" [value]="mine().length" />
            <ui-stat-card
              label="Espera promedio"
              [value]="st.averageWaitMinutes != null ? st.averageWaitMinutes + ' min' : '—'"
            />
            <ui-stat-card label="Hoy finalizadas por mí" [value]="st.finishedTodayByMe" />
          </div>
        }

        <app-in-progress-extraction-card
          [patient]="firstMine()"
          [mutating]="mutating()"
          (cancelClicked)="onCancelRequest(firstMine())"
          (endClicked)="onEndRequest(firstMine())"
        />

        <section class="block">
          <div class="block__header">
            <h2><i class="pi pi-list"></i> Cola de extracción</h2>
            <span class="block__search">
              <i class="pi pi-search"></i>
              <input
                pInputText
                type="text"
                placeholder="Buscar por nombre o DNI"
                [ngModel]="searchInput()"
                (ngModelChange)="onSearchChange($event)"
              />
            </span>
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
                  <th>Paciente</th>
                  <th>DNI</th>
                  <th>Atención</th>
                  <th>Análisis</th>
                  <th>Espera</th>
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
                  <td>{{ row.patientFullName }}</td>
                  <td>{{ row.patientDni }}</td>
                  <td>{{ row.attentionNumber }}</td>
                  <td>{{ row.analysisCount }}</td>
                  <td>{{ row.waitMinutes }} min</td>
                  <td class="actions-col">
                    <div class="actions-cell">
                      <p-button
                        label="Tomar"
                        icon="pi pi-arrow-right"
                        size="small"
                        [disabled]="!canTakeMore() || mutating()"
                        [pTooltip]="takeTooltip()"
                        (onClick)="onTake(row)"
                      />
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          }
        </section>
      }

      <app-take-patient-drawer
        [(visible)]="drawerOpen"
        [patient]="selectedPatient()"
        [saving]="mutating()"
        (confirm)="onConfirmTake($event)"
      />

      <app-cancel-extraction-dialog
        [(visible)]="cancelDialogOpen"
        [patient]="cancelTarget()"
        [saving]="mutating()"
        (cancelConfirmed)="onCancelConfirmed($event)"
      />
    </section>
  `,
  styles: [`
    :host { display: block; }
    .page { display: flex; flex-direction: column; gap: 18px; padding: 16px; }
    .page__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      flex-wrap: wrap;
    }
    .page__title h1 { margin: 0; font-size: 22px; }
    .head-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    h2 { margin: 0 0 12px; font-size: 16px; display: inline-flex; align-items: center; gap: 8px; }
    .muted { color: var(--ds-text-muted, #64748b); margin: 4px 0 0; font-size: 13px; }
    .stats-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .block { background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    .block__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .block__search { display: inline-flex; align-items: center; gap: 6px; }
    .block__search input { min-width: 240px; }
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
  `],
})
export class ExtractionQueuePage implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly polling = inject(PollingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly boxService = inject(ExtractorBoxService);
  private readonly notifier = inject(NotificationService);
  private readonly tokenService = inject(TokenService);

  readonly pollIntervalMs = POLL_INTERVAL_MS;

  readonly awaiting = this.store.selectSignal(selectAwaiting);
  readonly mine = this.store.selectSignal(selectMine);
  readonly stats = this.store.selectSignal(selectStats);
  readonly mutating = this.store.selectSignal(selectMutating);
  readonly lastRefreshAt = this.store.selectSignal(selectLastRefreshAt);
  readonly branches = this.store.selectSignal(selectBranches);
  readonly selectedBranch = this.store.selectSignal(selectSelectedBranch);
  readonly selectedBranchId = this.store.selectSignal(selectSelectedBranchId);
  readonly occupancy = this.store.selectSignal(selectBoxOccupancy);

  readonly myBox = this.boxService.box;
  readonly myUserId = signal<number | null>(this.tokenService.getUserId());

  readonly canTakeMore = computed(() => this.mine().length === 0);
  readonly firstMine = computed<InExtractionItem | null>(() => this.mine()[0] ?? null);

  readonly drawerOpen = signal(false);
  readonly cancelDialogOpen = signal(false);
  readonly cancelTarget = signal<InExtractionItem | null>(null);
  readonly selectedPatient = signal<AwaitingExtractionItem | null>(null);
  readonly searchInput = signal('');
  readonly paused = computed(() => this.drawerOpen() || this.cancelDialogOpen());

  readonly takeTooltip = computed(() => {
    if (!this.canTakeMore()) return 'Ya tenés una extracción en curso.';
    if (this.selectedBranchId() == null) return 'Elegí una sucursal arriba.';
    return '';
  });

  private readonly search$ = new Subject<string>();
  private handle: PollingHandle | null = null;
  /**
   * Guard para no auto-seleccionar la sucursal más de una vez.
   * El effect que sincroniza branches → selectedBranch corre cada vez que
   * cambia la lista (incluyendo después de un setSelectedBranch(null) por
   * 403), y sin este flag entraríamos en loop.
   */
  private autoSelectedOnce = false;

  constructor() {
    this.search$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => this.store.dispatch(A.setSearch({ search: q })));

    // Pausar el polling mientras un overlay está abierto. Al cerrar, dispara
    // un poke inmediato para sincronizar.
    effect(() => {
      const open = this.paused();
      if (!this.handle) return;
      this.handle.setActive(!open);
      if (!open) this.handle.pokeNow();
    });

    // Auto-elegir sucursal cuando branches está disponible: priorizar la
    // persistida en localStorage si sigue en la lista; sino, la primera.
    effect(() => {
      const list = this.branches();
      if (list.length === 0 || this.autoSelectedOnce) return;
      const currentSelected = this.selectedBranchId();
      if (currentSelected != null) {
        // Validar que la persistida siga en la lista.
        const stillThere = list.some((b) => b.id === currentSelected);
        if (!stillThere) {
          this.dispatchBranchChange(list[0].id);
        }
        this.autoSelectedOnce = true;
        return;
      }
      const persisted = this.boxService.selectedBranchId();
      const startId = persisted != null && list.some((b) => b.id === persisted)
        ? persisted
        : list[0].id;
      this.dispatchBranchChange(startId);
      this.autoSelectedOnce = true;
    });

    // Sincronizar el branchId del service con el del store cuando éste cambia
    // (ej. effect de 403 lo nullea).
    effect(() => {
      const fromStore = this.selectedBranchId();
      const fromService = this.boxService.selectedBranchId();
      if (fromStore !== fromService) {
        this.boxService.setSelectedBranch(fromStore);
      }
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
    this.search$.complete();
  }

  onSearchChange(value: string): void {
    this.searchInput.set(value);
    this.search$.next(value);
  }

  onBranchChange(branch: BranchOption): void {
    if (branch.id === this.selectedBranchId()) return;
    this.dispatchBranchChange(branch.id);
  }

  private dispatchBranchChange(branchId: number | null): void {
    this.boxService.setSelectedBranch(branchId);
    this.store.dispatch(A.setSelectedBranch({ branchId }));
  }

  onBoxChange(box: number): void {
    this.boxService.setBox(box);
    this.notifier.success(`Tu box ahora es ${box}.`);
  }

  onTake(item: AwaitingExtractionItem): void {
    if (!this.canTakeMore()) return;
    if (this.selectedBranchId() == null) {
      this.notifier.error('Elegí una sucursal arriba antes de tomar pacientes.');
      return;
    }
    this.selectedPatient.set(item);
    this.drawerOpen.set(true);
  }

  onConfirmTake(payload: { id: number; box: number }): void {
    const patient = this.selectedPatient();
    const branchId = this.selectedBranchId();
    this.drawerOpen.set(false);
    this.selectedPatient.set(null);
    if (!patient || branchId == null) return;

    this.boxService.setBox(payload.box);
    this.store.dispatch(A.assignExtractor({
      id: patient.id,
      box: payload.box,
      branchId,
    }));
  }

  onCancelRequest(target: InExtractionItem | null): void {
    if (!target) return;
    this.cancelTarget.set(target);
    this.cancelDialogOpen.set(true);
  }

  onCancelConfirmed(payload: { reason: string }): void {
    const target = this.cancelTarget();
    this.cancelDialogOpen.set(false);
    if (!target) return;
    this.store.dispatch(A.cancelExtraction({ id: target.id, reason: payload.reason }));
    this.cancelTarget.set(null);
  }

  onEndRequest(target: InExtractionItem | null): void {
    if (!target) return;
    this.store.dispatch(A.endExtraction({ id: target.id }));
  }
}
