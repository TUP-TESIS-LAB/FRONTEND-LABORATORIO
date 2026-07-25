import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PollingService } from '@core/refresh';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { humanizeBackendError, type BackendErrorShape } from '@shared/utils/error-messages';
import { CURRENT_BRANCH } from '../../data/catalogs';
import { groupTubes, type Tube } from '../../models/tube.model';
import type { LabelWorklistItem } from '../../models/label-worklist.model';
import { rowActionsFor } from '../../data/state-machine.config';
import { createRowTransitionDialog } from '../row-transition-dialog';
import type { RowActionKey } from '../../models/transition.model';
import { TransitionDialogComponent } from '../../components/transition-dialog/transition-dialog.component';
import { RowActionsMenuComponent } from '@shared/ui/components/row-actions-menu/row-actions-menu.component';
import { initMuestras, loadProcesamiento } from '../../store/muestras.actions';
import { selectProcesamientoItems, selectDerivadosItems, selectMuestrasBranchName, selectMuestrasError } from '../../store/muestras.selectors';
import { loadTemplates } from '../../store/worksheet-templates/worksheet-templates.actions';
import { selectTemplates, selectTemplatesError } from '../../store/worksheet-templates/worksheet-templates.selectors';
import { PlanillasModalComponent } from '../../components/planillas/planillas-modal.component';
import { WorksheetConfigModalComponent } from '../../components/planillas/worksheet-config-modal.component';
import { MarcarCompletadasModalComponent, type ResumenMuestra } from '../../components/marcar-completadas-modal/marcar-completadas-modal.component';
import { ProcesamientoProgresoService } from '../../services/procesamiento-progreso.service';
import { ResultadosApiService } from '../../services/resultados-api.service';
import { DateEsPipe } from '@shared/pipes/date-es.pipe';

const FILTROS: ReadonlyArray<{ id: 'todos' | 'derivados'; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'derivados', label: 'Derivados' },
];

/**
 * Pantalla de Procesamiento (propia, separada del worklist genérico — GAP-P7).
 * Layout fiel al mockup: stats, scanbar, tabla de muestras en proceso, y acción
 * "Planillas" que abre el flujo de carga por planilla. Datos reales del backend
 * (labels en PROCESSING vía store de muestras); no inventa campos del mockup que
 * el backend no provee (tipo/origen de muestra).
 */
@Component({
  selector: 'app-procesamiento',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, ToastModule, PlanillasModalComponent, WorksheetConfigModalComponent, MarcarCompletadasModalComponent, DateEsPipe, TransitionDialogComponent, RowActionsMenuComponent],
  providers: [MessageService],
  templateUrl: './procesamiento.page.html',
  styleUrl: './procesamiento.page.scss',
})
export class ProcesamientoPage implements OnInit {
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly polling = inject(PollingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messages = inject(MessageService);
  private readonly progresoSvc = inject(ProcesamientoProgresoService);
  private readonly resultados = inject(ResultadosApiService);

  // Slices separados por status: el tab y la lista leen el mismo criterio (filtro), imposible desalinear.
  private readonly procesamientoItems = this.store.selectSignal(selectProcesamientoItems);
  private readonly derivadosItems = this.store.selectSignal(selectDerivadosItems);
  private readonly branchName = this.store.selectSignal(selectMuestrasBranchName);
  private readonly backendError = this.store.selectSignal(selectMuestrasError);
  private readonly templatesError = this.store.selectSignal(selectTemplatesError);
  readonly templates = this.store.selectSignal(selectTemplates);

  readonly FILTROS = FILTROS;
  readonly filtro = signal<'todos' | 'derivados'>('todos');

  /** La lista renderizada sale del slice que corresponde al tab activo. */
  private readonly items = computed<LabelWorklistItem[]>(() =>
    this.filtro() === 'derivados' ? this.derivadosItems() : this.procesamientoItems());

  readonly query = signal('');
  readonly selectedIds = signal<ReadonlySet<string>>(new Set());

  // Filas desplegables: detalle de análisis del tubo (ya en memoria via tube.analyses).
  readonly expanded = signal<ReadonlySet<string>>(new Set());

  readonly rows = computed<Tube[]>(() => groupTubes(this.items(), this.branchName() || CURRENT_BRANCH));
  readonly visibleRows = computed<Tube[]>(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.rows();
    return this.rows().filter(t =>
      t.barcode.toLowerCase().includes(q)
      || t.study.toLowerCase().includes(q)
      || t.patient.toLowerCase().includes(q),
    );
  });

