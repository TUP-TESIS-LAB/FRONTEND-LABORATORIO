import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { humanizeBackendError, type BackendErrorShape } from '@shared/utils/error-messages';
import { PlanillaGridComponent, type PlanillaSavePayload } from '../../components/planilla-grid/planilla-grid.component';
import { ResumenResultadosModalComponent, type ResumenItem } from '../../components/resumen-resultados-modal/resumen-resultados-modal.component';
import { PlanillaGridBuilderService } from '../../services/planilla-grid-builder.service';
import { ResultadosApiService } from '../../services/resultados-api.service';
import type { PlanillaGrid } from '../../models/resultado.model';

@Component({
  selector: 'app-cargar-resultados',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlanillaGridComponent, ResumenResultadosModalComponent, ToastModule],
  providers: [MessageService],
  templateUrl: './cargar-resultados.page.html',
  styleUrl: './cargar-resultados.page.scss',
})
export class CargarResultadosPage {
  private readonly route = inject(ActivatedRoute);
  private readonly messages = inject(MessageService);
  private readonly location = inject(Location);
  private readonly builder = inject(PlanillaGridBuilderService);
  private readonly resultados = inject(ResultadosApiService);

  readonly protocolIds = (this.route.snapshot.queryParamMap.get('protocols') ?? '')
    .split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n) && n > 0);
  readonly templateId = Number(this.route.snapshot.queryParamMap.get('templateId')) || null;

  readonly grid = signal<PlanillaGrid | null>(null);
  readonly loading = signal(true);
  readonly resumenOpen = signal(false);
  /** Resultados que quedaron con TODAS sus determinaciones cargadas (candidatos a mark-ready). */
  private readonly savedResultIds = signal<number[]>([]);

  readonly resumenItems = computed<ResumenItem[]>(() => {
    const g = this.grid();
    if (!g) return [];
    const items: ResumenItem[] = [];
    for (const sec of g.sections) {
      for (const col of g.columns) {
        // resultId de este protocolo para este análisis (de la primera celda persistible)
        let resultId: number | null = null;
        let total = 0, filled = 0;
        for (const row of sec.rows) {
          const cell = row.cells[col.protocolId];
          if (!cell || cell.resultId == null || cell.determinationId == null) continue;
          resultId = cell.resultId;
          total++;
          if (cell.value.trim() !== '') filled++;
        }
        if (resultId == null || total === 0) continue;
        const status = filled === 0 ? 'sin' : filled === total ? 'completa' : 'parcial';
        items.push({ resultId, label: `${sec.analysisName} · ${col.label}`, filled, total, status });
      }
    }
    return items;
  });

  constructor() {
    if (this.templateId == null || this.protocolIds.length === 0) {
      this.loading.set(false);
      return;
    }
    this.builder.build(this.templateId, this.protocolIds)
      .pipe(catchError(err => { this.error(err); return of(null); }))
      .subscribe(g => { this.grid.set(g); this.loading.set(false); });
  }

  onSave(payload: PlanillaSavePayload[]): void {
    // Reflejar lo editado en el grid (para que el resumen cuente lo recién cargado).
    this.applyEdits(payload);
    if (payload.length === 0) { this.resumenOpen.set(true); return; }
    forkJoin(payload.map(p =>
      this.resultados.batchUpdate(p.resultId, p.items.map(i => ({
        determinationId: i.determinationId, resultValue: i.resultValue, observations: null,
      }))).pipe(catchError(err => { this.error(err); return of(null); })),
    )).subscribe(() => this.resumenOpen.set(true));
  }

  onMarkCompleted(resultIds: number[]): void {
    this.resumenOpen.set(false);
    if (resultIds.length === 0) return;
    forkJoin(resultIds.map(id =>
      this.resultados.markReady(id).pipe(catchError(err => { this.error(err); return of(null); })),
    )).subscribe(() => this.messages.add({
      severity: 'success', summary: 'Listo', detail: 'Resultados marcados como completados.', life: 3500,
    }));
  }

  resumenClosed(): void { this.resumenOpen.set(false); }
  back(): void { this.location.back(); }

  /** Persiste los valores editados en el modelo del grid (para el resumen y re-render). */
  private applyEdits(payload: PlanillaSavePayload[]): void {
    const g = this.grid();
    if (!g) return;
    const valueByKey = new Map<string, string>();
    for (const p of payload) for (const i of p.items) valueByKey.set(`${p.resultId}:${i.determinationId}`, i.resultValue);
    const next: PlanillaGrid = {
      ...g,
      sections: g.sections.map(sec => ({
        ...sec,
        rows: sec.rows.map(row => ({
          ...row,
          cells: Object.fromEntries(Object.entries(row.cells).map(([pid, cell]) => {
            if (cell.resultId == null || cell.determinationId == null) return [pid, cell];
            const v = valueByKey.get(`${cell.resultId}:${cell.determinationId}`);
            return [pid, v !== undefined ? { ...cell, value: v } : cell];
          })),
        })),
      })),
    };
    this.grid.set(next);
  }

  private error(err: unknown): void {
    this.messages.add({
      severity: 'error', summary: 'Error',
      detail: humanizeBackendError(err as BackendErrorShape | null, { fallback: 'No pudimos completar la operación. Probá de nuevo.' }),
      life: 5000,
    });
  }
}
