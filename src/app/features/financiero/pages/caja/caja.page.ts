import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { StatCardComponent } from '@shared/ui/components/stat-card/stat-card.component';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { RefreshIndicatorComponent } from '@shared/ui/components/refresh-indicator/refresh-indicator.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { HasRoleDirective } from '@shared/directives/has-role.directive';

import { PollingService, PollingHandle } from '@core/refresh';

import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';

import {
  selectIsCajaOpen,
  selectCajaSession,
  selectCajaActivity,
  selectCajaLoading,
  selectCajaSaldo,
  selectCajaError,
} from '../../store/financiero.selectors';
import {
  loadOpenSession,
  loadActivity,
} from '../../store/financiero.actions';

import { MetodoChipComponent } from '../../components/metodo-chip.component';
import { EstadoCajaPillComponent } from '../../components/estado-caja-pill.component';
import { AbrirCajaModalComponent } from './components/abrir-caja-modal.component';
import { MovimientoModalComponent } from './components/movimiento-modal.component';
import { ArqueoModalComponent } from './components/arqueo-modal.component';
import { SessionActivityRow } from '../../models/financiero.model';
import { TableColumn } from '@shared/ui/models/table-column.model';

type ModalType = 'abrir' | 'movimiento' | 'arqueo' | null;

