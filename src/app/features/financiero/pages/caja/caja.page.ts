import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { TooltipModule } from 'primeng/tooltip';
import { TokenService } from '@core/auth/token.service';

import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { RefreshIndicatorComponent } from '@shared/ui/components/refresh-indicator/refresh-indicator.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';

import { PollingService, PollingHandle, EtagCacheService } from '@core/refresh';

import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';
import { CajaContextService } from '../../services/caja-context.service';

import {
  selectIsCajaOpen,
  selectCajaSession,
  selectCajaActivity,
  selectCajaLoading,
  selectCajaSaldo,
  selectCajaError,
  selectCashRegisters,
  selectOtrosRows,
  selectOtrosTotal,
  selectOtrosLoading,
} from '../../store/financiero.selectors';
import {
  loadOpenSession,
  loadActivity,
  loadCashRegisters,
  loadBranchOtherMedia,
  sessionNotFound,
} from '../../store/financiero.actions';

import { MetodoChipComponent } from '../../components/metodo-chip.component';
import { EstadoCajaPillComponent } from '../../components/estado-caja-pill.component';
import { AbrirCajaModalComponent } from './components/abrir-caja-modal.component';
import { MovimientoModalComponent } from './components/movimiento-modal.component';
import { ArqueoModalComponent } from './components/arqueo-modal.component';
import { SessionActivityRow } from '../../models/financiero.model';
import { TableColumn } from '@shared/ui/models/table-column.model';

type ModalType = 'abrir' | 'movimiento' | 'arqueo' | null;

function dayBounds(isoDate: string): { from: string; to: string } {
  const [y, m, d] = isoDate.split('-').map(Number);
  const from = new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
  const to = new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
  return { from, to };
}

function todayIso(): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

