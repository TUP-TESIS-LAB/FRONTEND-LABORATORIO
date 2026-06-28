import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DatePickerModule } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { PollingService } from '@core/refresh';
import { BreakpointService } from '@shared/ui/breakpoint.service';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { HomeVisit, HomeVisitStatus } from '../../models/home-visit.model';
import { loadMyRoute } from '../../store/home-visit.actions';
import { selectMyRoute, selectMyRoutePending } from '../../store/home-visit.selectors';

// ── Helpers de estado ─────────────────────────────────────────────────────────

interface StatusDisplay {
  label: string;
  severity: 'success' | 'info' | 'warn' | 'danger' | 'secondary';
  icon: string;
}

const STATUS_MAP: Record<HomeVisitStatus, StatusDisplay> = {
  PROGRAMADA:   { label: 'Programada',   severity: 'info',      icon: 'pi-calendar' },
  EXTRAIDA:     { label: 'Extraída',     severity: 'success',   icon: 'pi-check-circle' },
  EN_TRANSITO:  { label: 'En tránsito',  severity: 'warn',      icon: 'pi-truck' },
  RECEPCIONADA: { label: 'Recepcionada', severity: 'success',   icon: 'pi-inbox' },
  NO_REALIZADA: { label: 'No realizada', severity: 'danger',    icon: 'pi-times-circle' },
  REPROGRAMADA: { label: 'Reprogramada', severity: 'secondary', icon: 'pi-refresh' },
};

/** Convierte 'HH:mm:ss' → 'HH:mm' */
function formatTime(time: string): string {
  if (!time) return '—';
  return time.substring(0, 5);
}

/** Formatea fecha Date → 'YYYY-MM-DD' para la acción del store */
function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Componente ────────────────────────────────────────────────────────────────