  readonly total = computed(() => this.rows().length);
  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly templatesCount = computed(() => this.templates().length);
  private readonly selectedTubes = computed<Tube[]>(() => {
    const sel = this.selectedIds();
    return this.rows().filter(t => sel.has(t.id));
  });
  readonly selectedProtocolIds = computed<number[]>(() =>
    [...new Set(this.selectedTubes().map(t => t.protocolId).filter((p): p is number => p != null))]);

  /** Análisis únicos de las muestras seleccionadas (dedup por analysisTypeId). */
  readonly seedAnalyses = computed<{ analysisTypeId: number; name: string }[]>(() => {
    const seen = new Set<number>();
    const out: { analysisTypeId: number; name: string }[] = [];
    for (const a of this.selectedTubes().flatMap(t => t.analyses)) {
      if (seen.has(a.analysisTypeId)) continue;
      seen.add(a.analysisTypeId);
      out.push({ analysisTypeId: a.analysisTypeId, name: a.name });
    }
    return out;
  });

  // --- modales de planillas ---
  readonly planillasOpen = signal(false);
  readonly configOpen = signal(false);
  readonly editingTemplateId = signal<number | null>(null);

  // --- marcar completadas (GAP-P2) ---
  readonly completadasOpen = signal(false);
  readonly resumenItems = signal<ResumenMuestra[]>([]);

  // --- menú por-fila (KAN-208): Rollback / Rechazar / Perder ---
  /** Andamiaje del diálogo de transición del menú kebab por-fila. */
  readonly rowDialog = createRowTransitionDialog(this.store, 'procesamiento');

  /** Acciones del menú por-fila, derivadas de la config. */
  readonly rowMenuActions = rowActionsFor('procesamiento');

  onRowAction(key: string, row: Tube): void {
    this.rowDialog.open(key as RowActionKey, row);
  }

  constructor() {
    let lastSig: string | null = null;
    effect(() => {
      const err = this.backendError() ?? this.templatesError();
      const sig = err ? `${(err as { status?: unknown }).status}:${(err as { message?: unknown }).message}` : null;
      if (sig && sig !== lastSig) {
        lastSig = sig;
        this.messages.add({ severity: 'error', summary: 'Error',
          detail: humanizeBackendError(err as BackendErrorShape | null, { fallback: 'No pudimos completar la operación. Probá de nuevo.' }), life: 5000 });
      }
    });
  }

  ngOnInit(): void {
    this.store.dispatch(initMuestras());
    const handle = this.polling.startPolling({
      key: 'procesamiento-page',
      intervalMs: 5000,
      poll: () => { this.store.dispatch(loadProcesamiento({ status: this.currentStatus() })); return of(null); },
    });
    this.destroyRef.onDestroy(() => handle.stop());
  }

  setFiltro(id: 'todos' | 'derivados'): void {
    if (this.filtro() === id) return;
    this.filtro.set(id);
    // La selección de un tab no significa nada en el otro: limpiarla evita que el contador
    // "N seleccionadas" y los botones de lote queden sobre tubos que ya no están en la grilla.
    this.clearSelection();
    // PROCESSING y DERIVED tienen slices separados en el store (muestras.state: procesamiento /
    // derivados) y los ETags se cachean por urlWithParams (status va en los params), así que un 304
    // de un tab nunca pisa al otro. No hace falta invalidar el ETag al cambiar de tab.
    this.store.dispatch(loadProcesamiento({ status: this.currentStatus() }));
  }

  private currentStatus(): 'PROCESSING' | 'DERIVED' {
    return this.filtro() === 'derivados' ? 'DERIVED' : 'PROCESSING';
  }