@Component({
  selector: 'fin-caja-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    TooltipModule,
    PageHeaderComponent,
    EmptyStateComponent,
    DataTableComponent,
    RefreshIndicatorComponent,
    UiCellDirective,
    CurrencyArPipe,
    MetodoChipComponent,
    EstadoCajaPillComponent,
    AbrirCajaModalComponent,
    MovimientoModalComponent,
    ArqueoModalComponent,
  ],
  template: `
    <div class="fin-caja">
      <ui-page-header
        heading="Caja"
        subtitle="Efectivo de la subcaja (arqueo) y otros medios de la sucursal.">
        @if (isCajaOpen()) {
          <ui-refresh-indicator [lastRefreshAt]="lastRefreshAt()" />
        }
      </ui-page-header>

      <!-- ── Selector de subcaja ── -->
      <div class="fin-card fin-card--selector">
        <div class="fin-selector-left">
          <label for="fin-register-sel">Subcaja</label>
          @if (registers().length > 0) {
            <select
              id="fin-register-sel"
              class="fin-select"
              data-testid="register-selector"
              [ngModel]="selectedRegisterId()"
              (ngModelChange)="selectRegister($event)">
              @for (r of registers(); track r.id) {
                <option [ngValue]="r.id">{{ r.name }}</option>
              }
            </select>
          } @else {
            <span class="fin-muted" data-testid="no-registers">No hay cajas configuradas en esta sucursal.</span>
          }
        </div>
        @if (isAdmin()) {
          <div class="fin-selector-actions">
            <a class="fin-link" routerLink="/financiero/subcajas">Administrar cajas</a>
            <a class="fin-link" routerLink="/financiero/cuentas-destino">Cuentas destino</a>
          </div>
        }
      </div>

      <!-- ── LOADING ── -->
      @if (loading()) {
        <div class="fin-card fin-card--loading">
          <div class="fin-skeleton fin-skeleton--tall"></div>
        </div>
      }

      <!-- ── ERROR ── -->
      @else if (error()) {
        <div class="fin-card">
          <ui-empty-state
            icon=""
            heading="Error al cargar la caja"
            [description]="error() ?? ''"
            ctaLabel="Reintentar"
            (ctaClick)="retry()" />
        </div>
      }

      <!-- ── SIN SUBCAJA SELECCIONADA ── -->
      @else if (selectedRegisterId() == null) {
        <div class="fin-card">
          <ui-empty-state
            icon=""
            heading="Seleccioná una subcaja"
            description="Elegí la caja sobre la que vas a operar. Si no hay ninguna, pedile a un administrador que cree una." />
        </div>
      }

      <!-- ── CAJA CERRADA ── -->
      @else if (!isCajaOpen()) {
        <div class="fin-card">
          <div class="fin-empty-center">
            <h3 data-testid="caja-cerrada-heading">La caja está cerrada</h3>
            <p>Esta subcaja no tiene una sesión abierta. Para cobrar atenciones en efectivo necesitás abrir la caja y declarar el efectivo inicial del turno.</p>
            <button
              class="fin-btn fin-btn--success"
              data-testid="cta-abrir-caja"
              type="button"
              (click)="openModal('abrir')">
              Abrir caja
            </button>
          </div>
        </div>
      }

      <!-- ── CAJA ABIERTA ── -->
      @else {
        <!-- Barra de estado -->
        <div class="fin-card fin-card--status">
          <div class="fin-status-bar">
            <fin-estado-caja-pill status="OPEN" />
            <span class="fin-status-info">
              Abierta a las
              <b>{{ session()?.openedAt | date:'HH:mm' }} hs</b>
              · apertura {{ session()?.openingAmount | currencyAr }}
            </span>
          </div>
          <div class="fin-actions-row">
            <button class="fin-btn fin-btn--ghost" type="button" (click)="openModal('movimiento')">
              Registrar movimiento
            </button>
            <button class="fin-btn fin-btn--primary" type="button" (click)="cobrarAtencion()">
              Cobrar atención
            </button>
            @if (isAdmin()) {
              <button class="fin-btn fin-btn--danger" type="button" (click)="openModal('arqueo')">
                Cerrar caja
              </button>
            } @else {
              <div class="fin-cerrar-caja-wrap">
                <button
                  class="fin-btn fin-btn--ghost fin-btn--disabled"
                  type="button"
                  disabled
                  pTooltip="Solo un administrador puede cerrar la caja"
                  tooltipPosition="top">
                  Cerrar caja
                </button>
                <span class="fin-cerrar-caja-note">
                  Cerrar caja es una acción de administrador. Pedile el arqueo a quien tenga ese rol.
                </span>
              </div>
            }
          </div>
        </div>

        <!-- KPIs -->
        <div class="fin-kpi-grid">
          <!-- Efectivo hero -->
          <div class="fin-kpi-card fin-kpi-card--hero">
            <span class="fin-kpi-tag">ARQUEABLE</span>
            <div class="fin-kpi-label">Efectivo en caja</div>
            <div class="fin-kpi-value">{{ saldo() | currencyAr }}</div>
            <div class="fin-kpi-meta">
              Apertura <b>{{ session()?.openingAmount | currencyAr }}</b> · es el monto que se cuenta al cerrar
            </div>
          </div>

          <!-- Otros medios (sucursal+día) -->
          <div class="fin-kpi-card">
            <div class="fin-kpi-label">Otros medios (sucursal · día)</div>
            <div class="fin-kpi-value fin-kpi-value--dark">{{ otrosTotal() | currencyAr }}</div>
            <div class="fin-kpi-note"><i class="pi pi-info-circle"></i> No suma al efectivo del cajón</div>
          </div>

          <!-- Cobros en efectivo del turno (transacciones de efectivo con pago asociado) -->
          <div class="fin-kpi-card">
            <div class="fin-kpi-label">Cobros del turno</div>
            <div class="fin-kpi-value fin-kpi-value--dark">{{ cobrosCount() }}</div>
            <div class="fin-kpi-meta">cobros en efectivo de la sesión</div>
          </div>
        </div>

        <!-- Tabla de movimientos de efectivo -->
        <div class="fin-card fin-card--table">
          <div class="fin-table-head">
            <h3>Efectivo de la sesión</h3>
            @if (!activityLoading()) {
              <span class="fin-muted">{{ rows().length }} movimiento{{ rows().length === 1 ? '' : 's' }}</span>
            }
          </div>

          @if (activityLoading()) {
            <div class="fin-skeleton fin-skeleton--tall" style="margin: 16px 18px"></div>
          } @else if (rows().length === 0) {
            <ui-empty-state
              icon=""
              heading="Caja abierta, sin movimientos de efectivo todavía"
              [description]="'La caja se abrió con ' + (session()?.openingAmount | currencyAr) + '. Apenas cobres en efectivo o registres un movimiento, aparecerá acá.'"
              ctaLabel="Cobrar una atención"
              (ctaClick)="cobrarAtencion()" />
          } @else {
            <ui-table
              [value]="rows()"
              [columns]="tableColumns"
              [loading]="loading()">
              <ng-template uiCell="tipo" let-row>
                <span class="fin-tx-tipo"
                      [class.fin-tx-amt--pos]="row.type === 'INGRESS'"
                      [class.fin-tx-amt--neg]="row.type === 'EGRESS'">
                  {{ row.type === 'INGRESS' ? 'Ingreso' : 'Egreso' }}
                </span>
              </ng-template>
              <ng-template uiCell="detalle" let-row>
                <div class="fin-tx-desc">
                  <span>{{ row.description }}</span>
                  @if (row.reference) { <small class="fin-muted">{{ row.reference }}</small> }
                </div>
              </ng-template>
              <ng-template uiCell="medio" let-row>
                <div class="fin-tx-medio">
                  <fin-metodo-chip [metodo]="row.method" />
                </div>
              </ng-template>
              <ng-template uiCell="hora" let-row>{{ row.occurredAt | date:'HH:mm' }}</ng-template>
              <ng-template uiCell="monto" let-row>
                <span class="fin-tx-amt"
                      [class.fin-tx-amt--pos]="row.type === 'INGRESS'"
                      [class.fin-tx-amt--neg]="row.type === 'EGRESS'">
                  {{ row.type === 'INGRESS' ? '+' : '−' }} {{ row.amount | currencyAr }}
                </span>
              </ng-template>
            </ui-table>
          }
        </div>
      }

      <!-- ── PANEL OTROS MEDIOS (sucursal + día) ── -->
      @if (selectedRegisterId() != null) {
        <div class="fin-card fin-card--table">
          <div class="fin-table-head">
            <div>
              <h3>Otros medios · sucursal</h3>
              <span class="fin-muted">Transferencias, QR, tarjetas y posnet del día de hoy. No forman parte del arqueo.</span>
            </div>
            <span class="fin-day-label" data-testid="otros-day">Hoy · {{ selectedDay() | date:'dd/MM/yyyy' }}</span>
          </div>

          @if (otrosRows().length === 0) {
            <ui-empty-state
              icon=""
              heading="Sin movimientos de otros medios este día"
              description="Los cobros con transferencia, QR, tarjeta o posnet de la sucursal aparecerán acá, agrupados por día." />
          } @else {
            <ui-table [value]="otrosRows()" [columns]="otrosColumns" [loading]="otrosLoading()">
              <ng-template uiCell="origen" let-row>
                <span class="fin-cash-flag fin-cash-flag--otro">
                  {{ row.source === 'ATTENTION_COLLECTION' ? 'cobro' : 'manual' }}
                </span>
              </ng-template>
              <ng-template uiCell="detalle" let-row>
                <div class="fin-tx-desc">
                  <span>{{ row.description || '—' }}</span>
                  @if (row.reference) { <small class="fin-muted">{{ row.reference }}</small> }
                </div>
              </ng-template>
              <ng-template uiCell="medio" let-row>
                <fin-metodo-chip [metodo]="row.method" />
              </ng-template>
              <ng-template uiCell="hora" let-row>{{ row.occurredAt | date:'HH:mm' }}</ng-template>
              <ng-template uiCell="monto" let-row>
                <span class="fin-tx-amt"
                      [class.fin-tx-amt--pos]="row.type === 'INGRESS'"
                      [class.fin-tx-amt--neg]="row.type === 'EGRESS'">
                  {{ row.type === 'INGRESS' ? '+' : '−' }} {{ row.amount | currencyAr }}
                </span>
              </ng-template>
            </ui-table>
          }
        </div>
      }

      <!-- ── MODALES ── -->
      @if (activeModal() === 'abrir' && selectedRegisterId() != null) {
        <fin-abrir-caja-modal [cashRegisterId]="selectedRegisterId()!" (closed)="closeModal()" />
      }
      @if (activeModal() === 'movimiento' && branchId() != null) {
        <fin-movimiento-modal
          [cashRegisterId]="selectedRegisterId()"
          [branchId]="branchId()!"
          (closed)="closeModal()" />
      }
      @if (activeModal() === 'arqueo') {
        <fin-arqueo-modal [esperado]="saldo()" (closed)="closeModal()" />
      }
    </div>
  `,
  styles: [`
    .fin-caja { display: flex; flex-direction: column; gap: 18px; }

    .fin-card {
      background: white; border-radius: 12px;
      box-shadow: 0 1px 2px rgba(28,30,55,.06), 0 1px 1px rgba(28,30,55,.04);
      border: 1px solid #e8e9f0;
    }
    .fin-card--selector { padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .fin-card--status { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .fin-card--table { overflow: hidden; }
    .fin-card--loading { padding: 24px; }

    .fin-selector-left { display: flex; align-items: center; gap: 10px; }
    .fin-selector-left label { font-size: 13.5px; font-weight: 600; color: #22243a; display: flex; align-items: center; gap: 6px; }
    .fin-selector-actions { display: flex; align-items: center; gap: 14px; }
    .fin-link { font-size: 13px; color: #4b4ddb; text-decoration: none; display: inline-flex; align-items: center; gap: 5px; }
    .fin-link:hover { text-decoration: underline; }

    .fin-select, .fin-date {
      border: 1.5px solid #e8e9f0; border-radius: 8px; padding: 7px 11px;
      font-size: 14px; color: #22243a; background: white;
    }

    .fin-status-bar { display: flex; align-items: center; gap: 14px; }
    .fin-status-info { font-size: 12.5px; color: #7c8092; }
    .fin-status-info b { color: #4a4d63; }
    .fin-actions-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

    .fin-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; border-radius: 8px; border: none;
      font-size: 13.5px; font-weight: 500; cursor: pointer;
      transition: background 120ms, color 120ms;
    }
    .fin-btn--primary { background: #4b4ddb; color: white; }
    .fin-btn--primary:hover { background: #3a3cc0; }
    .fin-btn--ghost { background: white; color: #4a4d63; border: 1.5px solid #e8e9f0; }
    .fin-btn--ghost:hover { background: #f5f6f9; }
    .fin-btn--disabled { opacity: 0.5; cursor: not-allowed; }
    .fin-btn--disabled:hover { background: white; }

    .fin-cerrar-caja-wrap { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
    .fin-cerrar-caja-note { font-size: 11.5px; color: #7c8092; max-width: 280px; line-height: 1.4; }
    .fin-btn--success { background: #0f8a55; color: white; margin-top: 18px; }
    .fin-btn--success:hover { background: #0a6b41; }
    .fin-btn--danger { background: #d83a3a; color: white; }
    .fin-btn--danger:hover { background: #b83232; }

    .fin-kpi-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 14px; }
    @media (max-width: 800px) { .fin-kpi-grid { grid-template-columns: 1fr; } }

    .fin-kpi-card {
      background: white; border-radius: 12px; padding: 20px 22px;
      box-shadow: 0 1px 2px rgba(28,30,55,.06); border: 1px solid #e8e9f0;
    }
    .fin-kpi-card--hero {
      background: linear-gradient(135deg, #1f8a5b, #0f8a55);
      border-color: transparent; color: white;
    }
    .fin-kpi-tag {
      font-size: 10px; font-weight: 700; letter-spacing: 1px;
      background: rgba(255,255,255,.2); color: white;
      padding: 2px 7px; border-radius: 4px;
      display: inline-block; margin-bottom: 8px;
    }
    .fin-kpi-label { font-size: 13px; color: rgba(255,255,255,.8); margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
    .fin-kpi-card:not(.fin-kpi-card--hero) .fin-kpi-label { color: #7c8092; }
    .fin-kpi-value { font-size: 32px; font-weight: 700; font-family: 'Roboto Mono', monospace; color: white; }
    .fin-kpi-value--dark { color: #22243a; }
    .fin-kpi-meta { font-size: 12px; color: rgba(255,255,255,.7); margin-top: 6px; }
    .fin-kpi-card:not(.fin-kpi-card--hero) .fin-kpi-meta { color: #7c8092; }
    .fin-kpi-note { font-size: 12px; color: #7c8092; display: flex; align-items: center; gap: 5px; margin-top: 6px; }

    .fin-table-head {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 18px; border-bottom: 1px solid #e8e9f0; gap: 12px;
    }
    .fin-table-head h3 { margin: 0; font-size: 15px; font-weight: 700; color: #22243a; }
    .fin-day-label { font-size: 12.5px; font-weight: 600; color: #4a4d63; white-space: nowrap; }

    .fin-tx-tipo { font-weight: 600; font-size: 12.5px; }

    .fin-tx-desc { display: flex; flex-direction: column; gap: 2px; }
    .fin-tx-medio { display: flex; align-items: center; gap: 8px; }
    .fin-cash-flag { font-size: 11px; padding: 1px 6px; border-radius: 4px; }
    .fin-cash-flag--otro { background: #f5f6f9; color: #7c8092; }

    .fin-tx-amt { font-family: 'Roboto Mono', monospace; font-weight: 600; font-size: 13.5px; }
    .fin-tx-amt--pos   { color: #0f8a55; }
    .fin-tx-amt--neg   { color: #d83a3a; }

    .fin-empty-center {
      display: flex; flex-direction: column; align-items: center;
      text-align: center; padding: 60px 24px;
    }
    .fin-empty-center h3 { margin: 0 0 10px; font-size: 20px; font-weight: 700; color: #22243a; }
    .fin-empty-center p { margin: 0 0 0; color: #7c8092; max-width: 380px; font-size: 14px; }

    .fin-skeleton { background: linear-gradient(90deg, #f5f6f9 25%, #eceef3 50%, #f5f6f9 75%); border-radius: 8px; }
    .fin-skeleton--tall { height: 120px; }

    .fin-muted { font-size: 12px; color: #7c8092; }
  `],
})
export class CajaPage implements OnInit {
  private readonly store     = inject(Store);
  private readonly router    = inject(Router);
  private readonly polling   = inject(PollingService);
  private readonly destroy   = inject(DestroyRef);
  private readonly branchCtx = inject(OperatorBranchContextService);
  private readonly cajaCtx   = inject(CajaContextService);
  private readonly tokens    = inject(TokenService);
  private readonly etagCache = inject(EtagCacheService);

