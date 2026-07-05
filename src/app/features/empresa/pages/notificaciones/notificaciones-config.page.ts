import { ChangeDetectionStrategy, Component, OnInit, Signal, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitch } from 'primeng/toggleswitch';

import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { UiRowExpansionDirective } from '@shared/ui/components/data-table/ui-row-expansion.directive';
import { TableColumn } from '@shared/ui/models/table-column.model';

import { EligibleRecipients, EventConfig, Recipient } from '../../models/notificaciones-config.model';
import {
  loadConfigs, loadEligible, updateConfig, updateConfigFailure, updateConfigSuccess,
} from '../../store/notificaciones-config/notificaciones-config.actions';
import { selectEligible, selectEventConfigs } from '../../store/notificaciones-config/notificaciones-config.selectors';
import { RecipientsEditorComponent } from './components/recipients-editor/recipients-editor.component';
import {
  StatusFilter, filterConfigs, moduleLabel, moduleOptions, recipientsSummary,
} from './notificaciones-filter.logic';

/**
 * Tab "Notificaciones" de Empresa: catálogo de eventos en una `ui-table` expandible con
 * toolbar (buscar / filtro Módulo / Todos-Solo activos). Cada fila se expande al editor de
 * destinatarios (`emp-recipients-editor`). El store (`NotifConfigEffects`) se registra
 * scopeado a la ruta en `empresa.routes.ts`.
 */