  setQuery(q: string): void { this.query.set(q); }
  clearSelection(): void { this.selectedIds.set(new Set()); }
  isSelected(id: string): boolean { return this.selectedIds().has(id); }

  // --- expand de análisis (independiente de la selección) ---
  isOpen(id: string): boolean { return this.expanded().has(id); }
  toggleExpand(id: string, ev?: Event): void {
    ev?.stopPropagation();
    this.expanded.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  toggleRow(id: string): void {
    this.selectedIds.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  toggleAll(): void {
    const ids = this.visibleRows().map(r => r.id);
    const all = this.selectedIds();
    const allSelected = ids.length > 0 && ids.every(id => all.has(id));
    this.selectedIds.set(allSelected ? new Set() : new Set(ids));
  }
  readonly allVisibleSelected = computed(() => {
    const ids = this.visibleRows().map(r => r.id);
    return ids.length > 0 && ids.every(id => this.selectedIds().has(id));
  });

  // --- planillas ---
  openPlanillas(): void { this.store.dispatch(loadTemplates()); this.planillasOpen.set(true); }
  closePlanillas(): void { this.planillasOpen.set(false); }
  onNewSheet(): void { this.editingTemplateId.set(null); this.planillasOpen.set(false); this.configOpen.set(true); }
  onEditSheet(id: number): void { this.editingTemplateId.set(id); this.planillasOpen.set(false); this.configOpen.set(true); }
  closeConfig(): void { this.configOpen.set(false); }
  onConfigSaved(): void { this.configOpen.set(false); this.planillasOpen.set(true); }

  onCargarConPlanilla(templateId: number): void {
    const ids = this.selectedProtocolIds();
    if (ids.length === 0) return;
    this.planillasOpen.set(false);
    this.router.navigate(['/analitica/procesamiento/cargar'], {
      queryParams: { protocols: ids.join(','), templateId },
    });
  }

  // --- GAP-P2: marcar completadas ---
  abrirCompletadas(): void {
    const tubes = this.selectedTubes();
    if (tubes.length === 0) return;
    const protocolIds = [...new Set(tubes.map(t => t.protocolId))];
    // Usa la cache de progreso (consulta backend solo lo que falta).
    this.progresoSvc.getMany(protocolIds).pipe(
      catchError(err => { this.error(err); return of([]); }),
    ).subscribe(progresos => {
      const byProtocol = new Map(progresos.map(p => [p.protocolId, p]));
      const items: ResumenMuestra[] = tubes.map(t => {
        const p = byProtocol.get(t.protocolId);
        return {
          protocolId: t.protocolId,
          resultIds: p?.resultIds ?? [],
          filled: p?.filled ?? 0,
          total: p?.total ?? 0,
          status: p?.status ?? 'sin',
          code: t.barcode,
          patient: t.patient,
        };
      });
      this.resumenItems.set(items);
      this.completadasOpen.set(true);
    });
  }
  cerrarCompletadas(): void { this.completadasOpen.set(false); }

  onMarcarCompletadas(resultIds: number[]): void {
    this.completadasOpen.set(false);
    if (resultIds.length === 0) return;
    this.resultados.markReadyBatch(resultIds).pipe(catchError(err => { this.error(err); return of(null); }))
      .subscribe(res => {
        // null = error ya mostrado por this.error; no marcar como completado.
        if (res === null) return;
        // invalidar progreso de los protocolos afectados (se recalcula la próxima vez)
        for (const it of this.resumenItems()) this.progresoSvc.invalidate(it.protocolId);
        this.clearSelection();
        this.messages.add({ severity: 'success', summary: 'Listo', detail: 'Resultados marcados como completados.', life: 3500 });
      });
  }

  private error(err: unknown): void {
    this.messages.add({ severity: 'error', summary: 'Error',
      detail: humanizeBackendError(err as BackendErrorShape | null, { fallback: 'No pudimos completar la operación. Probá de nuevo.' }), life: 5000 });
  }
}
