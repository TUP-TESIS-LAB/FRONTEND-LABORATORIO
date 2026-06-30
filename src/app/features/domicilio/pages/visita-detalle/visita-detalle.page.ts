import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { HomeVisitOutcomeReason, HomeVisitStatus } from '../../models/home-visit.model';
import {
  loadVisitDetail,
  markExtracted,
  markExtractedSuccess,
  markExtractedFailure,
  markOutcome,
  markOutcomeSuccess,
  markOutcomeFailure,
  rescheduleVisit,
  rescheduleVisitSuccess,
  rescheduleVisitFailure,
} from '../../store/home-visit.actions';
import {
  selectVisitDetail,
  selectDetailPending,
  selectActionPending,
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

/** Opciones de motivo de no realización */
interface OutcomeOption {
  label: string;
  value: HomeVisitOutcomeReason;
}

const OUTCOME_OPTIONS: OutcomeOption[] = [
  { label: 'Paciente ausente',    value: 'PACIENTE_AUSENTE'   },
  { label: 'No se pudo extraer',  value: 'NO_SE_PUDO_EXTRAER' },
  { label: 'Rechazó',            value: 'RECHAZO_PACIENTE'   },
];

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
    DialogModule,
    TagModule,
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

          <!-- Acciones (sólo para visitas PROGRAMADAS) -->
          @if (v.status === 'PROGRAMADA') {
            <section class="vd-card vd-card--acciones" aria-labelledby="vd-sec-acciones">
              <h2 class="vd-section-title" id="vd-sec-acciones">Acciones</h2>
              <div class="vd-acciones">
                <p-button
                  label="Extraído"
                  icon="pi pi-check-circle"
                  severity="primary"
                  [disabled]="actionPending()"
                  [loading]="actionPending()"
                  class="vd-accion-btn"
                  ariaLabel="Registrar extracción exitosa"
                  (onClick)="abrirConfirmExtraccion(v.id)" />
                <p-button
                  label="No se realizó"
                  icon="pi pi-times-circle"
                  severity="danger"
                  [disabled]="actionPending()"
                  [loading]="actionPending()"
                  class="vd-accion-btn"
                  ariaLabel="Registrar visita no realizada"
                  (onClick)="abrirDialogOutcome(v.id)" />
                <p-button
                  label="Reprogramar"
                  icon="pi pi-refresh"
                  severity="secondary"
                  [disabled]="actionPending()"
                  [loading]="actionPending()"
                  class="vd-accion-btn"
                  ariaLabel="Reprogramar visita"
                  (onClick)="abrirConfirmReprogramar(v.id)" />
              </div>
            </section>
          } @else {
            <section class="vd-card vd-card--acciones" aria-labelledby="vd-sec-acciones-info">
              <h2 class="vd-section-title" id="vd-sec-acciones-info">Acciones</h2>
              <p class="vd-acciones-info">
                <i class="pi pi-info-circle"></i>
                Esta visita está en estado
                <strong>{{ statusFor(v.status).label }}</strong>
                y no admite acciones.
              </p>
            </section>
          }

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

    <!-- ── Diálogo: confirmar extracción ────────────────────────────────────── -->
    <p-dialog
      [(visible)]="dialogExtraccionVisible"
      [modal]="true"
      [closable]="true"
      [dismissableMask]="true"
      header="Confirmar extracción"
      [style]="{ width: '400px' }">
      <p class="vd-dialog-body">
        ¿Confirmás que la muestra fue extraída correctamente?
      </p>
      <ng-template pTemplate="footer">
        <p-button
          label="Cancelar"
          severity="secondary"
          [outlined]="true"
          (onClick)="dialogExtraccionVisible.set(false)" />
        <p-button
          label="Confirmar extracción"
          icon="pi pi-check"
          severity="primary"
          [disabled]="actionPending()"
          [loading]="actionPending()"
          (onClick)="confirmarExtraccion()" />
      </ng-template>
    </p-dialog>

    <!-- ── Diálogo: motivo de no realización ────────────────────────────────── -->
    <p-dialog
      [(visible)]="dialogOutcomeVisible"
      [modal]="true"
      [closable]="true"
      [dismissableMask]="true"
      header="No se realizó — motivo"
      [style]="{ width: '420px' }">
      <div class="vd-dialog-body vd-dialog-outcome">
        <p>Seleccioná el motivo por el cual no se realizó la visita:</p>
        <div class="vd-outcome-options">
          @for (opt of OUTCOME_OPTIONS; track opt.value) {
            <button
              type="button"
              class="vd-outcome-option"
              [class.vd-outcome-option--selected]="selectedReason() === opt.value"
              (click)="selectedReason.set(opt.value)">
              <i class="pi pi-circle{{ selectedReason() === opt.value ? '-fill' : '' }}"></i>
              {{ opt.label }}
            </button>
          }
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button
          label="Cancelar"
          severity="secondary"
          [outlined]="true"
          (onClick)="cerrarDialogOutcome()" />
        <p-button
          label="Registrar"
          icon="pi pi-save"
          severity="danger"
          [disabled]="!selectedReason() || actionPending()"
          [loading]="actionPending()"
          (onClick)="confirmarOutcome()" />
      </ng-template>
    </p-dialog>

    <!-- ── Diálogo: confirmar reprogramación ────────────────────────────────── -->
    <p-dialog
      [(visible)]="dialogReprogramarVisible"
      [modal]="true"
      [closable]="true"
      [dismissableMask]="true"
      header="Confirmar reprogramación"
      [style]="{ width: '400px' }">
      <p class="vd-dialog-body">
        ¿Confirmás que la visita debe ser reprogramada?
        El laboratorio coordinará una nueva fecha con el paciente.
      </p>
      <ng-template pTemplate="footer">
        <p-button
          label="Cancelar"
          severity="secondary"
          [outlined]="true"
          (onClick)="dialogReprogramarVisible.set(false)" />
        <p-button
          label="Confirmar reprogramación"
          icon="pi pi-refresh"
          severity="secondary"
          [disabled]="actionPending()"
          [loading]="actionPending()"
          (onClick)="confirmarReprogramar()" />
      </ng-template>
    </p-dialog>
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
    .vd-acciones {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .vd-accion-btn {
      width: 100%;
    }

    .vd-acciones-info {
      display: flex;
      align-items: flex-start;
      gap: var(--space-2);
      font-size: 13px;
      color: var(--ds-text-muted);
      margin: 0;
      line-height: 1.5;
    }

    /* ── Botón volver ─────────────────────────────────────────────────────── */
    .vd-btn-volver {
      display: block;
    }

    /* ── Mobile: tarjetas con más padding para uso en la calle ───────────── */
    @media (max-width: 767px) {
      .vd-card { padding: var(--space-6); border-radius: 16px; }
    }

    /* ── Diálogos ─────────────────────────────────────────────────────────── */
    .vd-dialog-body {
      font-size: 14px;
      color: var(--ds-text);
      line-height: 1.6;
      margin: 0;
    }

    .vd-dialog-outcome {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    /* ── Selector de motivo (outcome) ─────────────────────────────────────── */
    .vd-outcome-options {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .vd-outcome-option {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border: 1px solid var(--p-surface-border, #e5e7eb);
      border-radius: 8px;
      background: var(--p-surface-ground, #f9fafb);
      font-size: 14px;
      font-weight: 500;
      color: var(--ds-text);
      cursor: pointer;
      text-align: left;
      transition: border-color 150ms ease, background 150ms ease;
    }

    .vd-outcome-option:hover {
      border-color: var(--brand-primary, #2563EB);
      background: var(--p-surface-card, #fff);
    }

    .vd-outcome-option--selected {
      border-color: var(--brand-primary, #2563EB);
      background: color-mix(in srgb, var(--brand-primary, #2563EB) 8%, transparent);
      color: var(--brand-primary, #2563EB);
    }

    .vd-outcome-option i {
      font-size: 16px;
      flex-shrink: 0;
    }
  `],
})
export class VisitaDetallePage implements OnInit {
  private readonly store     = inject(Store);
  private readonly route     = inject(ActivatedRoute);
  private readonly router    = inject(Router);
  private readonly actions$  = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);

  readonly visit          = this.store.selectSignal(selectVisitDetail);
  readonly pending        = this.store.selectSignal(selectDetailPending);
  readonly actionPending  = this.store.selectSignal(selectActionPending);

  // ── Estado de diálogos ──────────────────────────────────────────────────────
  readonly dialogExtraccionVisible  = signal(false);
  readonly dialogOutcomeVisible     = signal(false);
  readonly dialogReprogramarVisible = signal(false);
  readonly selectedReason           = signal<HomeVisitOutcomeReason | null>(null);
  /** Código de barras escaneado antes de confirmar la extracción */
  readonly scannedBarcode           = signal<string>('');

  /** ID de la visita en operación (guardado al abrir el diálogo) */
  private visitIdEnAccion: number | null = null;

  /** Expuesto al template */
  readonly OUTCOME_OPTIONS = OUTCOME_OPTIONS;

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

  // ── Abrir diálogos ──────────────────────────────────────────────────────────

  abrirConfirmExtraccion(id: number): void {
    this.visitIdEnAccion = id;
    this.dialogExtraccionVisible.set(true);
  }

  abrirDialogOutcome(id: number): void {
    this.visitIdEnAccion = id;
    this.selectedReason.set(null);
    this.dialogOutcomeVisible.set(true);
  }

  abrirConfirmReprogramar(id: number): void {
    this.visitIdEnAccion = id;
    this.dialogReprogramarVisible.set(true);
  }

  cerrarDialogOutcome(): void {
    this.selectedReason.set(null);
    this.dialogOutcomeVisible.set(false);
  }

  // ── Confirmar acciones ──────────────────────────────────────────────────────

  confirmarExtraccion(): void {
    const id = this.visitIdEnAccion;
    if (id == null) return;
    this.dialogExtraccionVisible.set(false);
    this.store.dispatch(markExtracted({ id, scannedBarcode: this.scannedBarcode() }));
    this.actions$
      .pipe(
        ofType(markExtractedSuccess, markExtractedFailure),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((action) => {
        if (action.type === markExtractedSuccess.type) {
          this.router.navigate(['/domicilio/mi-ruta']);
        }
      });
  }

  confirmarOutcome(): void {
    const id     = this.visitIdEnAccion;
    const reason = this.selectedReason();
    if (id == null || !reason) return;
    this.cerrarDialogOutcome();
    this.store.dispatch(markOutcome({ id, reason }));
    this.actions$
      .pipe(
        ofType(markOutcomeSuccess, markOutcomeFailure),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((action) => {
        if (action.type === markOutcomeSuccess.type) {
          this.router.navigate(['/domicilio/mi-ruta']);
        }
      });
  }

  confirmarReprogramar(): void {
    const id = this.visitIdEnAccion;
    if (id == null) return;
    this.dialogReprogramarVisible.set(false);
    this.store.dispatch(rescheduleVisit({ id }));
    this.actions$
      .pipe(
        ofType(rescheduleVisitSuccess, rescheduleVisitFailure),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((action) => {
        if (action.type === rescheduleVisitSuccess.type) {
          this.router.navigate(['/domicilio/mi-ruta']);
        }
      });
  }
}