@Component({
  selector: 'fin-caja-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    PageHeaderComponent,
    EmptyStateComponent,
    StatCardComponent,
    DataTableComponent,
    RefreshIndicatorComponent,
    UiCellDirective,
    CurrencyArPipe,
    HasRoleDirective,
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
        subtitle="Estado de la caja. Cobros, movimientos y arqueo del turno.">
        @if (isCajaOpen()) {
          <ui-refresh-indicator [lastRefreshAt]="lastRefreshAt()" />
        }
      </ui-page-header>

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
            icon="pi-exclamation-triangle"
            heading="Error al cargar la caja"
            [description]="error() ?? ''"
            ctaLabel="Reintentar"
            (ctaClick)="retry()" />
        </div>
      }

      <!-- ── CAJA CERRADA ── -->
      @else if (!isCajaOpen()) {
        <div class="fin-card">
          <div class="fin-empty-center">
            <i class="pi pi-lock fin-empty__icon"></i>
            <h3 data-testid="caja-cerrada-heading">La caja está cerrada</h3>
            <p>No hay una caja abierta en esta sucursal. Para cobrar atenciones necesitás abrir la caja y declarar el efectivo inicial del turno.</p>
            <button
              class="fin-btn fin-btn--success"
              data-testid="cta-abrir-caja"
              type="button"
              (click)="openModal('abrir')">
              <i class="pi pi-lock-open"></i> Abrir caja
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
              <i class="pi pi-dollar"></i> Registrar movimiento
            </button>
            <button class="fin-btn fin-btn--primary" type="button" (click)="cobrarAtencion()">
              <i class="pi pi-dollar"></i> Cobrar atención
            </button>
            <ng-container *hasRole="'ADMINISTRADOR'">
              <button class="fin-btn fin-btn--danger" type="button" (click)="openModal('arqueo')">
                <i class="pi pi-lock"></i> Cerrar caja
              </button>
            </ng-container>
          </div>
        </div>

        <!-- KPIs -->
        <div class="fin-kpi-grid">
          <!-- Efectivo hero -->
          <div class="fin-kpi-card fin-kpi-card--hero">
            <span class="fin-kpi-tag">ARQUEABLE</span>
            <div class="fin-kpi-label"><i class="pi pi-money-bill"></i> Efectivo en caja</div>
            <div class="fin-kpi-value">{{ saldo() | currencyAr }}</div>
            <div class="fin-kpi-meta">
              Apertura <b>{{ session()?.openingAmount | currencyAr }}</b> · es el monto que se cuenta al cerrar
            </div>
          </div>

          <!-- Otros medios -->
          <div class="fin-kpi-card">
            <div class="fin-kpi-label"><i class="pi pi-credit-card"></i> Otros medios de pago</div>
            <div class="fin-kpi-value fin-kpi-value--dark">{{ otrosMediosTotal() | currencyAr }}</div>
            <div class="fin-kpi-note"><i class="pi pi-info-circle"></i> No suma al efectivo del cajón</div>
          </div>

          <!-- Cobros del turno -->
          <div class="fin-kpi-card">
            <div class="fin-kpi-label"><i class="pi pi-receipt"></i> Cobros del turno</div>
            <div class="fin-kpi-value fin-kpi-value--dark">{{ cobrosCount() }}</div>
            <div class="fin-kpi-meta">atenciones cobradas hoy</div>
          </div>
        </div>

        <!-- Tabla de movimientos -->
        <div class="fin-card fin-card--table">
          <div class="fin-table-head">
            <h3>Movimientos de la sesión</h3>
            <span class="fin-muted">{{ rows().length }} movimiento{{ rows().length === 1 ? '' : 's' }}</span>
          </div>

          @if (rows().length === 0) {
            <ui-empty-state
              icon="pi-inbox"
              heading="Caja abierta, sin movimientos todavía"
              [description]="'La caja se abrió con ' + (session()?.openingAmount | currencyAr) + '. Apenas cobres o registres un movimiento, aparecerá acá.'"
              ctaLabel="Cobrar una atención"
              (ctaClick)="cobrarAtencion()" />
          } @else {
            <ui-table
              [value]="rows()"
              [columns]="tableColumns"
              [loading]="loading()">
              <!-- Tipo: ícono ingreso/egreso -->
              <ng-template uiCell="tipo" let-row>
                <span class="fin-tx-icon"
                      [class.fin-tx-icon--in]="row.type === 'INGRESS'"
                      [class.fin-tx-icon--out]="row.type === 'EGRESS'">
                  <i [class]="'pi ' + (row.type === 'INGRESS' ? 'pi-arrow-down-left' : 'pi-arrow-up-right')"></i>
                </span>
              </ng-template>

              <!-- Detalle -->
              <ng-template uiCell="detalle" let-row>
                <div class="fin-tx-desc">
                  <span>{{ row.description }}</span>
                  @if (row.reference) {
                    <small class="fin-muted">{{ row.reference }}</small>
                  }
                </div>
              </ng-template>

              <!-- Medio -->
              <ng-template uiCell="medio" let-row>
                <div class="fin-tx-medio">
                  <fin-metodo-chip [metodo]="row.method" />
                  <span class="fin-cash-flag" [class.fin-cash-flag--efectivo]="row.esEfectivo" [class.fin-cash-flag--otro]="!row.esEfectivo">
                    {{ row.esEfectivo ? 'efectivo' : 'otro medio' }}
                  </span>
                </div>
              </ng-template>

              <!-- Hora -->
              <ng-template uiCell="hora" let-row>
                {{ row.occurredAt | date:'HH:mm' }}
              </ng-template>

              <!-- Monto -->
              <ng-template uiCell="monto" let-row>
                <span class="fin-tx-amt"
                      [class.fin-tx-amt--pos]="row.type === 'INGRESS' && row.esEfectivo"
                      [class.fin-tx-amt--muted]="row.type === 'INGRESS' && !row.esEfectivo"
                      [class.fin-tx-amt--neg]="row.type === 'EGRESS'">
                  {{ row.type === 'INGRESS' ? '+' : '−' }} {{ row.amount | currencyAr }}
                </span>
              </ng-template>
            </ui-table>
          }
        </div>
      }

      <!-- ── MODALES ── -->
      @if (activeModal() === 'abrir') {
        <fin-abrir-caja-modal (closed)="closeModal()" />
      }
      @if (activeModal() === 'movimiento') {
        <fin-movimiento-modal (closed)="closeModal()" />
      }
      @if (activeModal() === 'arqueo') {
        <fin-arqueo-modal [esperado]="saldo()" (closed)="closeModal()" />
      }
    </div>
  `,
  styles: [`
    .fin-caja { display: flex; flex-direction: column; gap: 18px; }

    /* ── Cards ── */
    .fin-card {
      background: white; border-radius: 12px;
      box-shadow: 0 1px 2px rgba(28,30,55,.06), 0 1px 1px rgba(28,30,55,.04);
      border: 1px solid #e8e9f0;
    }
    .fin-card--status { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .fin-card--table { overflow: hidden; }
    .fin-card--loading { padding: 24px; }

    /* ── Status bar ── */
    .fin-status-bar { display: flex; align-items: center; gap: 14px; }
    .fin-status-info { font-size: 12.5px; color: #7c8092; }
    .fin-status-info b { color: #4a4d63; }
    .fin-actions-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

    /* ── Buttons ── */
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
    .fin-btn--success { background: #0f8a55; color: white; margin-top: 18px; }
    .fin-btn--success:hover { background: #0a6b41; }
    .fin-btn--danger { background: #d83a3a; color: white; }
    .fin-btn--danger:hover { background: #b83232; }

    /* ── KPIs ── */
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

    /* ── Tabla movimientos ── */
    .fin-table-head {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 18px; border-bottom: 1px solid #e8e9f0;
    }
    .fin-table-head h3 { margin: 0; font-size: 15px; font-weight: 700; color: #22243a; }

    .fin-tx-icon {
      width: 28px; height: 28px; border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 13px;
    }
    .fin-tx-icon--in  { background: #e3f6ec; color: #0f8a55; }
    .fin-tx-icon--out { background: #fdebeb; color: #d83a3a; }

    .fin-tx-desc { display: flex; flex-direction: column; gap: 2px; }
    .fin-tx-medio { display: flex; align-items: center; gap: 8px; }
    .fin-cash-flag {
      font-size: 11px; padding: 1px 6px; border-radius: 4px;
    }
    .fin-cash-flag--efectivo { background: #e3f6ec; color: #0f8a55; }
    .fin-cash-flag--otro     { background: #f5f6f9; color: #7c8092; }

    .fin-tx-amt { font-family: 'Roboto Mono', monospace; font-weight: 600; font-size: 13.5px; }
    .fin-tx-amt--pos   { color: #0f8a55; }
    .fin-tx-amt--muted { color: #7c8092; }
    .fin-tx-amt--neg   { color: #d83a3a; }

    /* ── Empty / loading ── */
    .fin-empty-center {
      display: flex; flex-direction: column; align-items: center;
      text-align: center; padding: 60px 24px;
    }
    .fin-empty__icon { font-size: 52px; color: #7c8092; margin-bottom: 14px; }
    .fin-empty-center h3 { margin: 0 0 10px; font-size: 20px; font-weight: 700; color: #22243a; }
    .fin-empty-center p { margin: 0 0 0; color: #7c8092; max-width: 380px; font-size: 14px; }

    .fin-skeleton { background: linear-gradient(90deg, #f5f6f9 25%, #eceef3 50%, #f5f6f9 75%); border-radius: 8px; }
    .fin-skeleton--tall { height: 120px; }

    .fin-muted { font-size: 12px; color: #7c8092; }
  `],
})
export class CajaPage implements OnInit {
  private readonly store   = inject(Store);
  private readonly router  = inject(Router);
  private readonly polling = inject(PollingService);
  private readonly destroy = inject(DestroyRef);
  private readonly branchCtx = inject(OperatorBranchContextService);

  // Selectors
  readonly isCajaOpen = this.store.selectSignal(selectIsCajaOpen);
  readonly session    = this.store.selectSignal(selectCajaSession);
  readonly activity   = this.store.selectSignal(selectCajaActivity);
  readonly loading    = this.store.selectSignal(selectCajaLoading);
  readonly saldo      = this.store.selectSignal(selectCajaSaldo);
  readonly error      = this.store.selectSignal(selectCajaError);

  // UI state
  readonly activeModal   = signal<ModalType>(null);
  readonly lastRefreshAt = signal<Date | null>(null);

  // Derived
  readonly rows = computed<SessionActivityRow[]>(() => this.activity()?.rows ?? []);
  readonly otrosMediosTotal = computed(() => this.activity()?.otrosMediosTotal ?? 0);
  readonly cobrosCount = computed(() => this.activity()?.cobrosCount ?? 0);

  readonly tableColumns: TableColumn[] = [
    { field: 'tipo',   header: '' },
    { field: 'detalle', header: 'Detalle' },
    { field: 'medio',  header: 'Medio' },
    { field: 'hora',   header: 'Hora' },
    { field: 'monto',  header: 'Monto', align: 'right' },
  ];

  private pollingHandle: PollingHandle | null = null;

  ngOnInit(): void {
    const branchId = this.branchCtx.branchId();
    if (branchId) {
      this.store.dispatch(loadOpenSession({ branchId }));
    }

    // Start polling once session is open. We watch via effect-like polling callback.
    this.pollingHandle = this.polling.startPolling({
      key: 'financiero-caja',
      intervalMs: 5000,
      poll: () => {
        const sess = this.session();
        if (sess?.status === 'OPEN') {
          this.store.dispatch(loadActivity({ sessionId: sess.id }));
          this.lastRefreshAt.set(new Date());
        }
        return of(null);
      },
    });

    this.destroy.onDestroy(() => this.pollingHandle?.stop());
  }

  protected openModal(type: ModalType): void {
    this.activeModal.set(type);
  }

  protected closeModal(): void {
    this.activeModal.set(null);
    // Poke polling so the feed updates immediately after a transaction
    this.pollingHandle?.pokeNow();
  }

  protected cobrarAtencion(): void {
    this.router.navigate(['/financiero/cobrar']);
  }

  protected retry(): void {
    const branchId = this.branchCtx.branchId();
    if (branchId) this.store.dispatch(loadOpenSession({ branchId }));
  }
}