  readonly isAdmin = signal(this.tokens.getRoles().includes('ADMINISTRADOR'));

  // Selectors
  readonly isCajaOpen = this.store.selectSignal(selectIsCajaOpen);
  readonly session    = this.store.selectSignal(selectCajaSession);
  readonly activity   = this.store.selectSignal(selectCajaActivity);
  readonly loading    = this.store.selectSignal(selectCajaLoading);
  readonly saldo      = this.store.selectSignal(selectCajaSaldo);
  readonly error      = this.store.selectSignal(selectCajaError);
  readonly registers  = this.store.selectSignal(selectCashRegisters);
  readonly otrosRows    = this.store.selectSignal(selectOtrosRows);
  readonly otrosTotal   = this.store.selectSignal(selectOtrosTotal);
  readonly otrosLoading = this.store.selectSignal(selectOtrosLoading);

  // UI state
  readonly activeModal   = signal<ModalType>(null);
  readonly lastRefreshAt = signal<Date | null>(null);
  readonly selectedRegisterId = signal<number | null>(null);
  readonly selectedDay = signal<string>(todayIso());
  readonly branchId = computed(() => this.branchCtx.branchId());

  // Derived
  readonly rows = computed<SessionActivityRow[]>(() => this.activity()?.rows ?? []);
  readonly cobrosCount = computed(() => this.activity()?.cobrosCount ?? 0);
  /** Caja abierta pero la actividad todavía no llegó: mostrar skeleton, no el empty-state
   *  ni datos stale de la subcaja anterior (activity se limpia al cambiar de sesión). */
  readonly activityLoading = computed(() => this.isCajaOpen() && this.activity() == null);

