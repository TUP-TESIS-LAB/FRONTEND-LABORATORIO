import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import {
  BreakageReason,
  HomeVisitOutcomeReason,
  HomeVisitStatus,
} from '../../models/home-visit.model';
import {
  loadVisitDetail,
  loadCustody,
  markExtracted,
  markExtractedSuccess,
  markExtractedFailure,
  markOutcome,
  markOutcomeSuccess,
  markOutcomeFailure,
  rescheduleVisit,
  rescheduleVisitSuccess,
  rescheduleVisitFailure,
  markInTransit,
  markBroken,
  reExtractVisit,
} from '../../store/home-visit.actions';
import {
  selectVisitDetail,
  selectDetailPending,
  selectActionPending,
  selectCustody,
  selectCustodyPending,
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
  ROTA:         { label: 'Rota',         severity: 'danger',    icon: 'pi-exclamation-triangle' },
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

/** Opciones de motivo de rotura/pérdida */
interface BreakageOption {
  label: string;
  value: BreakageReason;
}

const BREAKAGE_OPTIONS: BreakageOption[] = [
  { label: 'Rotura en transporte',    value: 'ROTURA_TRANSPORTE'      },
  { label: 'Muestra insuficiente',    value: 'MUESTRA_INSUFICIENTE'   },
  { label: 'Pérdida',                 value: 'PERDIDA'                },
  { label: 'Conservación inadecuada', value: 'CONSERVACION_INADECUADA' },
];

/** Traducción de las acciones de la cadena de custodia a español */
const CUSTODY_ACTION_MAP: Record<string, string> = {
  EXTRAIDO:      'Extraído',
  EN_TRANSITO:   'En tránsito',
  RECEPCIONADO:  'Recepcionado',
  ROTA:          'Rotura',
  RE_EXTRACCION: 'Re-extracción',
  REPROGRAMADA:  'Reprogramada',
};

/** Estados que admiten alguna acción del extractor en la ficha */
const ACTIONABLE_STATUSES: HomeVisitStatus[] = [
  'PROGRAMADA',
  'EXTRAIDA',
  'EN_TRANSITO',
  'ROTA',
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

/** Formatea un Instant ISO de custodia → 'DD/MM/YYYY HH:mm' (— si inválido) */
function formatOccurredAt(iso: string): string {
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
    FormsModule,
    InputTextModule,
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

          <!-- Cadena de custodia -->
          <section class="vd-card" aria-labelledby="vd-sec-custodia">
            <h2 class="vd-section-title" id="vd-sec-custodia">
              <i class="pi pi-history"></i> Cadena de custodia
            </h2>

            @if (custodyPending() && custody().length === 0) {
              <div class="vd-custody-loading" aria-live="polite" aria-busy="true">
                <i class="pi pi-spin pi-spinner"></i>
                <span>Cargando cadena de custodia...</span>
              </div>
            } @else if (custody().length === 0) {
              <p class="vd-empty-msg vd-custody-empty">
                Sin eventos de custodia registrados.
              </p>
            } @else {
              <ol class="vd-timeline">
                @for (ev of custody(); track $index) {
                  <li class="vd-timeline__item">
                    <span class="vd-timeline__dot" aria-hidden="true"></span>
                    <div class="vd-timeline__body">
                      <div class="vd-timeline__head">
                        <span class="vd-timeline__action">{{ custodyActionLabel(ev.action) }}</span>
                        <span class="vd-timeline__time">{{ formatOccurredAt(ev.occurredAt) }}</span>
                      </div>
                      @if (ev.note) {
                        <span class="vd-timeline__note">{{ ev.note }}</span>
                      }
                    </div>
                  </li>
                }
              </ol>
            }
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

          <!-- Acciones -->
          @if (hasAcciones(v.status)) {
            <section class="vd-card vd-card--acciones" aria-labelledby="vd-sec-acciones">
              <h2 class="vd-section-title" id="vd-sec-acciones">Acciones</h2>
              <div class="vd-acciones">

                <!-- ── PROGRAMADA: extraer / no realizó / reprogramar ── -->
                @if (v.status === 'PROGRAMADA') {
                  <!-- Extraído: sólo si la visita está preparada (attentionId != null) -->
                  @if (v.attentionId != null) {
                    <p-button
                      label="Extraído"
                      icon="pi pi-check-circle"
                      severity="primary"
                      [disabled]="actionPending()"
                      [loading]="actionPending()"
                      class="vd-accion-btn"
                      ariaLabel="Registrar extracción exitosa"
                      (onClick)="abrirConfirmExtraccion(v.id)" />
                  } @else {
                    <!-- Visita no preparada: no se puede extraer -->
                    <div class="vd-rotulos-pendientes" role="status">
                      <i class="pi pi-tag"></i>
                      <span>Rótulos pendientes de preparar (secretaría).</span>
                    </div>
                  }

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
                }

                <!-- ── EXTRAIDA: marcar en tránsito ── -->
                @if (v.status === 'EXTRAIDA') {
                  <p-button
                    label="En tránsito"
                    icon="pi pi-truck"
                    severity="primary"
                    [disabled]="actionPending()"
                    [loading]="actionPending()"
                    class="vd-accion-btn"
                    ariaLabel="Marcar la muestra en tránsito hacia el laboratorio"
                    (onClick)="marcarEnTransito(v.id)" />
                }

                <!-- ── EXTRAIDA o EN_TRANSITO: reportar rotura/pérdida ── -->
                @if (v.status === 'EXTRAIDA' || v.status === 'EN_TRANSITO') {
                  <p-button
                    label="Reportar rotura/pérdida"
                    icon="pi pi-exclamation-triangle"
                    severity="danger"
                    [outlined]="true"
                    [disabled]="actionPending()"
                    [loading]="actionPending()"
                    class="vd-accion-btn"
                    ariaLabel="Reportar rotura o pérdida de la muestra"
                    (onClick)="abrirDialogRotura(v.id)" />
                }

                <!-- ── ROTA: re-extraer sin recobro ── -->
                @if (v.status === 'ROTA') {
                  <p-button
                    label="Re-extraer (sin recobro)"
                    icon="pi pi-replay"
                    severity="primary"
                    [disabled]="actionPending()"
                    [loading]="actionPending()"
                    class="vd-accion-btn"
                    ariaLabel="Programar una re-extracción sin recobro"
                    (onClick)="reExtraer(v.id)" />
                }
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

          <!-- Visita sucesora (tras rotura → re-extracción) -->
          @if (v.rescheduledToVisitId != null) {
            <section class="vd-card vd-card--sucesora" aria-labelledby="vd-sec-sucesora">
              <h2 class="vd-section-title" id="vd-sec-sucesora">Re-extracción</h2>
              <button
                type="button"
                class="vd-sucesora-link"
                (click)="verSucesora(v.rescheduledToVisitId)"
                aria-label="Ver la visita sucesora generada por la re-extracción">
                <i class="pi pi-arrow-right"></i>
                <span>Ver visita sucesora</span>
              </button>
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
      [style]="{ width: '420px' }">
      <div class="vd-dialog-body vd-dialog-scan">
        <p>Escaneá o ingresá el código del rótulo para confirmar la extracción.</p>
        <div class="vd-scan-field">
          <label for="vd-scan-input" class="vd-scan-label">Código de rótulo</label>
          <input
            id="vd-scan-input"
            pInputText
            type="text"
            class="w-full"
            placeholder="Escaneá o ingresá el código"
            autocomplete="off"
            [ngModel]="scannedBarcode()"
            (ngModelChange)="scannedBarcode.set($event)"
            (keydown.enter)="scannedBarcode() ? confirmarExtraccion() : null"
            aria-label="Código de rótulo" />
        </div>
      </div>
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
          [disabled]="actionPending() || !scannedBarcode()"
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

    <!-- ── Diálogo: reportar rotura / pérdida ────────────────────────────────── -->
    <p-dialog
      [(visible)]="dialogRoturaVisible"
      [modal]="true"
      [closable]="true"
      [dismissableMask]="true"
      header="Reportar rotura / pérdida"
      [style]="{ width: '420px' }">
      <div class="vd-dialog-body vd-dialog-outcome">
        <p>Seleccioná el motivo de la rotura o pérdida de la muestra:</p>
        <div class="vd-outcome-options">
          @for (opt of BREAKAGE_OPTIONS; track opt.value) {
            <button
              type="button"
              class="vd-outcome-option"
              [class.vd-outcome-option--selected]="selectedBreakageReason() === opt.value"
              (click)="selectedBreakageReason.set(opt.value)">
              <i class="pi pi-circle{{ selectedBreakageReason() === opt.value ? '-fill' : '' }}"></i>
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
          (onClick)="cerrarDialogRotura()" />
        <p-button
          label="Registrar rotura"
          icon="pi pi-exclamation-triangle"
          severity="danger"
          [disabled]="!selectedBreakageReason() || actionPending()"
          [loading]="actionPending()"
          (onClick)="confirmarRotura()" />
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

    /* ── Aviso rótulos pendientes ─────────────────────────────────────────── */
    .vd-rotulos-pendientes {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 13px;
      color: var(--ds-text-muted);
      padding: var(--space-3) var(--space-4);
      border: 1px dashed var(--p-surface-border, #e5e7eb);
      border-radius: 8px;
      line-height: 1.4;
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

    .vd-dialog-scan {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    /* ── Scan input ──────────────────────────────────────────────────────── */
    .vd-scan-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .vd-scan-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--ds-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
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

    /* ── Cadena de custodia (timeline) ────────────────────────────────────── */
    .vd-custody-loading {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 13px;
      color: var(--ds-text-muted);
    }

    .vd-custody-empty {
      margin: 0;
      text-align: left;
    }

    .vd-timeline {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
    }

    .vd-timeline__item {
      position: relative;
      display: flex;
      gap: var(--space-3);
      padding-bottom: var(--space-4);
    }

    .vd-timeline__item:last-child {
      padding-bottom: 0;
    }

    /* Línea vertical que conecta los puntos */
    .vd-timeline__item:not(:last-child)::before {
      content: '';
      position: absolute;
      left: 5px;
      top: 14px;
      bottom: 0;
      width: 2px;
      background: var(--p-surface-border, #e5e7eb);
    }

    .vd-timeline__dot {
      position: relative;
      z-index: 1;
      flex-shrink: 0;
      width: 12px;
      height: 12px;
      margin-top: 3px;
      border-radius: 50%;
      background: var(--brand-primary, #2563EB);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-primary, #2563EB) 15%, transparent);
    }

    .vd-timeline__body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .vd-timeline__head {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--space-2);
    }

    .vd-timeline__action {
      font-size: 14px;
      font-weight: 600;
      color: var(--ds-text);
    }

    .vd-timeline__time {
      font-size: 12px;
      color: var(--ds-text-muted);
      font-variant-numeric: tabular-nums;
    }

    .vd-timeline__note {
      font-size: 13px;
      color: var(--ds-text-muted);
      line-height: 1.4;
    }

    /* ── Visita sucesora ──────────────────────────────────────────────────── */
    .vd-sucesora-link {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
      padding: var(--space-3) var(--space-4);
      border: 1px solid var(--p-surface-border, #e5e7eb);
      border-radius: 8px;
      background: var(--p-surface-ground, #f9fafb);
      font-size: 14px;
      font-weight: 600;
      color: var(--brand-primary, #2563EB);
      cursor: pointer;
      text-align: left;
      transition: border-color 150ms ease, background 150ms ease;
    }

    .vd-sucesora-link:hover {
      border-color: var(--brand-primary, #2563EB);
      background: var(--p-surface-card, #fff);
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
  readonly custody        = this.store.selectSignal(selectCustody);
  readonly custodyPending  = this.store.selectSignal(selectCustodyPending);

  // ── Estado de diálogos ──────────────────────────────────────────────────────
  readonly dialogExtraccionVisible  = signal(false);
  readonly dialogOutcomeVisible     = signal(false);
  readonly dialogReprogramarVisible = signal(false);
  readonly dialogRoturaVisible      = signal(false);
  readonly selectedReason           = signal<HomeVisitOutcomeReason | null>(null);
  readonly selectedBreakageReason   = signal<BreakageReason | null>(null);
  /** Código de barras escaneado antes de confirmar la extracción */
  readonly scannedBarcode           = signal<string>('');

  /** ID de la visita en operación (guardado al abrir el diálogo) */
  private visitIdEnAccion: number | null = null;

  /** Expuesto al template */
  readonly OUTCOME_OPTIONS = OUTCOME_OPTIONS;
  readonly BREAKAGE_OPTIONS = BREAKAGE_OPTIONS;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = +idParam;
      this.store.dispatch(loadVisitDetail({ id }));
      this.store.dispatch(loadCustody({ id }));
    }
  }

  volver(): void {
    this.router.navigate(['/domicilio/mi-ruta']);
  }

  /** Navega a la ficha de la visita sucesora (generada por la re-extracción). */
  verSucesora(id: number): void {
    this.router.navigate(['/domicilio/mi-ruta', id]);
  }

  statusFor(status: HomeVisitStatus): StatusDisplay {
    return STATUS_MAP[status] ?? { label: status, severity: 'secondary', icon: 'pi-circle' };
  }

  /** ¿El estado admite alguna acción del extractor? */
  hasAcciones(status: HomeVisitStatus): boolean {
    return ACTIONABLE_STATUSES.includes(status);
  }

  /** Traduce la acción de un evento de custodia a español. */
  custodyActionLabel(action: string): string {
    return CUSTODY_ACTION_MAP[action] ?? action;
  }

  /** Expuesto al template y a los tests */
  formatTime(time: string): string {
    return formatTime(time);
  }

  /** Expuesto al template y a los tests */
  formatScheduledAt(iso: string | null): string {
    return formatScheduledAt(iso);
  }

  /** Expuesto al template y a los tests */
  formatOccurredAt(iso: string): string {
    return formatOccurredAt(iso);
  }

  // ── Abrir diálogos ──────────────────────────────────────────────────────────

  abrirConfirmExtraccion(id: number): void {
    this.visitIdEnAccion = id;
    this.scannedBarcode.set('');
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

  abrirDialogRotura(id: number): void {
    this.visitIdEnAccion = id;
    this.selectedBreakageReason.set(null);
    this.dialogRoturaVisible.set(true);
  }

  cerrarDialogOutcome(): void {
    this.selectedReason.set(null);
    this.dialogOutcomeVisible.set(false);
  }

  cerrarDialogRotura(): void {
    this.selectedBreakageReason.set(null);
    this.dialogRoturaVisible.set(false);
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

  /** Marca la muestra en tránsito. El store refresca detalle + custodia + ruta. */
  marcarEnTransito(id: number): void {
    this.store.dispatch(markInTransit({ id }));
  }

  /** Confirma la rotura/pérdida con el motivo seleccionado. */
  confirmarRotura(): void {
    const id     = this.visitIdEnAccion;
    const reason = this.selectedBreakageReason();
    if (id == null || !reason) return;
    this.cerrarDialogRotura();
    this.store.dispatch(markBroken({ id, reason }));
  }

  /** Programa una re-extracción (sin recobro). El store refresca hacia la sucesora. */
  reExtraer(id: number): void {
    this.store.dispatch(reExtractVisit({ id }));
  }
}
