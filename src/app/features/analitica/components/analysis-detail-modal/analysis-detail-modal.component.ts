import {
  ChangeDetectionStrategy, Component, effect, inject, input, output, signal,
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { AnalysisDetail } from '../../models/atencion.model';
import { AnalysisService } from '../../services/analysis.service';

const TIME_UNIT_ES: Record<string, string> = {
  MINUTES: 'minutos', MINUTE: 'minuto',
  HOURS: 'horas', HOUR: 'hora',
  DAYS: 'días', DAY: 'día',
  WEEKS: 'semanas', WEEK: 'semana',
  MONTHS: 'meses', MONTH: 'mes',
};

@Component({
  selector: 'lab-analysis-detail-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, ButtonModule],
  template: `
    <p-dialog [visible]="visible()" (onHide)="closed.emit()" [modal]="true" [draggable]="false" [style]="{ width: '480px' }"
              header="Detalle del análisis">
      @if (loading()) {
        <div class="py-4 text-center text-sm opacity-70">Cargando...</div>
      } @else if (detail(); as d) {
        <div class="space-y-2 text-sm">
          <div><span class="opacity-60">Código corto:</span> <strong>{{ d.shortCode }}</strong></div>
          <div><span class="opacity-60">Práctica:</span> {{ d.name }}</div>
          <div><span class="opacity-60">Familia:</span> {{ d.familyName ?? '—' }}</div>
          <div><span class="opacity-60">NBU:</span> {{ d.nbuCode ?? '—' }}</div>
          <div><span class="opacity-60">Tiempo de procesamiento:</span>
            @if (d.processingTime != null) { {{ d.processingTime }} {{ translateUnit(d.processingTimeUnit ?? '') }} }
            @else { — }
          </div>
          @if (d.determinations.length) {
            <div>
              <div class="opacity-60 mt-2">Determinaciones</div>
              <ul class="list-disc list-inside">
                @for (det of d.determinations; track det.id) { <li>{{ det.name }}</li> }
              </ul>
            </div>
          }
          @if (d.description) {
            <div class="opacity-60 mt-2">Descripción</div>
            <div>{{ d.description }}</div>
          }
        </div>
      }
      <ng-template pTemplate="footer">
        <p-button label="Cerrar" severity="secondary" [text]="true" (onClick)="closed.emit()" />
      </ng-template>
    </p-dialog>
  `,
})
export class AnalysisDetailModalComponent {
  private readonly api = inject(AnalysisService);

  readonly analysisId = input<number | null>(null);
  readonly visible    = input<boolean>(false);
  readonly closed     = output<void>();

  readonly detail  = signal<AnalysisDetail | null>(null);
  readonly loading = signal(false);

  constructor() {
    effect(() => {
      const id = this.analysisId();
      const open = this.visible();
      if (open && id != null) {
        this.detail.set(null);
        this.loading.set(true);
        this.api.getById(id).subscribe({
          next: (d) => { this.detail.set(d); this.loading.set(false); },
          error: () => { this.detail.set(null); this.loading.set(false); },
        });
      }
    });
  }

  translateUnit(unit: string): string {
    return TIME_UNIT_ES[unit?.toUpperCase?.() ?? ''] ?? unit;
  }
}