@Component({
  selector: 'emp-notificaciones-config-page',
  standalone: true,
  imports: [
    FormsModule, ToastModule, SelectModule, SelectButtonModule, TagModule, ToggleSwitch,
    DataTableComponent, UiCellDirective, UiRowExpansionDirective, RecipientsEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  template: `
    <p-toast />
    <section class="emp-notif-config">
      <p class="ui-text-sm ui-text-muted emp-notif-intro">
        Elegí qué eventos disparan notificaciones y quién las recibe.
      </p>

      <div class="emp-notif-toolbar">
        <span class="emp-notif-search">
          <i class="pi pi-search"></i>
          <input
            type="text"
            [ngModel]="search()"
            (ngModelChange)="search.set($event)"
            placeholder="Buscar evento" />
        </span>

        <p-select
          [options]="moduleOptions()"
          optionLabel="label"
          optionValue="value"
          [ngModel]="moduleFilter()"
          (ngModelChange)="moduleFilter.set($event)"
          appendTo="body"
          styleClass="emp-notif-module" />

        <p-selectButton
          [options]="statusOptions"
          optionLabel="label"
          optionValue="value"
          [allowEmpty]="false"
          [ngModel]="statusFilter()"
          (ngModelChange)="statusFilter.set($event ?? 'all')" />

        <span class="emp-notif-count">
          {{ visible().length }} {{ visible().length === 1 ? 'evento' : 'eventos' }} ·
          {{ activeCount() }} {{ activeCount() === 1 ? 'activo' : 'activos' }}
        </span>
      </div>

      <ui-table
        [value]="visible()"
        [columns]="columns"
        dataKey="eventType"
        [expandable]="true"
        (rowExpand)="onRowExpand($any($event))"
        emptyHeading="Sin eventos"
        emptyIcon="pi-bell"
        emptyDescription="No hay eventos que coincidan con los filtros.">

        <ng-template [uiCell]="'title'" let-row>
          <span class="emp-evt-title">{{ row.title }}</span>
          @if (!row.hasTrigger) {
            <p-tag value="Próximamente" severity="secondary" styleClass="emp-evt-soon" />
          }
        </ng-template>

        <ng-template [uiCell]="'section'" let-row>
          <span class="emp-mod-badge" [attr.data-mod]="row.section">{{ moduleLabel(row.section) }}</span>
        </ng-template>

        <ng-template [uiCell]="'enabled'" let-row>
          <p-toggleswitch
            [ngModel]="row.enabled"
            [disabled]="!row.hasTrigger"
            (onChange)="onToggle(row, $event.checked)" />
        </ng-template>

        <ng-template [uiCell]="'recipients'" let-row>
          @if (row.recipients.length) {
            <span class="emp-dest-summary">{{ recipientsSummary(row) }}</span>
          } @else {
            <span class="emp-dest-none">Sin destinatarios</span>
          }
        </ng-template>

        <ng-template uiRowExpansion let-row>
          <emp-recipients-editor
            [config]="row"
            [eligible]="eligibleFor(row.eventType)()"
            (recipientsChange)="onRecipients(row, $event)" />
        </ng-template>
      </ui-table>
    </section>
  `,
  styles: [`
    .emp-notif-config { display: flex; flex-direction: column; gap: var(--space-4); }
    .emp-notif-intro { margin: 0; }

    .emp-notif-toolbar {
      display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3);
    }
    .emp-notif-search {
      position: relative; display: inline-flex; align-items: center; flex: 1 1 220px; min-width: 200px;
    }
    .emp-notif-search i {
      position: absolute; left: 10px; color: #94a3b8; font-size: 13px; pointer-events: none;
    }
    .emp-notif-search input {
      width: 100%; padding: 8px 12px 8px 30px;
      border: 1px solid #d5dde7; border-radius: 8px; font-size: 13px; background: #fff;
    }
    .emp-notif-search input:focus { outline: none; border-color: #93b4f5; }
    .emp-notif-count { margin-left: auto; font-size: 12px; color: #6b7280; white-space: nowrap; }

    .emp-evt-title { color: var(--ds-text); font-weight: 600; }

    /* Badge de módulo — neutro por default, con acentos por sección. */
    .emp-mod-badge {
      display: inline-block; padding: 2px 9px; border-radius: 999px;
      font-size: 11px; font-weight: 600; white-space: nowrap;
      background: #eef2f7; color: #475569;
    }
    .emp-mod-badge[data-mod="FINANCIERO"] { background: #ecfdf5; color: #047857; }
    .emp-mod-badge[data-mod="EXTRACCIONES"] { background: #fef3f2; color: #b42318; }
    .emp-mod-badge[data-mod="OBRAS_SOCIALES"] { background: #eef4ff; color: #1d4ed8; }
    .emp-mod-badge[data-mod="DOMICILIO"] { background: #fff7ed; color: #c2410c; }
    .emp-mod-badge[data-mod="URGENCIAS"] { background: #fef2f2; color: #dc2626; }
    .emp-mod-badge[data-mod="STOCK"] { background: #f5f3ff; color: #6d28d9; }

    .emp-dest-summary { font-size: 13px; color: var(--ds-text); }
    .emp-dest-none { font-size: 12px; color: #94a3b8; font-style: italic; }
  `],
})
export class NotificacionesConfigPage implements OnInit {
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly messageService = inject(MessageService);

  protected readonly configs = this.store.selectSignal(selectEventConfigs);

  // ── Filtros (estado local de UI, no del store) ──
  protected readonly search = signal('');
  protected readonly moduleFilter = signal('all');
  protected readonly statusFilter = signal<StatusFilter>('all');

  protected readonly statusOptions = [
    { label: 'Todos', value: 'all' as StatusFilter },
    { label: 'Solo activos', value: 'active' as StatusFilter },
  ];

  protected readonly columns: readonly TableColumn[] = [
    { field: 'title', header: 'Evento' },
    { field: 'section', header: 'Módulo' },
    { field: 'enabled', header: 'Estado', align: 'center' },
    { field: 'recipients', header: 'Destinatarios' },
  ];

  protected readonly moduleOptions = computed(() => moduleOptions(this.configs()));

  protected readonly visible = computed(() =>
    filterConfigs(this.configs(), {
      search: this.search(),
      module: this.moduleFilter(),
      status: this.statusFilter(),
    }));

  protected readonly activeCount = computed(() => this.visible().filter((c) => c.enabled).length);

  protected readonly moduleLabel = moduleLabel;
  protected readonly recipientsSummary = recipientsSummary;

  /**
   * `selectEligible(eventType)` es un selector-factory: memoizamos por eventType para no recrear
   * el selector ni la suscripción en cada change detection.
   */
  private readonly eligibleSignals = new Map<string, Signal<EligibleRecipients | undefined>>();

  constructor() {
    this.actions$.pipe(ofType(updateConfigSuccess), takeUntilDestroyed()).subscribe(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Configuración guardada',
        detail: 'Los cambios se guardaron correctamente.',
      });
    });

    this.actions$.pipe(ofType(updateConfigFailure), takeUntilDestroyed()).subscribe(() => {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo guardar la configuración. Intentá de nuevo.',
      });
    });
  }

  ngOnInit(): void {
    this.store.dispatch(loadConfigs());
  }

  protected eligibleFor(eventType: string): Signal<EligibleRecipients | undefined> {
    let sig = this.eligibleSignals.get(eventType);
    if (!sig) {
      sig = this.store.selectSignal(selectEligible(eventType));
      this.eligibleSignals.set(eventType, sig);
    }
    return sig;
  }

  /** Al expandir una fila se cargan los elegibles de ese evento (antes se cargaba al abrir el picker). */
  protected onRowExpand(row: EventConfig): void {
    this.store.dispatch(loadEligible({ eventType: row.eventType }));
  }

  protected onToggle(row: EventConfig, enabled: boolean): void {
    this.store.dispatch(updateConfig({ eventType: row.eventType, enabled, recipients: row.recipients }));
  }

  protected onRecipients(row: EventConfig, recipients: Recipient[]): void {
    this.store.dispatch(updateConfig({ eventType: row.eventType, enabled: row.enabled, recipients }));
  }
}
