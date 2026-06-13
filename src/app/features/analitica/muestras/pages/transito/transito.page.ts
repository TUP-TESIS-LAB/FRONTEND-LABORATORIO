import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PollingService } from '@core/refresh';
import { humanizeBackendError } from '@shared/utils/error-messages';
import { SectionService } from '@features/sucursales/services/section.service';
import type { Section } from '@features/sucursales/models/section.model';
import type { Sample } from '../../models/sample.model';
import type { LoteDestPatch, SectionOption } from '../../models/transito.model';
import { TransitoLotesService, NO_SAMPLE_LINK_TEXT } from '../../services/transito-lotes.service';
import { TransitoScanBarComponent } from '../../components/transito/transito-scan-bar/transito-scan-bar.component';
import { BulkActionsBarComponent } from '../../components/transito/bulk-actions-bar/bulk-actions-bar.component';
import { LoteCardComponent } from '../../components/transito/lote-card/lote-card.component';
import { RecommendedGroupCardComponent } from '../../components/transito/recommended-group-card/recommended-group-card.component';
import { ConfirmSendAllDialogComponent } from '../../components/transito/confirm-send-all-dialog/confirm-send-all-dialog.component';
import {
  deriveTubesSuccess, dispatchTubesSuccess, initMuestras, loadTransito, loadWorkspaces,
} from '../../store/muestras.actions';
import {
  selectMuestrasBranchId, selectMuestrasBranchName, selectMuestrasBranches, selectMuestrasError,
  selectRouting, selectTransitoItems, selectWorkspaces,
} from '../../store/muestras.selectors';
import { groupTubes } from '../../models/tube.model';

