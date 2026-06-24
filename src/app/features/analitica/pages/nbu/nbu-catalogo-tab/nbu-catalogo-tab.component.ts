import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { TokenService } from '@core/auth/token.service';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { UiRowExpansionDirective } from '@shared/ui/components/data-table/ui-row-expansion.directive';
import { TableAction, TableColumn } from '@shared/ui/models/table-column.model';
import { CatalogRow, ConfigResumen, Determination } from '../../../models/nomenclador.model';
import { loadConfigResumen, loadDeterminations, loadNomenclador } from '../../../store/nomenclador/nomenclador.actions';
import { selectCatalogRows, selectConfigResumen, selectDeterminations } from '../../../store/nomenclador/nomenclador.selectors';
import { matchesFilter } from '../nbu-filter';
import { NbuConfigDrawerComponent } from '../nbu-config-drawer/nbu-config-drawer.component';

/**
 * Tab "Catálogo de análisis" de la pantalla NBU (KAN-118).
 *
 * Usa el componente genérico `ui-table` con fila expandible (`expandable`). Las
 * determinaciones se cargan lazy: al expandir, `(rowExpand)` despacha loadDeterminations
 * una sola vez por análisis; las re-expansiones reutilizan lo que ya está en el store.
 */
@Component({
  selector: 'lab-nbu-catalogo-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTableComponent, UiCellDirective, UiRowExpansionDirective, NbuConfigDrawerComponent],
  template: `
    <ui-table
      [value]="filteredRows()"
      [columns]="columns"
      [expandable]="true"
      [paginator]="true"
      [rows]="20"
      [rowsPerPageOptions]="[10, 20, 50, 100]"
      [actions]="rowActions"
      size="comfortable"
      dataKey="id"
      emptyHeading="Sin análisis en el catálogo"
      emptyIcon="pi-flask"
      (rowExpand)="onExpand($any($event))"
      (action)="onAction($event)">

      <ng-template uiCell="familyName" let-row>
        @if ($any(row).familyName) {
          <span class="inline-block text-xs rounded px-2 py-0.5 bg-[var(--brand-tint,#eff6ff)] text-[var(--brand-primary,#2563eb)]">
            {{ $any(row).familyName }}
          </span>
        } @else {
          <span class="text-[var(--ds-text-muted,#71717a)]">—</span>
        }
      </ng-template>

      <ng-template uiCell="nbuCode" let-row>
        @if ($any(row).nbuCode) {
          <span class="font-mono text-xs rounded px-1.5 py-0.5 bg-[var(--ds-surface,#f1f5f9)] text-[var(--ds-text-muted,#475569)]">
            {{ $any(row).nbuCode }}
          </span>
        } @else {
          <span class="text-[var(--ds-text-muted,#71717a)]">—</span>
        }
      </ng-template>

      <ng-template uiCell="cantidadUb" let-row>
        <span class="tabular-nums">{{ ub($any(row)) }}</span>
      </ng-template>

      <ng-template uiRowExpansion let-row>
        @let dets = determinationsFor($any(row).id);
        <div class="px-2 py-1">
          <div class="text-xs font-semibold text-[var(--ds-text-muted,#71717a)] uppercase mb-2">
            Determinaciones
          </div>
          @if (dets === null) {
            <span class="text-xs text-[var(--ds-text-muted,#71717a)] italic">Cargando…</span>
          } @else if (dets.length === 0) {
            <span class="text-xs text-[var(--ds-text-muted,#71717a)]">Sin determinaciones</span>
          } @else {
            <ul class="flex flex-wrap gap-2">
              @for (det of dets; track det.id) {
                <li class="text-xs bg-white border border-[var(--ds-border,#e4e4e7)] rounded px-2 py-0.5">
                  {{ det.name }}
                </li>
              }
            </ul>
          }

          @let cfg = configResumenFor($any(row).id);
          <div class="text-xs font-semibold text-[var(--ds-text-muted,#71717a)] uppercase mt-3 mb-2">
            Configuración
          </div>
          @if (cfg === null) {
            <span class="text-xs text-[var(--ds-text-muted,#71717a)] italic">Cargando…</span>
          } @else {
            <div class="text-sm text-[var(--ds-text-muted,#71717a)] flex flex-wrap gap-x-4 gap-y-1">
              <span>Nombre propio: {{ cfg.customName ?? '—' }}</span>
              <span>Ayuno: {{ cfg.ayuno ?? '—' }}</span>
            </div>
          }
        </div>
      </ng-template>
    </ui-table>

    <lab-nbu-config-drawer
      [visible]="drawerVisible()"
      [analysis]="drawerRow()"
      (cancel)="drawerVisible.set(false)"
      (saved)="onConfigSaved($event)" />
  `,
})
export class NbuCatalogoTabComponent {
  private readonly store = inject(Store);
  private readonly tokens = inject(TokenService);