  readonly tableColumns: TableColumn[] = [
    { field: 'tipo',    header: 'Tipo' },
    { field: 'detalle', header: 'Detalle' },
    { field: 'medio',   header: 'Medio' },
    { field: 'hora',    header: 'Hora' },
    { field: 'monto',   header: 'Monto', align: 'right' },
  ];
  readonly otrosColumns: TableColumn[] = [
    { field: 'origen',  header: 'Origen' },
    { field: 'detalle', header: 'Detalle' },
    { field: 'medio',   header: 'Medio' },
    { field: 'hora',    header: 'Hora' },
    { field: 'monto',   header: 'Monto', align: 'right' },
  ];

  private pollingHandle: PollingHandle | null = null;

  constructor() {
    // Auto-selección de subcaja cuando llega el listado (persistida o primera activa).
    effect(() => {
      const regs = this.registers();
      if (regs.length === 0) return;
      const current = untracked(() => this.selectedRegisterId());
      const valid = current != null && regs.some(r => r.id === current && r.active);
      if (valid) return;
      const branchId = this.branchCtx.branchId();
      const persisted = branchId != null ? this.cajaCtx.selectedFor(branchId) : null;
      const pick = (persisted != null && regs.some(r => r.id === persisted && r.active))
        ? persisted
        : (regs.find(r => r.active)?.id ?? null);
      if (pick !== current) this.applySelection(pick);
    });
  }

