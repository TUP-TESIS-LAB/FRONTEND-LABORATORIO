import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PollingService } from '@core/refresh';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { humanizeBackendError, type BackendErrorShape } from '@shared/utils/error-messages';
import { CURRENT_BRANCH } from '../../data/catalogs';
import { groupTubes, type Tube } from '../../models/tube.model';
import { initMuestras, loadProcesamiento } from '../../store/muestras.actions';
import { selectProcesamientoItems, selectMuestrasBranchName, selectMuestrasError } from '../../store/muestras.selectors';
import { loadTemplates } from '../../store/worksheet-templates/worksheet-templates.actions';
import { selectTemplates, selectTemplatesError } from '../../store/worksheet-templates/worksheet-templates.selectors';
import { PlanillasModalComponent } from '../../components/planillas/planillas-modal.component';
import { WorksheetConfigModalComponent } from '../../components/planillas/worksheet-config-modal.component';

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
  imports: [PageHeaderComponent, ToastModule, PlanillasModalComponent, WorksheetConfigModalComponent],
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

  private readonly items = this.store.selectSignal(selectProcesamientoItems);
  private readonly branchName = this.store.selectSignal(selectMuestrasBranchName);
  private readonly backendError = this.store.selectSignal(selectMuestrasError);
  private readonly templatesError = this.store.selectSignal(selectTemplatesError);
  readonly templates = this.store.selectSignal(selectTemplates);

  readonly query = signal('');
  readonly selectedIds = signal<ReadonlySet<string>>(new Set());

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

  // --- modales de planillas ---
  readonly planillasOpen = signal(false);
  readonly configOpen = signal(false);
  readonly editingTemplateId = signal<number | null>(null);

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
      poll: () => { this.store.dispatch(loadProcesamiento()); return of(null); },
    });
    this.destroyRef.onDestroy(() => handle.stop());
  }

  setQuery(q: string): void { this.query.set(q); }
  clearSelection(): void { this.selectedIds.set(new Set()); }
  isSelected(id: string): boolean { return this.selectedIds().has(id); }

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
}
