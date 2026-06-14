import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Store } from '@ngrx/store';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { humanizeBackendError } from '@shared/utils/error-messages';
import { ResultGridComponent, type SaveResultPayload } from '../../components/result-grid/result-grid.component';
import { ResumenResultadosModalComponent, type ResumenItem } from '../../components/resumen-resultados-modal/resumen-resultados-modal.component';
import { selectGrid, selectResultadosLoading, selectResultadosError } from '../../store/resultados/resultados.selectors';
import { loadGrid, saveResults, markReady } from '../../store/resultados/resultados.actions';

@Component({
  selector: 'app-cargar-resultados',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResultGridComponent, ResumenResultadosModalComponent, ToastModule],
  providers: [MessageService],
  template: `
    <section class="p-4 flex flex-col gap-4">
      <header class="flex items-center justify-between">
        <button type="button" class="text-sm text-blue-600" (click)="back()">← Volver a procesamiento</button>
      </header>
      <div class="demo-banner rounded border border-amber-300 bg-amber-50 text-amber-800 text-sm p-2">
        <i class="pi pi-info-circle"></i> {{ bannerText }}
      </div>
      <h1 class="text-lg font-semibold">Cargar resultados</h1>
      @if (loading()) { <p class="text-sm opacity-60">Cargando resultados…</p> }
      @else if (grid()) { <app-result-grid [grid]="grid()!" (save)="onSave($event)" /> }
      @if (resumenOpen()) {
        <app-resumen-resultados-modal [visible]="resumenOpen()" [items]="resumenItems()"
          (markCompleted)="onMarkCompleted($event)" (closed)="resumenOpen.set(false)" />
      }
      <p-toast position="bottom-right" />
    </section>
  `,
})
export class CargarResultadosPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);
  private readonly messages = inject(MessageService);
  private readonly location = inject(Location);

  readonly bannerText = 'Datos de demo: la creación automática de resultados al pasar a PROCESSING está pendiente.';
  readonly protocolIds = (this.route.snapshot.queryParamMap.get('protocols') ?? '')
    .split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n) && n > 0);

  readonly grid = this.store.selectSignal(selectGrid);
  readonly loading = this.store.selectSignal(selectResultadosLoading);
  private readonly error = this.store.selectSignal(selectResultadosError);

  readonly resumenOpen = signal(false);

  readonly resumenItems = computed<ResumenItem[]>(() => {
    const g = this.grid();
    if (!g) return [];
    const items: ResumenItem[] = [];
    for (const sec of g.sections) {
      for (const rid of sec.resultIds) {
        let total = 0, filled = 0;
        for (const row of sec.rows) {
          const cell = row.cells[rid];
          if (!cell) continue;
          total++;
          if (cell.value.trim() !== '') filled++;
        }
        const status = total === 0 || filled === 0 ? 'sin' : filled === total ? 'completa' : 'parcial';
        items.push({ resultId: rid, label: `${sec.analysisName} · ${g.resultLabels[rid] ?? ('#' + rid)}`, filled, total, status });
      }
    }
    return items;
  });

  constructor() {
    this.store.dispatch(loadGrid({ protocolIds: this.protocolIds }));
    let lastSig: string | null = null;
    effect(() => {
      const err = this.error();
      const sig = err ? `${(err as { status?: unknown }).status}:${(err as { message?: unknown }).message}` : null;
      if (sig && sig !== lastSig) {
        lastSig = sig;
        this.messages.add({ severity: 'error', summary: 'Error', detail: humanizeBackendError(err, { fallback: 'No pudimos completar la operación. Probá de nuevo.' }), life: 5000 });
      }
    });
  }

  onSave(payload: SaveResultPayload[]): void {
    if (payload.length) this.store.dispatch(saveResults({ results: payload }));
    this.resumenOpen.set(true);
  }
  onMarkCompleted(resultIds: number[]): void {
    this.resumenOpen.set(false);
    if (resultIds.length) this.store.dispatch(markReady({ resultIds }));
  }
  back(): void { this.location.back(); }
}