  ngOnInit(): void {
    const branchId = this.branchCtx.branchId();
    if (branchId != null) {
      this.store.dispatch(loadCashRegisters({ branchId }));
    }

    this.pollingHandle = this.polling.startPolling({
      key: 'financiero-caja',
      intervalMs: 5000,
      poll: () => {
        const sess = this.session();
        // Solo polleamos la actividad de una sesión ya resuelta y perteneciente a la subcaja
        // seleccionada. `applySelection` despacha `loadOpenSession` y hace `pokeNow()` en el
        // mismo tick, así que sin este guard el poke leía la sesión vieja y disparaba un
        // `loadActivity` que `loadActivityOnSession$` cancelaba un instante después
        // (el XHR `activity` en estado "canceled" del Network).
        const settledForSelectedRegister =
          !this.loading() && sess?.cashRegisterId === this.selectedRegisterId();
        if (sess?.status === 'OPEN' && settledForSelectedRegister) {
          this.store.dispatch(loadActivity({ sessionId: sess.id }));
        }
        const b = this.branchCtx.branchId();
        if (b != null && this.selectedRegisterId() != null) {
          const { from, to } = dayBounds(this.selectedDay());
          this.store.dispatch(loadBranchOtherMedia({ branchId: b, from, to }));
        }
        this.lastRefreshAt.set(new Date());
        return of(null);
      },
    });

    this.destroy.onDestroy(() => this.pollingHandle?.stop());
  }