@Component({
  selector: 'dom-mi-ruta-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    EmptyStateComponent,
    ButtonModule,
    TagModule,
    DatePickerModule,
    FormsModule,
  ],
  template: `
    <ui-page-header
      heading="Mi ruta del día"
      subtitle="Visitas asignadas para la fecha seleccionada." />

    <!-- Selector de fecha ─────────────────────────────────────────────────── -->
    <div class="mi-ruta__date-bar">
      <p-datepicker
        [(ngModel)]="selectedDate"
        (ngModelChange)="onDateChange($event)"
        [showIcon]="true"
        dateFormat="dd/mm/yy"
        [maxDate]="maxDate"
        placeholder="Seleccionar fecha"
        inputId="mi-ruta-date"
        styleClass="mi-ruta__date-picker"
        appendTo="body" />
    </div>

    <!-- Estado de carga ───────────────────────────────────────────────────── -->
    @if (pending() && visits().length === 0) {
      <div class="mi-ruta__loading" aria-live="polite" aria-busy="true">
        <i class="pi pi-spin pi-spinner mi-ruta__spinner"></i>
        <span>Cargando visitas...</span>
      </div>
    }

    <!-- Lista de tarjetas ────────────────────────────────────────────────── -->
    @if (!pending() || visits().length > 0) {
      @if (sortedVisits().length > 0) {
        <div [class]="gridClass()">
          @for (visit of sortedVisits(); track visit.id) {
            <article
              class="mi-ruta__card"
              (click)="navToDetail(visit)"
              (keydown.enter)="navToDetail(visit)"
              (keydown.space)="navToDetail(visit)"
              role="button"
              tabindex="0"
              [attr.aria-label]="'Detalle de visita a ' + (visit.patientName ?? 'paciente')">

              <!-- Header de tarjeta: nombre + DNI ───────────────────────── -->
              <div class="mi-ruta__card-header">
                <div class="mi-ruta__patient">
                  <i class="pi pi-user mi-ruta__patient-icon"></i>
                  <div class="mi-ruta__patient-info">
                    <span class="mi-ruta__patient-name">
                      {{ visit.patientName ?? 'Paciente sin nombre' }}
                    </span>
                    @if (visit.patientDni) {
                      <span class="mi-ruta__patient-dni">DNI {{ visit.patientDni }}</span>
                    }
                  </div>
                </div>
                <p-tag
                  [severity]="statusFor(visit.status).severity"
                  [value]="statusFor(visit.status).label"
                  [icon]="'pi ' + statusFor(visit.status).icon" />
              </div>

              <!-- Ventana horaria ─────────────────────────────────────── -->
              <div class="mi-ruta__row">
                <i class="pi pi-clock mi-ruta__row-icon"></i>
                <span class="mi-ruta__row-value">
                  {{ formatTime(visit.timeWindowStart) }} – {{ formatTime(visit.timeWindowEnd) }}
                </span>
              </div>

              <!-- Dirección ──────────────────────────────────────────── -->
              <div class="mi-ruta__row">
                <i class="pi pi-map-marker mi-ruta__row-icon"></i>
                <div class="mi-ruta__address">
                  <span class="mi-ruta__address-street">
                    {{ visit.addressStreet }}{{ visit.addressNumber ? ' ' + visit.addressNumber : '' }}
                  </span>
                  <span class="mi-ruta__address-city">{{ visit.addressCity }}</span>
                  @if (visit.addressReferences) {
                    <span class="mi-ruta__address-ref">{{ visit.addressReferences }}</span>
                  }
                </div>
              </div>

              <!-- Chevron de navegación ──────────────────────────────── -->
              <div class="mi-ruta__card-footer">
                <span class="mi-ruta__detail-hint">Ver detalle</span>
                <i class="pi pi-chevron-right mi-ruta__chevron"></i>
              </div>
            </article>
          }
        </div>
      } @else if (!pending()) {
        <ui-empty-state
          icon="pi-map"
          heading="Sin visitas para este día"
          description="No tenés visitas asignadas para la fecha seleccionada. Consultá con el laboratorio." />
      }
    }
  `,
  styles: [`
    /* ── Barra de fecha ─────────────────────────────────────────────────── */
    .mi-ruta__date-bar {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-bottom: var(--space-5);
    }

    /* ── Carga ──────────────────────────────────────────────────────────── */
    .mi-ruta__loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-12) var(--space-6);
      color: var(--ds-text-muted);
    }
    .mi-ruta__spinner { font-size: 32px; }

    /* ── Grid adaptativo (mobile-first) ─────────────────────────────────── */
    .mi-ruta__grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-4);
    }

    @media (min-width: 768px) {
      .mi-ruta__grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (min-width: 1024px) {
      .mi-ruta__grid { grid-template-columns: repeat(3, 1fr); }
    }

    /* ── Tarjeta ────────────────────────────────────────────────────────── */
    .mi-ruta__card {
      background: var(--p-surface-card, #fff);
      border: 1px solid var(--p-surface-border, #e5e7eb);
      border-radius: 12px;
      padding: var(--space-5);
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      cursor: pointer;
      transition: box-shadow 150ms ease, transform 150ms ease;
      min-height: 160px;         /* touch-friendly vertical space */
      text-decoration: none;
    }

    .mi-ruta__card:hover,
    .mi-ruta__card:focus-visible {
      box-shadow: 0 4px 16px rgba(0,0,0,0.10);
      outline: 2px solid var(--brand-primary, #2563EB);
      outline-offset: 2px;
    }

    .mi-ruta__card:active {
      transform: scale(0.98);
      opacity: 0.92;
    }

    /* ── Header de tarjeta ──────────────────────────────────────────────── */
    .mi-ruta__card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
    }

    .mi-ruta__patient {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
    }

    .mi-ruta__patient-icon {
      font-size: 20px;
      color: var(--brand-primary, #2563EB);
      flex-shrink: 0;
    }

    .mi-ruta__patient-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .mi-ruta__patient-name {
      font-size: 16px;
      font-weight: 600;
      color: var(--ds-text, #1A1A2E);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .mi-ruta__patient-dni {
      font-size: 12px;
      color: var(--ds-text-muted, #6B7280);
    }

    /* ── Filas de datos ─────────────────────────────────────────────────── */
    .mi-ruta__row {
      display: flex;
      align-items: flex-start;
      gap: var(--space-2);
    }

    .mi-ruta__row-icon {
      font-size: 16px;
      color: var(--ds-text-muted, #6B7280);
      flex-shrink: 0;
      margin-top: 1px;
    }

    .mi-ruta__row-value {
      font-size: 14px;
      font-weight: 500;
      color: var(--ds-text, #1A1A2E);
    }

    /* ── Dirección ──────────────────────────────────────────────────────── */
    .mi-ruta__address {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .mi-ruta__address-street {
      font-size: 14px;
      font-weight: 500;
      color: var(--ds-text, #1A1A2E);
    }

    .mi-ruta__address-city {
      font-size: 12px;
      color: var(--ds-text-muted, #6B7280);
    }

    .mi-ruta__address-ref {
      font-size: 12px;
      color: var(--ds-text-muted, #6B7280);
      font-style: italic;
    }

    /* ── Footer de tarjeta ──────────────────────────────────────────────── */
    .mi-ruta__card-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--space-1);
      margin-top: auto;
    }

    .mi-ruta__detail-hint {
      font-size: 12px;
      color: var(--brand-primary, #2563EB);
    }

    .mi-ruta__chevron {
      font-size: 12px;
      color: var(--brand-primary, #2563EB);
    }

    /* ── Mobile: tarjetas más grandes para uso en la calle ──────────────── */
    @media (max-width: 767px) {
      .mi-ruta__card {
        padding: var(--space-6);
        min-height: 180px;
        border-radius: 16px;
      }

      .mi-ruta__patient-name { font-size: 18px; }
      .mi-ruta__row-value    { font-size: 15px; }
      .mi-ruta__address-street { font-size: 15px; }
    }
  `],
})
export class MiRutaPage implements OnInit {
  private readonly store       = inject(Store);
  private readonly router      = inject(Router);
  private readonly polling     = inject(PollingService);
  private readonly destroyRef  = inject(DestroyRef);
  readonly breakpoint          = inject(BreakpointService);

