import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { SCREENS } from '../../data/state-machine.config';
import { MockSamplesService } from '../../services/mock-samples.service';
import { CURRENT_BRANCH, BRANCHES, AREAS, LABS } from '../../data/catalogs';
import type { ScreenConfig, ScreenKey, Transition, TransitionDest } from '../../models/transition.model';
import type { Sample } from '../../models/sample.model';
import { ScanBarComponent } from '../../components/scan-bar/scan-bar.component';
import { BatchMenuComponent } from '../../components/batch-menu/batch-menu.component';
import { SampleTableComponent } from '../../components/sample-table/sample-table.component';
import { TransitionDialogComponent } from '../../components/transition-dialog/transition-dialog.component';

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

  readonly currentBranch = CURRENT_BRANCH;
  readonly branches = BRANCHES;
  readonly areas = AREAS;
  readonly labs = LABS;

  readonly config = computed<ScreenConfig>(() => {
    const key = this.route.snapshot.data['screenKey'] as ScreenKey;
    return SCREENS[key];
  });

  readonly rows = computed(() => {
    const all = this.samples.byState(this.config().source)();
    const q = this.query().trim().toLowerCase();
    if (!q) return all;
    return all.filter(s =>
      s.barcode.toLowerCase().includes(q)
      || s.study.toLowerCase().includes(q)
      || s.branch.toLowerCase().includes(q)
      || s.patient.toLowerCase().includes(q),
    );
  });
  readonly total = computed(() => this.samples.countByState(this.config().source)());

  readonly query = signal('');
  readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly selectedSamples = computed<Sample[]>(() => {
    const sel = this.selectedIds();
    return this.samples.samples().filter(s => sel.has(s.id));
  });

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

  private formatDestDetail(t: Transition, dest: TransitionDest): string {
    if (t.key === 'reroute') return `${dest.sucursal ?? ''} · ${dest.area ?? ''}`.trim();
    if (t.key === 'area') return dest.area ?? '';
    if (t.key === 'derived') return dest.lab ?? '';
    return '';
  }
}
