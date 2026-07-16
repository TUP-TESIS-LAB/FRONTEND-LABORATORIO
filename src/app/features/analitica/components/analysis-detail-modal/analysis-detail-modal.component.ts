import {
  ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal,
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
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
  imports: [DialogModule, ButtonModule, TagModule, SkeletonModule],
  template: `
    <p-dialog [visible]="visible()" (onHide)="closed.emit()" [modal]="true" [draggable]="false" [style]="{ width: '480px' }"
              [header]="headerText()">
      @if (loading()) {
        <div class="adm-skeleton">
          <p-skeleton width="60%" height="14px" />
          <p-skeleton width="40%" height="14px" />
          <p-skeleton width="90%" height="14px" />
          <p-skeleton width="70%" height="14px" />
        </div>
      } @else if (detail(); as d) {
        <div class="adm-grid">
          <div class="adm-label">Código corto</div>
          <div class="adm-value">{{ d.shortCode }}</div>

          <div class="adm-label">Familia</div>
          <div class="adm-value">
            @if (d.familyName) { <p-tag [value]="d.familyName" severity="info" /> } @else { — }
          </div>

          <div class="adm-label">NBU</div>
          <div class="adm-value">
            @if (d.nbuCode) { <p-tag [value]="d.nbuCode" severity="secondary" /> } @else { — }
          </div>

          <div class="adm-label">Procesamiento</div>
          <div class="adm-value">
            @if (d.processingTime != null) { {{ d.processingTime }} {{ translateUnit(d.processingTimeUnit ?? '') }} }
            @else { — }
          </div>
        </div>

        @if (d.determinations.length) {
          <div class="adm-section-title">Determinaciones</div>
          <div class="adm-chips">
            @for (det of d.determinations; track det.id) { <span class="adm-chip">{{ det.name }}</span> }
          </div>
        }

        @if (d.description) {
          <div class="adm-section-title">Descripción</div>
          <div class="adm-value">{{ d.description }}</div>
        }
      } @else if (error()) {
        <!-- U3 (KAN-246): antes esta rama no existía y el modal quedaba vacío sin
             avisar nada cuando fallaba la carga del detalle. -->
        <div class="adm-error">
          <i class="pi pi-exclamation-circle"></i>
          <div>No se pudo cargar el detalle del análisis. Probá de nuevo.</div>
        </div>
      }
      <ng-template pTemplate="footer">
        <p-button label="Cerrar" severity="secondary" [text]="true" (onClick)="closed.emit()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .adm-grid {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--space-3) var(--space-4);
      align-items: center;
    }
    .adm-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--ds-text-muted, #6b7280);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    .adm-value { font-size: 14px; color: var(--ds-text, #1a1a2e); }
    .adm-section-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--ds-text-muted, #6b7280);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: var(--space-4);
      margin-bottom: var(--space-2);
    }
    .adm-chips { display: flex; flex-wrap: wrap; gap: var(--space-2); }
    .adm-chip {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: var(--ds-radius-sm);
      background: var(--ds-surface, #eef0f4);
      color: var(--ds-text, #1a1a2e);
      font-size: 12px;
      font-weight: 500;
    }
    .adm-skeleton { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-2) 0; }
    .adm-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-4) 0;
      text-align: center;
      color: var(--ds-text-muted, #6b7280);
      font-size: 14px;
    }
    .adm-error i { font-size: 22px; color: var(--ds-danger, #e23a47); }
  `],
})
export class AnalysisDetailModalComponent {
  private readonly api = inject(AnalysisService);

  readonly analysisId = input<number | null>(null);
  readonly visible    = input<boolean>(false);
  readonly closed     = output<void>();

  readonly detail  = signal<AnalysisDetail | null>(null);
  readonly loading = signal(false);
  readonly error   = signal(false);

  /** Header dinámico: `{{ shortCode }} · {{ name }}` una vez que carga; título genérico mientras tanto. */
  readonly headerText = computed<string>(() => {
    const d = this.detail();
    return d ? `${d.shortCode} · ${d.name}` : 'Detalle del análisis';
  });

  constructor() {
    effect(() => {
      const id = this.analysisId();
      const open = this.visible();
      if (open && id != null) {
        this.detail.set(null);
        this.error.set(false);
        this.loading.set(true);
        this.api.getById(id).subscribe({
          next: (d) => { this.detail.set(d); this.loading.set(false); },
          error: () => { this.detail.set(null); this.error.set(true); this.loading.set(false); },
        });
      }
    });
  }

  translateUnit(unit: string): string {
    return TIME_UNIT_ES[unit?.toUpperCase?.() ?? ''] ?? unit;
  }
}
