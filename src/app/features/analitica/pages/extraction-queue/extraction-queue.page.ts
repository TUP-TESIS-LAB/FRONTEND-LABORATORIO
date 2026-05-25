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
import { Store } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Subject, debounceTime, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PollingHandle, PollingService } from '@core/refresh';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { RefreshIndicatorComponent } from '@shared/ui/components/refresh-indicator/refresh-indicator.component';
import { StatCardComponent } from '@shared/ui/components/stat-card/stat-card.component';
import { TakePatientDrawerComponent } from '../../components/take-patient-drawer/take-patient-drawer.component';
import { AwaitingExtractionItem } from '../../models/extraction.model';
import * as A from '../../store/extraction/extraction.actions';
import {
  selectAwaiting,
  selectCanTakeMore,
  selectLastRefreshAt,
  selectMine,
  selectMutating,
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
    ConfirmDialogModule,
    TooltipModule,
    EmptyStateComponent,
    RefreshIndicatorComponent,
    StatCardComponent,
    TakePatientDrawerComponent,
  ],
  providers: [ConfirmationService],
  template: `
    <section class="page">
      <header class="page__header">
        <div>
          <h1>Cola de extracción</h1>
          <p class="muted">Pacientes esperando ser atendidos por extracción.</p>
        </div>
        <ui-refresh-indicator
          [lastRefreshAt]="lastRefreshAt()"
          [paused]="paused()"
          [intervalMs]="pollIntervalMs"
        />
      </header>

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

      <section class="block">
        <h2><i class="pi pi-user"></i> Mis extracciones en curso</h2>
        @if (mine().length === 0) {
          <ui-empty-state
            icon="pi-inbox"
            heading="Sin extracciones en curso"
            description="Cuando tomes un paciente de la cola aparecerá acá."
          />
        } @else {
          <p-table [value]="mine()" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Paciente</th>
                <th>DNI</th>
                <th>Atención</th>
                <th>Box</th>
                <th class="actions-col">Acciones</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td>{{ row.patientFullName }}</td>
                <td>{{ row.patientDni }}</td>
                <td>{{ row.attentionNumber }}</td>
                <td>{{ row.attentionBox }}</td>
                <td class="actions-col">
                  <p-button
                    label="Finalizar"
                    icon="pi pi-check"
                    severity="success"
                    size="small"
                    [disabled]="mutating()"
                    (onClick)="onEnd(row)"
                  />
                  <p-button
                    label="Cancelar"
                    icon="pi pi-times"
                    severity="secondary"
                    [text]="true"
                    size="small"
                    [disabled]="mutating()"
                    (onClick)="onCancel(row)"
                  />
                </td>
              </tr>
            </ng-template>
          </p-table>
        }
      </section>

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
                  <p-button
                    label="Tomar"
                    icon="pi pi-arrow-right"
                    size="small"
                    [disabled]="!canTakeMore() || mutating()"
                    [pTooltip]="!canTakeMore() ? 'Ya tenés una extracción en curso.' : ''"
                    (onClick)="onTake(row)"
                  />
                </td>
              </tr>
            </ng-template>
          </p-table>
        }
      </section>

      <app-take-patient-drawer
        [(visible)]="drawerOpen"
        [patient]="selectedPatient()"
        [saving]="mutating()"
        (confirm)="onConfirmTake($event)"
      />

      <p-confirmDialog />
    </section>
  `,
  styles: [`
    :host { display: block; }
    .page { display: flex; flex-direction: column; gap: 20px; padding: 16px; }
    .page__header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    h1 { margin: 0; font-size: 22px; }
    h2 { margin: 0 0 12px; font-size: 16px; display: inline-flex; align-items: center; gap: 8px; }
    .muted { color: var(--ds-text-muted, #64748b); margin: 4px 0 0; font-size: 13px; }
    .stats-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .block { background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    .block__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .block__search { display: inline-flex; align-items: center; gap: 6px; }
    .block__search input { min-width: 240px; }
    .actions-col { width: 1%; white-space: nowrap; display: flex; gap: 6px; justify-content: flex-end; }
    tr.is-urgent { background: rgba(239,68,68,.04); }
  `],
})
export class ExtractionQueuePage implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly polling = inject(PollingService);
  private readonly confirmer = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly pollIntervalMs = POLL_INTERVAL_MS;

  readonly awaiting = this.store.selectSignal(selectAwaiting);
  readonly mine = this.store.selectSignal(selectMine);
  readonly stats = this.store.selectSignal(selectStats);
  readonly mutating = this.store.selectSignal(selectMutating);
  readonly canTakeMore = this.store.selectSignal(selectCanTakeMore);
  readonly lastRefreshAt = this.store.selectSignal(selectLastRefreshAt);

  readonly drawerOpen = signal(false);
  readonly selectedPatient = signal<AwaitingExtractionItem | null>(null);
  readonly searchInput = signal('');
  readonly paused = computed(() => this.drawerOpen());

  private readonly search$ = new Subject<string>();
  private handle: PollingHandle | null = null;

  constructor() {
    this.search$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => this.store.dispatch(A.setSearch({ search: q })));

    // Pausar el polling mientras el drawer está abierto. Al cerrar, dispara
    // un poke inmediato para sincronizar.
    effect(() => {
      const open = this.drawerOpen();
      if (!this.handle) return;
      this.handle.setActive(!open);
      if (!open) this.handle.pokeNow();
    });
  }

  ngOnInit(): void {
    this.store.dispatch(A.refreshAll());
    this.handle = this.polling.startPolling({
      key: 'extraction-queue',
      intervalMs: POLL_INTERVAL_MS,
      poll: () => {
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

  onTake(item: AwaitingExtractionItem): void {
    if (!this.canTakeMore()) {
      return;
    }
    this.selectedPatient.set(item);
    this.drawerOpen.set(true);
  }

  onConfirmTake(payload: { id: number; box: number }): void {
    this.store.dispatch(A.assignExtractor(payload));
    this.drawerOpen.set(false);
    this.selectedPatient.set(null);
  }

  onCancel(item: { id: number; patientFullName: string }): void {
    this.confirmer.confirm({
      header: 'Cancelar extracción',
      message: `¿Cancelar la extracción de ${item.patientFullName}? Volverá a la cola.`,
      acceptLabel: 'Cancelar extracción',
      rejectLabel: 'Volver',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.store.dispatch(A.cancelExtraction({ id: item.id })),
    });
  }

  onEnd(item: { id: number; patientFullName: string }): void {
    this.confirmer.confirm({
      header: 'Finalizar extracción',
      message: `¿Confirmar que terminaste la extracción de ${item.patientFullName}?`,
      acceptLabel: 'Finalizar',
      rejectLabel: 'Volver',
      accept: () => this.store.dispatch(A.endExtraction({ id: item.id })),
    });
  }
}