  private applySelection(id: number | null): void {
    this.selectedRegisterId.set(id);
    const branchId = this.branchCtx.branchId();
    if (id != null) {
      if (branchId != null) this.cajaCtx.select(branchId, id);
      // `loadOpenSession` limpia `activity` en el reducer, pero el cache de ETags vive en el
      // root injector y sobrevive a la navegación. Sin invalidar acá, al volver a la pantalla
      // el primer GET de actividad manda `If-None-Match`, el server contesta 304 con toda la
      // razón, y como no hay reducer para el NotModified el slice queda en null para siempre:
      // el card "Efectivo de la sesión" se queda en skeleton hasta que un F5 borra el cache.
      // Una pantalla que resetea su estado tiene que resetear también su ETag.
      this.etagCache.clearMatching('/financiero/cash-sessions/');
      this.store.dispatch(loadOpenSession({ cashRegisterId: id }));
    } else {
      this.store.dispatch(sessionNotFound());
    }
    // Traer otros-medios (sucursal+día) ya mismo, sin esperar el tick de 5s. La actividad
    // de la sesión la dispara el effect al resolverse la sesión (loadActivityOnSession$).
    this.pollingHandle?.pokeNow();
  }

  protected selectRegister(id: number): void {
    if (id === this.selectedRegisterId()) return;
    this.applySelection(id);
  }

  protected openModal(type: ModalType): void {
    this.activeModal.set(type);
  }

  protected closeModal(): void {
    this.activeModal.set(null);
    this.pollingHandle?.pokeNow();
  }

  protected cobrarAtencion(): void {
    this.router.navigate(['/turnos/recepcion']);
  }

  protected retry(): void {
    const id = this.selectedRegisterId();
    const branchId = this.branchCtx.branchId();
    if (branchId != null) this.store.dispatch(loadCashRegisters({ branchId }));
    if (id != null) this.store.dispatch(loadOpenSession({ cashRegisterId: id }));
  }
}