  readonly visits  = this.store.selectSignal(selectMyRoute);
  readonly pending = this.store.selectSignal(selectMyRoutePending);

  /** Fecha seleccionada en el date-picker (default: hoy) */
  selectedDate = new Date();
  /** Máximo seleccionable: hoy (no hace falta ver el futuro en "mi ruta") */
  readonly maxDate = new Date();

  /** Visitas ordenadas por ventana horaria de inicio */
  readonly sortedVisits = computed<HomeVisit[]>(() =>
    [...this.visits()].sort((a, b) =>
      a.timeWindowStart.localeCompare(b.timeWindowStart),
    ),
  );

  /** Clase del grid adaptativa según breakpoint */
  readonly gridClass = computed(() => 'mi-ruta__grid');

  ngOnInit(): void {
    const today = toIsoDate(this.selectedDate);
    this.store.dispatch(loadMyRoute({ date: today }));

    const handle = this.polling.startPolling({
      key: 'domicilio-mi-ruta',
      intervalMs: 5000,
      poll: () => {
        this.store.dispatch(loadMyRoute({ date: toIsoDate(this.selectedDate) }));
        return of(null);
      },
    });

    this.destroyRef.onDestroy(() => handle.stop());
  }

  onDateChange(date: Date): void {
    if (!date) return;
    this.selectedDate = date;
    this.store.dispatch(loadMyRoute({ date: toIsoDate(date) }));
  }

  navToDetail(visit: HomeVisit): void {
    this.router.navigate(['/domicilio/mi-ruta', visit.id]);
  }

  statusFor(status: HomeVisitStatus): StatusDisplay {
    return STATUS_MAP[status] ?? { label: status, severity: 'secondary', icon: 'pi-circle' };
  }

  /** Expuesto al template y a los tests */
  formatTime(time: string): string {
    return formatTime(time);
  }
}