  /** Solo ADMINISTRADOR ve/opera la configuración por tenant (gating FE; el BE también gatea). */
  protected readonly isAdmin = signal(this.tokens.getRoles().includes('ADMINISTRADOR'));

  /** Filtros provistos por el shell (búsqueda + familias seleccionadas). */
  readonly search = input<string>('');
  readonly families = input<readonly string[]>([]);

  /**
   * Solicitud de configuración de una fila. Se mantiene como output para consumidores
   * externos, pero el propio tab abre el drawer (F5): el drawer es un editor aislado.
   */
  readonly configRequested = output<CatalogRow>();

  /** Estado del drawer de configuración por análisis (F5). */
  protected readonly drawerVisible = signal(false);
  protected readonly drawerRow = signal<CatalogRow | null>(null);

  /** Acciones por fila del ui-table. "Configurar" se oculta a no-admin. */
  protected readonly rowActions: readonly TableAction[] = [
    { key: 'config', icon: 'pi-pencil', label: 'Configurar', hidden: () => !this.isAdmin() },
  ];

  /** Maneja el click en una acción de fila: abre el drawer de config y notifica al exterior. */
  protected onAction(e: { key: string; row: unknown }): void {
    if (e.key === 'config') {
      const row = e.row as CatalogRow;
      this.drawerRow.set(row);
      this.drawerVisible.set(true);
      this.configRequested.emit(row);
    }
  }

  /**
   * El drawer guardó: cerrar, refrescar el resumen de config de ese análisis y recargar
   * el catálogo para que las columnas Código/Análisis reflejen el alias nuevo (shortCode/customName).
   */
  protected onConfigSaved(analysisId: number): void {
    this.drawerVisible.set(false);
    this.store.dispatch(loadConfigResumen({ analysisId }));
    this.store.dispatch(loadNomenclador());
  }

  /** Filas del catálogo con cantidadUb resuelta para la versión seleccionada. */
  private readonly allRows = this.store.selectSignal(selectCatalogRows);

  /** Filas tras aplicar búsqueda + filtro de familia. */
  protected readonly filteredRows = computed(() =>
    this.allRows().filter(r => matchesFilter(r, this.search(), this.families())),
  );

  readonly columns: readonly TableColumn[] = [
    { field: 'shortCode', header: 'Código' },
    { field: 'name', header: 'Análisis' },
    { field: 'familyName', header: 'Familia' },
    { field: 'nbuCode', header: 'Cód. NBU' },
    { field: 'cantidadUb', header: 'Cantidad U.B.', align: 'right' },
  ];

  /** IDs para los que ya se despachó loadDeterminations (evita re-despachos). */
  private readonly loadedIds = new Set<number>();

  /** Caché de signals por analysisId para no crear un nuevo selector en cada render. */
  private readonly detSignals = new Map<number, ReturnType<typeof this.store.selectSignal>>();

  /** Caché de signals del resumen de config por analysisId. */
  private readonly cfgSignals = new Map<number, ReturnType<typeof this.store.selectSignal>>();

  /** Formatea la cantidad de U.B. a 2 decimales (o — si no está configurada). */
  protected ub(row: CatalogRow): string {
    return row.cantidadUb == null ? '—' : row.cantidadUb.toFixed(2).replace('.', ',');
  }

  /**
   * Determinaciones para un analysisId directamente desde el store.
   * null = no cargado, [] = cargado sin datos, Determination[] = cargado con datos.
   */
  protected determinationsFor(id: number): Determination[] | null {
    if (!this.detSignals.has(id)) {
      this.detSignals.set(id, this.store.selectSignal(selectDeterminations(id)));
    }
    return (this.detSignals.get(id) as () => Determination[] | null)();
  }

  /**
   * Resumen de config para un analysisId directamente desde el store.
   * null = no cargado todavía, ConfigResumen = cargado.
   */
  protected configResumenFor(id: number): ConfigResumen | null {
    if (!this.cfgSignals.has(id)) {
      this.cfgSignals.set(id, this.store.selectSignal(selectConfigResumen(id)));
    }
    return (this.cfgSignals.get(id) as () => ConfigResumen | null)();
  }

  /** Lazy-load: la primera expansión de cada análisis despacha determinaciones + resumen de config. */
  protected onExpand(row: CatalogRow): void {
    if (this.loadedIds.has(row.id)) return;
    this.loadedIds.add(row.id);
    this.store.dispatch(loadDeterminations({ analysisId: row.id }));
    this.store.dispatch(loadConfigResumen({ analysisId: row.id }));
  }
}