@Component({
  selector: 'app-transito-page',
  standalone: true,
  imports: [
    ToastModule, TransitoScanBarComponent, BulkActionsBarComponent,
    LoteCardComponent, RecommendedGroupCardComponent, ConfirmSendAllDialogComponent,
  ],
  providers: [MessageService],
  templateUrl: './transito.page.html',
  styleUrl: './transito.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransitoPage {
  protected readonly service = inject(TransitoLotesService);
  private readonly messages = inject(MessageService);
  private readonly store = inject(Store);
  private readonly actions = inject(Actions);
  private readonly polling = inject(PollingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sectionService = inject(SectionService);

  protected readonly flashId = signal<string | null>(null);
  protected readonly confirmOpen = signal(false);

  // ── Fuente real: store NgRx (mochila) ──
  private readonly transitoItems = this.store.selectSignal(selectTransitoItems);
  private readonly routing = this.store.selectSignal(selectRouting);
  private readonly workspaces = this.store.selectSignal(selectWorkspaces);
  private readonly branchId = this.store.selectSignal(selectMuestrasBranchId);
  protected readonly branchName = this.store.selectSignal(selectMuestrasBranchName);
  private readonly myBranches = this.store.selectSignal(selectMuestrasBranches);
  private readonly backendError = this.store.selectSignal(selectMuestrasError);

  protected readonly tubes = computed(() => groupTubes(this.transitoItems(), this.branchName()));

  /** Catálogo de secciones (fallback de nombres para workspaces que el routing nunca mencionó). */
  private readonly sectionsCatalog = toSignal(
    this.sectionService.list({ size: 200 }).pipe(
      map(page => page.content),
      catchError(() => of([] as Section[])),
    ),
    { initialValue: [] as Section[] },
  );

  /**
   * Opciones de sección para asignación manual: workspaces reales de la sucursal,
   * con nombres resueltos por el routing (preferente), el catálogo de secciones, o `Sección {id}`.
   */
  protected readonly sectionOptions = computed<SectionOption[]>(() => {
    const fromRouting = new Map<number, { areaName: string; sectionName: string }>();
    for (const g of this.routing()?.groups ?? []) {
      fromRouting.set(g.workSection.sectionId, {
        areaName: g.workSection.areaName,
        sectionName: g.workSection.sectionName,
      });
    }
    const catalog = new Map(this.sectionsCatalog().map(s => [s.id, s.name]));
    return this.workspaces().map(w => {
      const known = fromRouting.get(w.sectionId);
      const sectionName = known?.sectionName ?? catalog.get(w.sectionId) ?? `Sección ${w.sectionId}`;
      const areaName = known?.areaName ?? '';
      return {
        sectionId: w.sectionId,
        sectionName,
        areaName,
        label: areaName ? `${areaName} · ${sectionName}` : sectionName,
      };
    });
  });

  /** Sucursales del operador como destino de derivación (todas; la card decide despacho vs derivación). */
  protected readonly branchOptions = computed(() =>
    this.myBranches().map(b => ({ id: b.id, name: b.name })),
  );

  protected readonly activeLoteNumber = computed(() => {
    const id = this.service.activeLoteId();
    if (!id) return null;
    const idx = this.service.lotes().findIndex(l => l.id === id);
    return idx >= 0 ? idx + 1 : null;
  });

  protected readonly sendAllBreakdown = computed(() => this.service.sendAllPreview());

  constructor() {
    this.store.dispatch(initMuestras());

    const handle = this.polling.startPolling({
      key: 'muestras-transito',
      intervalMs: 5000,
      poll: () => {
        this.store.dispatch(loadTransito());
        return of(null);
      },
    });
    this.destroyRef.onDestroy(() => handle.stop());

    // Workspaces: requieren branchId resuelto (initMuestrasSuccess), un solo disparo.
    let workspacesRequested = false;
    effect(() => {
      if (this.branchId() != null && !workspacesRequested) {
        workspacesRequested = true;
        this.store.dispatch(loadWorkspaces());
      }
    });

    // Conexión página → service de orquestación.
    effect(() => this.service.setTubes(this.tubes()));
    effect(() => this.service.setRouting(this.routing()));
    effect(() => this.service.setBranch(this.branchName(), this.branchId()));
    effect(() => this.service.setBranches(this.branchOptions()));
    effect(() => this.service.setSectionOptions(this.sectionOptions()));

    // Errores del backend → toast humanizado (y limpiar el estado visual "leaving").
    let lastError: unknown = null;
    effect(() => {
      const err = this.backendError();
      if (err && err !== lastError) {
        lastError = err;
        this.service.clearLeaving();
        this.messages.add({
          severity: 'error',
          summary: 'Error',
          detail: humanizeBackendError(err, {
            fallback: 'No pudimos completar la operación. Probá de nuevo.',
          }),
          life: 5000,
        });
      }
    });

    // Éxitos reales (acciones Success), no optimistas.
    this.actions.pipe(ofType(dispatchTubesSuccess), takeUntilDestroyed()).subscribe(({ count }) => {
      this.messages.add({
        severity: 'success',
        summary: `${count} tubo(s) despachados`,
        life: 3800,
      });
    });
    this.actions.pipe(ofType(deriveTubesSuccess), takeUntilDestroyed()).subscribe(({ count }) => {
      this.messages.add({
        severity: 'success',
        summary: `${count} tubo(s) derivados`,
        life: 3800,
      });
    });
  }

  samplesOf(ids: string[]): Sample[] {
    const all = this.tubes();
    const set = new Set(ids);
    return all.filter(s => set.has(s.id));
  }

  loteNumber(loteId: string): number {
    return this.service.lotes().findIndex(l => l.id === loteId) + 1;
  }

  onScanEnter(code: string): void {
    const result = this.service.scan(code);
    if (result.outcome === 'added' && result.matchedId) {
      this.flashId.set(result.matchedId);
      setTimeout(() => this.flashId.set(null), 1100);
    } else if (result.outcome === 'duplicate') {
      this.messages.add({
        severity: 'warn',
        summary: `Ya está en Lote ${result.duplicateLoteNumber}`,
        life: 3800,
      });
    }
  }

  onSendAllClick(): void {
    if (this.sendAllBreakdown().enProceso === 0) return;
    this.confirmOpen.set(true);
  }

  onConfirmSendAll(_observation: string): void {
    this.confirmOpen.set(false);
    const result = this.service.sendAll();
    if (result.skipped > 0) this.warnSinVinculo(result.skipped);
  }

  onCreateLote(): void {
    const ids = Array.from(this.service.sel());
    if (ids.length === 0) return;
    const id = this.service.createLote(ids);
    const n = this.loteNumber(id);
    this.messages.add({
      severity: 'success',
      summary: `Lote ${n} temporal creado · ${ids.length} muestras`,
      detail: 'Asignale destino y envialo cuando quieras',
      life: 3800,
    });
  }

  onAddToLote(loteId: string): void {
    const ids = Array.from(this.service.sel());
    if (ids.length === 0) return;
    this.service.addToLote(loteId, ids);
    this.messages.add({
      severity: 'info',
      summary: `${ids.length} muestras → Lote ${this.loteNumber(loteId)}`,
      life: 3800,
    });
  }

  onDissolveLote(loteId: string): void {
    const n = this.loteNumber(loteId);
    const count = this.service.lotes().find(l => l.id === loteId)?.sampleIds.length ?? 0;
    this.service.dissolveLote(loteId);
    this.messages.add({
      severity: 'secondary',
      summary: `Lote ${n} descartado`,
      detail: `${count} muestras volvieron a su workspace recomendado`,
      life: 3800,
    });
  }

  onSendGroup(groupId: string): void {
    const result = this.service.send(groupId, 'group');
    if (!result) {
      this.messages.add({
        severity: 'warn',
        summary: 'Asignale una sección antes de enviar',
        life: 3800,
      });
      return;
    }
    if (result.skipped > 0) this.warnSinVinculo(result.skipped);
  }

  onSendLote(loteId: string): void {
    const result = this.service.send(loteId, 'lote');
    if (!result) {
      this.messages.add({
        severity: 'warn',
        summary: 'Asignale un destino antes de enviar',
        life: 3800,
      });
      return;
    }
    if (result.skipped > 0) this.warnSinVinculo(result.skipped);
  }

  onAssignSection(groupId: string, sectionId: number): void {
    this.service.assignGroupSection(groupId, sectionId);
  }

  onUpdateDestLote(loteId: string, patch: LoteDestPatch): void {
    this.service.updateDest({ kind: 'lote', id: loteId }, patch);
  }
  onToggleEditing(groupId: string): void {
    this.service.toggleEditing(groupId);
  }
  onSetActiveLote(loteId: string): void {
    this.service.setActiveLote(this.service.activeLoteId() === loteId ? null : loteId);
  }
  onToggleAllGroup(groupId: string, on: boolean): void {
    const ids = this.service.groups().find(g => g.id === groupId)?.sampleIds ?? [];
    this.service.toggleSelMany(ids, on);
  }
  onToggleAllLote(loteId: string, on: boolean): void {
    const ids = this.service.lotes().find(l => l.id === loteId)?.sampleIds ?? [];
    this.service.toggleSelMany(ids, on);
  }
  onToggleSample(id: string): void {
    this.service.toggleSel(id);
  }
  onClearSelection(): void {
    this.service.clearSel();
  }

  isLoteActive(loteId: string): boolean {
    return this.service.activeLoteId() === loteId;
  }
  isGroupEditing(groupId: string): boolean {
    return this.service.editing().has(groupId);
  }

  private warnSinVinculo(count: number): void {
    this.messages.add({
      severity: 'warn',
      summary: `${count} tubo(s) sin enviar`,
      detail: NO_SAMPLE_LINK_TEXT,
      life: 5000,
    });
  }
}
