import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { HomeVisitStatus } from '../../models/home-visit.model';
import { loadVisitDetail } from '../../store/home-visit.actions';
import {
  selectVisitDetail,
  selectDetailPending,
} from '../../store/home-visit.selectors';

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

/** Formatea 'YYYY-MM-DDTHH:mm:ss' → 'DD/MM/YYYY HH:mm' */
function formatScheduledAt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const day  = String(d.getDate()).padStart(2, '0');
  const mon  = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hh   = String(d.getHours()).padStart(2, '0');
  const mm   = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${mon}/${year} ${hh}:${mm}`;
}

// ── Componente ────────────────────────────────────────────────────────────────

@Component({
  selector: 'dom-visita-detalle-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    ButtonModule,
    TagModule,
    TooltipModule,
  ],
  template: `
    <ui-page-header
      heading="Detalle de visita"
      subtitle="Información de la visita a domicilio." />

    <!-- ── Cargando ─────────────────────────────────────────────────────────── -->
    @if (pending() && !visit()) {
      <div class="vd-loading" aria-live="polite" aria-busy="true">
        <i class="pi pi-spin pi-spinner vd-spinner"></i>
        <span>Cargando visita...</span>
      </div>
    }

    <!-- ── Sin datos (error o id inexistente) ───────────────────────────────── -->
    @if (!pending() && !visit()) {
      <div class="vd-empty">
        <i class="pi pi-exclamation-circle vd-empty-icon"></i>
        <p class="vd-empty-msg">No se encontró información para esta visita.</p>
        <p-button
          label="Volver a mi ruta"
          icon="pi pi-arrow-left"
          severity="secondary"
          (onClick)="volver()" />
      </div>
    }

    <!-- ── Ficha de visita ───────────────────────────────────────────────────── -->
    @if (visit(); as v) {
      <div class="vd-layout">

        <!-- ── Columna principal ──────────────────────────────────────────── -->
        <div class="vd-main">

          <!-- Paciente -->
          <section class="vd-card" aria-labelledby="vd-sec-paciente">
            <h2 class="vd-section-title" id="vd-sec-paciente">
              <i class="pi pi-user"></i> Paciente
            </h2>
            <dl class="vd-dl">
              <div class="vd-dl__row">
                <dt class="vd-dl__label">Nombre</dt>
                <dd class="vd-dl__value">{{ v.patientName ?? '—' }}</dd>
              </div>
              <div class="vd-dl__row">
                <dt class="vd-dl__label">DNI</dt>
                <dd class="vd-dl__value">{{ v.patientDni ?? '—' }}</dd>
              </div>
            </dl>
          </section>

          <!-- Dirección -->
          <section class="vd-card" aria-labelledby="vd-sec-direccion">
            <h2 class="vd-section-title" id="vd-sec-direccion">
              <i class="pi pi-map-marker"></i> Dirección
            </h2>
            <dl class="vd-dl">
              <div class="vd-dl__row">
                <dt class="vd-dl__label">Calle y número</dt>
                <dd class="vd-dl__value">
                  {{ v.addressStreet }}{{ v.addressNumber ? ' ' + v.addressNumber : '' }}
                </dd>
              </div>
              <div class="vd-dl__row">
                <dt class="vd-dl__label">Ciudad</dt>
                <dd class="vd-dl__value">{{ v.addressCity }}</dd>
              </div>
              @if (v.addressReferences) {
                <div class="vd-dl__row">
                  <dt class="vd-dl__label">Referencias</dt>
                  <dd class="vd-dl__value vd-dl__value--muted">{{ v.addressReferences }}</dd>
                </div>
              }
            </dl>
          </section>

          <!-- Horario -->
          <section class="vd-card" aria-labelledby="vd-sec-horario">
            <h2 class="vd-section-title" id="vd-sec-horario">
              <i class="pi pi-clock"></i> Horario
            </h2>
            <dl class="vd-dl">
              <div class="vd-dl__row">
                <dt class="vd-dl__label">Ventana horaria</dt>
                <dd class="vd-dl__value">
                  {{ formatTime(v.timeWindowStart) }} – {{ formatTime(v.timeWindowEnd) }}
                </dd>
              </div>
              <div class="vd-dl__row">
                <dt class="vd-dl__label">Fecha programada</dt>
                <dd class="vd-dl__value">{{ formatScheduledAt(v.scheduledAt) }}</dd>
              </div>
            </dl>
          </section>

        </div>

        <!-- ── Panel lateral: estado + acciones ──────────────────────────── -->
        <aside class="vd-side">

          <!-- Estado -->
          <section class="vd-card" aria-labelledby="vd-sec-estado">
            <h2 class="vd-section-title" id="vd-sec-estado">Estado</h2>
            <div class="vd-status-row">
              <p-tag
                [severity]="statusFor(v.status).severity"
                [value]="statusFor(v.status).label"
                [icon]="'pi ' + statusFor(v.status).icon" />
            </div>
          </section>

          <!-- Acciones (Fase 3) -->
          <section class="vd-card vd-card--acciones" aria-labelledby="vd-sec-acciones">
            <h2 class="vd-section-title" id="vd-sec-acciones">Acciones</h2>
            <p class="vd-acciones-hint">
              Las acciones estarán disponibles en la Fase 3 del proyecto.
            </p>
            <div class="vd-acciones">
              <span
                pTooltip="Disponible próximamente"
                tooltipPosition="top"
                class="vd-accion-wrapper">
                <p-button
                  label="Extraído"
                  icon="pi pi-check-circle"
                  severity="primary"
                  [disabled]="true"
                  class="vd-accion-btn"
                  ariaLabel="Registrar extracción — disponible próximamente" />
              </span>
              <span
                pTooltip="Disponible próximamente"
                tooltipPosition="top"
                class="vd-accion-wrapper">
                <p-button
                  label="No se pudo"
                  icon="pi pi-times-circle"
                  severity="danger"
                  [disabled]="true"
                  class="vd-accion-btn"
                  ariaLabel="Registrar visita fallida — disponible próximamente" />
              </span>
              <span
                pTooltip="Disponible próximamente"
                tooltipPosition="top"
                class="vd-accion-wrapper">
                <p-button
                  label="Reprogramar"
                  icon="pi pi-refresh"
                  severity="secondary"
                  [disabled]="true"
                  class="vd-accion-btn"
                  ariaLabel="Reprogramar visita — disponible próximamente" />
              </span>
            </div>
          </section>

          <!-- Botón volver -->
          <p-button
            label="Volver a mi ruta"
            icon="pi pi-arrow-left"
            severity="secondary"
            [outlined]="true"
            (onClick)="volver()"
            class="vd-btn-volver"
            ariaLabel="Volver a la lista de visitas del día" />

        </aside>
      </div>
    }
  `,
  styles: [`
    /* ── Carga / vacío ────────────────────────────────────────────────────── */
    .vd-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-12) var(--space-6);
      color: var(--ds-text-muted);
    }
    .vd-spinner { font-size: 32px; }

    .vd-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-12) var(--space-6);
      text-align: center;
    }
    .vd-empty-icon { font-size: 40px; color: var(--ds-text-muted); }
    .vd-empty-msg  { font-size: 14px; color: var(--ds-text-muted); margin: 0; }

    /* ── Layout general (mobile-first: columna única) ─────────────────────── */
    .vd-layout {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    @media (min-width: 768px) {
      .vd-layout {
        flex-direction: row;
        align-items: flex-start;
        gap: var(--space-6);
      }
      .vd-main { flex: 1; min-width: 0; }
      .vd-side { width: 280px; flex-shrink: 0; display: flex; flex-direction: column; gap: var(--space-4); }
    }

    @media (max-width: 767px) {
      .vd-main { display: flex; flex-direction: column; gap: var(--space-4); }
      .vd-side { display: flex; flex-direction: column; gap: var(--space-4); }
    }

    /* ── Card ────────────────────────────────────────────────────────────── */
    .vd-card {
      background: var(--p-surface-card, #fff);
      border: 1px solid var(--p-surface-border, #e5e7eb);
      border-radius: 12px;
      padding: var(--space-5);
    }

    /* ── Título de sección ────────────────────────────────────────────────── */
    .vd-section-title {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ds-text-muted);
      margin: 0 0 var(--space-4) 0;
    }

    /* ── Definition list clave/valor ──────────────────────────────────────── */
    .vd-dl {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      margin: 0;
    }

    .vd-dl__row {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    @media (min-width: 480px) {
      .vd-dl__row {
        flex-direction: row;
        align-items: baseline;
        gap: var(--space-4);
      }
      .vd-dl__label { min-width: 140px; flex-shrink: 0; }
    }

    .vd-dl__label {
      font-size: 12px;
      font-weight: 500;
      color: var(--ds-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .vd-dl__value {
      font-size: 14px;
      font-weight: 500;
      color: var(--ds-text);
      margin: 0;
      min-width: 0;
    }

    .vd-dl__value--muted {
      color: var(--ds-text-muted);
      font-style: italic;
    }

    /* ── Estado chip ─────────────────────────────────────────────────────── */
    .vd-status-row {
      display: flex;
      align-items: center;
    }

    /* ── Acciones panel ───────────────────────────────────────────────────── */
    .vd-acciones-hint {
      font-size: 12px;
      color: var(--ds-text-muted);
      margin: 0 0 var(--space-4) 0;
    }

    .vd-acciones {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .vd-accion-wrapper {
      display: block;
      width: 100%;
    }

    .vd-accion-btn {
      width: 100%;
    }

    /* ── Botón volver ─────────────────────────────────────────────────────── */
    .vd-btn-volver {
      display: block;
    }

    /* ── Mobile: tarjetas con más padding para uso en la calle ───────────── */
    @media (max-width: 767px) {
      .vd-card { padding: var(--space-6); border-radius: 16px; }
    }
  `],
})
export class VisitaDetallePage implements OnInit {
  private readonly store  = inject(Store);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly visit   = this.store.selectSignal(selectVisitDetail);
  readonly pending = this.store.selectSignal(selectDetailPending);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.store.dispatch(loadVisitDetail({ id: +idParam }));
    }
  }

  volver(): void {
    this.router.navigate(['/domicilio/mi-ruta']);
  }

  statusFor(status: HomeVisitStatus): StatusDisplay {
    return STATUS_MAP[status] ?? { label: status, severity: 'secondary', icon: 'pi-circle' };
  }

  /** Expuesto al template y a los tests */
  formatTime(time: string): string {
    return formatTime(time);
  }

  /** Expuesto al template y a los tests */
  formatScheduledAt(iso: string | null): string {
    return formatScheduledAt(iso);
  }
}
