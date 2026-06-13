import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PollingService } from '@core/refresh';
import { humanizeBackendError } from '@shared/utils/error-messages';
import { SCREENS } from '../../data/state-machine.config';
import { MockSamplesService } from '../../services/mock-samples.service';
import { CURRENT_BRANCH, BRANCHES, AREAS, LABS } from '../../data/catalogs';
import type { ScreenConfig, ScreenKey, Transition, TransitionDest } from '../../models/transition.model';
import type { Sample } from '../../models/sample.model';
import { ScanBarComponent } from '../../components/scan-bar/scan-bar.component';
import { BatchMenuComponent } from '../../components/batch-menu/batch-menu.component';
import { SampleTableComponent } from '../../components/sample-table/sample-table.component';
import { TransitionDialogComponent } from '../../components/transition-dialog/transition-dialog.component';
import { initMuestras, loadRecoleccion, transitionLabels } from '../../store/muestras.actions';
import { selectRecoleccionItems, selectMuestrasBranchName, selectMuestrasError } from '../../store/muestras.selectors';
import { groupTubes, type Tube } from '../../models/tube.model';

@Component({
  selector: 'app-muestras-worklist',
  standalone: true,
  imports: [ScanBarComponent, BatchMenuComponent, SampleTableComponent, TransitionDialogComponent, ToastModule],
  providers: [MessageService],
  templateUrl: './worklist.page.html',
  styleUrl: './worklist.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorklistPage {
  private readonly route = inject(ActivatedRoute);
  private readonly samples = inject(MockSamplesService);
  private readonly messages = inject(MessageService);
  private readonly store = inject(Store);
  private readonly polling = inject(PollingService);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentBranch = CURRENT_BRANCH;
  readonly branches = BRANCHES;
  readonly areas = AREAS;
  readonly labs = LABS;

  readonly config = computed<ScreenConfig>(() => {
    const key = this.route.snapshot.data['screenKey'] as ScreenKey;
    return SCREENS[key];
  });

  /** Recolección está conectada al backend; el resto sigue mock (arcos futuros). */
  readonly isBackendScreen = computed(() => this.config().key === 'recoleccion');

  private readonly backendItems = this.store.selectSignal(selectRecoleccionItems);
  private readonly branchName = this.store.selectSignal(selectMuestrasBranchName);
  private readonly backendError = this.store.selectSignal(selectMuestrasError);

  private readonly sourceRows = computed<Sample[]>(() =>
    this.isBackendScreen()
      ? groupTubes(this.backendItems(), this.branchName())
      : this.samples.byState(this.config().source)(),
  );

  readonly rows = computed(() => {
    const all = this.sourceRows();
    const q = this.query().trim().toLowerCase();
    if (!q) return all;
    return all.filter(s =>
      s.barcode.toLowerCase().includes(q)
      || s.study.toLowerCase().includes(q)
      || s.branch.toLowerCase().includes(q)
      || s.patient.toLowerCase().includes(q),
    );
  });
  readonly total = computed(() =>
    this.isBackendScreen() ? this.sourceRows().length : this.samples.countByState(this.config().source)(),
  );

  readonly query = signal('');
  readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly selectedSamples = computed<Sample[]>(() => {
    const sel = this.selectedIds();
    return this.sourceRows().filter(s => sel.has(s.id));
  });

  constructor() {
    if ((this.route.snapshot.data['screenKey'] as ScreenKey) === 'recoleccion') {
      this.store.dispatch(initMuestras());
      const handle = this.polling.startPolling({
        key: 'muestras-recoleccion',
        intervalMs: 5000,
        poll: () => {
          this.store.dispatch(loadRecoleccion());
          return of(null);
        },
      });
      this.destroyRef.onDestroy(() => handle.stop());

      let lastError: unknown = null;
      effect(() => {
        const err = this.backendError();
        if (err && err !== lastError) {
          lastError = err;
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
    }
  }

  readonly menuOpen = signal(false);
  readonly activeTransition = signal<Transition | null>(null);
  readonly flashId = signal<string | null>(null);
  readonly leavingIds = this.samples.leavingIds;

  toggleRow(id: string): void {
    this.selectedIds.update(set => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  toggleAll(): void {
    const ids = this.rows().map(r => r.id);
    const all = this.selectedIds();
    const allSelected = ids.length > 0 && ids.every(id => all.has(id));
    this.selectedIds.set(allSelected ? new Set() : new Set(ids));
  }

  clearSelection(): void { this.selectedIds.set(new Set()); }

  setQuery(q: string): void { this.query.set(q); }

  onEnterScan(q: string): void {
    const norm = q.trim().toLowerCase();
    if (!norm) return;
    const match = this.rows().find(r => r.barcode.toLowerCase() === norm)
      ?? this.rows().find(r => r.barcode.toLowerCase().includes(norm));
    if (match) {
      this.selectedIds.update(set => {
        const next = new Set(set);
        next.add(match.id);
        return next;
      });
      this.flashId.set(match.id);
      setTimeout(() => this.flashId.set(null), 1100);
    }
  }

  simulateScan(): void {
    const candidates = this.rows();
    if (candidates.length === 0) return;
    const idx = Math.floor(candidates.length * 0.5); // determinístico-ish
    const pick = candidates[Math.min(idx, candidates.length - 1)];
    this.query.set(pick.barcode);
    this.selectedIds.update(set => {
      const next = new Set(set);
      next.add(pick.id);
      return next;
    });
    this.flashId.set(pick.id);
    setTimeout(() => this.flashId.set(null), 1100);
  }

  openMenu(): void { this.menuOpen.set(true); }
  closeMenu(): void { this.menuOpen.set(false); }

  selectTransition(t: Transition): void {
    this.menuOpen.set(false);
    this.activeTransition.set(t);
  }

  cancelDialog(): void { this.activeTransition.set(null); }

  async confirmDialog(payload: { dest: TransitionDest; note: string }): Promise<void> {
    const t = this.activeTransition();
    if (!t) return;
    const ids = Array.from(this.selectedIds());
    this.activeTransition.set(null);

    if (this.isBackendScreen()) {
      const tubes = this.selectedSamples() as Tube[];
      const labelIds = tubes.flatMap(tube =>
        tube.labelIds?.length ? tube.labelIds : [Number(tube.id)],
      );
      this.store.dispatch(transitionLabels({
        labelIds,
        transitionKey: t.key,
        reason: payload.note || undefined,
      }));
      this.clearSelection();
      const detail = this.formatDestDetail(t, payload.dest);
      this.messages.add({
        severity: 'success',
        summary: `${tubes.length} tubo(s) → ${t.toLabel}`,
        detail,
        life: 3800,
      });
    } else {
      await this.samples.transition(ids, t, payload.dest);
      this.clearSelection();
      const detail = this.formatDestDetail(t, payload.dest);
      this.messages.add({
        severity: 'success',
        summary: `${ids.length} muestra(s) → ${t.toLabel}`,
        detail,
        life: 3800,
      });
    }
  }

  private formatDestDetail(t: Transition, dest: TransitionDest): string {
    if (t.key === 'reroute') return `${dest.sucursal ?? ''} · ${dest.area ?? ''}`.trim();
    if (t.key === 'area') return dest.area ?? '';
    if (t.key === 'derived') return dest.lab ?? '';
    return '';
  }
}
