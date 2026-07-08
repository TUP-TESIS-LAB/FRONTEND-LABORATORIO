import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';

import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { TokenService } from '@core/auth/token.service';

import {
  selectLiqSelected, selectLiqDetailLoading, selectLiqDetailError,
  selectLiqLifecycleInProgress, selectLiqInsurersIndex, selectLiqExporting, selectLiqInsurerPlans,
} from '../../store/financiero.selectors';
import {
  loadSettlement, informSettlement, cancelSettlement, loadInsurersIndex, loadInsurerPlans, exportSettlement,
  informSettlementSuccess, cancelSettlementSuccess, registerSettlementCollection,
} from '../../store/financiero.actions';
import { InformSettlementBody, CancelSettlementBody, RegisterCollectionBody, SettlementStatus } from '../../models/liquidaciones.model';
import { EstadoLiquidacionPillComponent } from '../../components/estado-liquidacion-pill.component';
import { InformarLiquidacionModalComponent } from './components/informar-liquidacion-modal.component';
import { AnularLiquidacionModalComponent } from './components/anular-liquidacion-modal.component';
import { RegistrarCobroLiquidacionModalComponent } from './components/registrar-cobro-liquidacion-modal.component';

type Modal = 'informar' | 'anular' | 'cobro' | null;
type TlState = 'done' | 'current' | 'future';
interface TimelineStep { label: string; date: string | null; amount: number | null; state: TlState; }

@Component({
  selector: 'fin-liquidacion-detalle-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, ButtonModule, PageHeaderComponent, EmptyStateComponent, CurrencyArPipe,
    EstadoLiquidacionPillComponent, InformarLiquidacionModalComponent, AnularLiquidacionModalComponent,
    RegistrarCobroLiquidacionModalComponent,
  ],
  template: `
    <div class="liq-det">
      <button class="liq-back" type="button" (click)="volver()">
        <i class="pi pi-arrow-left"></i> Volver al listado
      </button>

      <ui-page-header [heading]="headerTitle()">
        @if (liq(); as lh) {
          @if (lh.status !== 'CANCELLED') {
            <p-button data-testid="btn-exportar" label="Exportar a Excel" icon="pi pi-file-excel"
                      severity="secondary" [outlined]="true" [loading]="exporting()" (onClick)="exportar()" />
          }
          @if (isAdmin() && (lh.status === 'PENDING' || lh.status === 'INFORMED')) {
            <p-button data-testid="btn-anular" label="Anular" icon="pi pi-ban"
                      severity="danger" [text]="true" [disabled]="lifecycleInProgress()" (onClick)="modal.set('anular')" />
          }
          @if (isAdmin() && lh.status === 'PENDING') {
            <p-button data-testid="btn-informar" label="Informar" icon="pi pi-send"
                      severity="success" [loading]="lifecycleInProgress()" (onClick)="modal.set('informar')" />
          }
          @if (isAdmin() && lh.status === 'INFORMED') {
            <p-button data-testid="btn-cobrar" label="Registrar cobro" icon="pi pi-wallet"
                      severity="success" [loading]="lifecycleInProgress()" (onClick)="modal.set('cobro')" />
          }
        }
      </ui-page-header>

      @if (detailError()) {
        <ui-empty-state icon="pi-exclamation-circle" heading="No se pudo cargar la liquidación"
          [description]="detailError()!" ctaLabel="Reintentar" (ctaClick)="recargar()" />
      } @else if (liq(); as l) {
        <!-- Identidad + ciclo de vida -->
        <section class="liq-card liq-id">
          <div class="liq-id__meta">
            <div class="liq-id__field">
              <span class="liq-id__k">Obra Social</span>
              <span class="liq-id__v"><i class="pi pi-building"></i>{{ insurers().get(l.insurerId) ?? 'Obra social' }}</span>
            </div>
            <div class="liq-id__field">
              <span class="liq-id__k">Período</span>
              <span class="liq-id__v"><i class="pi pi-calendar"></i>{{ l.periodFrom | date:'dd/MM/yyyy' }} – {{ l.periodTo | date:'dd/MM/yyyy' }}</span>
            </div>
            <div class="liq-id__field">
              <span class="liq-id__k">Tipo</span>
              <span class="liq-id__v"><span class="liq-chip-neutral">{{ l.type === 'SIMPLE' ? 'Simple' : 'Especial' }}</span></span>
            </div>
            <div class="liq-id__pill"><fin-estado-liquidacion-pill [status]="l.status" /></div>
          </div>

          @if (l.status === 'CANCELLED') {
            <div class="liq-cancel">
              <i class="pi pi-ban"></i>
              <span>Liquidación anulada — no se computa en los totales a liquidar.</span>
            </div>
          } @else {
            <ol class="liq-tl">
              @for (step of timeline(); track step.label) {
                <li class="liq-tl__step" [class.is-done]="step.state === 'done'" [class.is-current]="step.state === 'current'">
                  <span class="liq-tl__dot">@if (step.state === 'done') { <i class="pi pi-check"></i> }</span>
                  <span class="liq-tl__label">{{ step.label }}</span>
                  @if (step.date) {
                    <span class="liq-tl__meta">{{ step.date | date:'dd/MM/yyyy' }}@if (step.amount != null) { · {{ step.amount | currencyAr }} }</span>
                  }
                </li>
              }
            </ol>
          }
        </section>

        <!-- Totales (sticky) | Detalle por plan -->
        <div class="liq-grid">
          <section class="liq-card liq-total" [class.is-void]="l.status === 'CANCELLED'">
            <span class="liq-total__k">Total a liquidar</span>
            <span class="liq-total__v">{{ totalConIva() | currencyAr }}</span>
            <div class="liq-total__rows">
              <div class="liq-kv"><span>Neto</span><b>{{ total() | currencyAr }}</b></div>
              <div class="liq-kv"><span>IVA</span><b>{{ totalIva() | currencyAr }}</b></div>
              @if ((l.status === 'INFORMED' || l.status === 'BILLED') && l.informedAmount != null) {
                <div class="liq-kv liq-kv--informed">
                  <span>Informado a la OS
                    @if (informedDiffiere()) { <i class="pi pi-exclamation-triangle" title="Difiere del total calculado"></i> }
                  </span>
                  <b>{{ l.informedAmount | currencyAr }}</b>
                </div>
              }
            </div>
            <div class="liq-total__foot">
              <span><i class="pi pi-list"></i> {{ l.plans.length }} plan{{ l.plans.length === 1 ? '' : 'es' }}</span>
              @if (prestacionesCount() > 0) {
                <span><i class="pi pi-file"></i> {{ prestacionesCount() }} {{ prestacionesCount() === 1 ? 'prestación' : 'prestaciones' }}</span>
              }
            </div>
          </section>

          <section class="liq-card liq-plans">
            <header class="liq-plans__head">
              <h2>Detalle por plan</h2>
              <span class="liq-plans__count">{{ planesResumen().length }} plan{{ planesResumen().length === 1 ? '' : 'es' }}</span>
            </header>

            @if (planesResumen().length > 1) {
              <div class="liq-prow liq-prow--head">
                <span>Plan</span>
                <span class="num">Neto</span>
                <span class="num">IVA</span>
                <span class="num">Total</span>
              </div>
            }

            @for (p of planesResumen(); track p.planId) {
              <div class="liq-prow" [attr.data-testid]="'plan-row-' + p.planId">
                <div class="liq-prow__plan">
                  <span class="liq-prow__name">{{ p.name }}</span>
                  <span class="liq-prow__tags">
                    <span class="liq-tag">{{ p.ivaPct > 0 ? ('IVA ' + p.ivaPct + '%') : 'IVA exento' }}</span>
                    <span class="liq-tag">{{ p.count }} {{ p.count === 1 ? 'prestación' : 'prestaciones' }}</span>
                  </span>
                </div>
                <span class="num liq-prow__net" data-label="Neto">{{ p.neto | currencyAr }}</span>
                <span class="num liq-prow__iva" data-label="IVA">{{ p.iva > 0 ? (p.iva | currencyAr) : '—' }}</span>
                <span class="num liq-prow__total" data-label="Total">{{ p.total | currencyAr }}</span>
              </div>
            } @empty {
              <div class="liq-empty">
                <i class="pi pi-inbox"></i>
                <p>Sin planes cargados</p>
                <small>Esta liquidación no tiene planes asociados.</small>
              </div>
            }

            @if (planesResumen().length > 1) {
              <div class="liq-prow liq-prow--total">
                <span class="liq-prow__name">Total</span>
                <span class="num">{{ total() | currencyAr }}</span>
                <span class="num">{{ totalIva() | currencyAr }}</span>
                <span class="num">{{ totalConIva() | currencyAr }}</span>
              </div>
            }
          </section>
        </div>
      } @else {
        <!-- Skeleton de carga (replica el layout) -->
        <div class="liq-card liq-sk" style="height: 96px"></div>
        <div class="liq-grid">
          <div class="liq-card liq-sk" style="height: 168px"></div>
          <div class="liq-card liq-sk" style="height: 240px"></div>
        </div>
      }

      @if (modal() === 'informar') {
        <fin-informar-liquidacion-modal [total]="total()" (confirm)="onInformar($event)" (closed)="modal.set(null)" />
      }
      @if (modal() === 'anular') {
        <fin-anular-liquidacion-modal (confirm)="onAnular($event)" (closed)="modal.set(null)" />
      }
      @if (modal() === 'cobro') {
        <fin-registrar-cobro-liquidacion-modal [total]="liq()?.informedAmount ?? totalConIva()" (confirm)="onCobrar($event)" (closed)="modal.set(null)" />
      }
    </div>
  `,
  styles: [`
    .liq-det { display: flex; flex-direction: column; }

    /* Back-link */
    .liq-back {
      align-self: flex-start; display: inline-flex; align-items: center; gap: 6px;
      background: none; border: none; padding: 0; margin-bottom: var(--space-3);
      color: var(--ds-text-muted); font-size: 13px; cursor: pointer;
    }
    .liq-back:hover { color: var(--brand-primary); }

    /* Cards */
    .liq-card {
      background: #fff; border: 1px solid var(--ds-border); border-radius: 12px;
      padding: var(--space-4) var(--space-5);
    }
    .liq-id { margin-bottom: var(--space-4); }

    /* Identidad — metadata en formato clave/valor */
    .liq-id__meta {
      display: flex; flex-wrap: wrap; align-items: center;
      gap: var(--space-5) var(--space-8);
    }
    .liq-id__field { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .liq-id__k { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: var(--ds-text-muted); }
    .liq-id__v { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: var(--ds-text); }
    .liq-id__v i { color: var(--ds-text-muted); font-size: 13px; }
    .liq-id__pill { margin-left: auto; }
    .liq-chip-neutral { font-weight: 500; font-size: 13px; background: var(--ds-surface); color: var(--ds-text); padding: 2px 10px; border-radius: 999px; }

    /* Timeline de ciclo de vida */
    .liq-tl {
      list-style: none; margin: var(--space-4) 0 0; padding: var(--space-4) 0 0;
      border-top: 1px solid var(--ds-border);
      display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: var(--space-2);
    }
    .liq-tl__step {
      position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
      padding-left: 2px;
    }
    .liq-tl__dot {
      display: inline-flex; align-items: center; justify-content: center;
      width: 22px; height: 22px; border-radius: 50%;
      border: 2px solid var(--ds-border); background: #fff; color: #fff; font-size: 11px;
    }
    .liq-tl__step.is-done .liq-tl__dot { background: var(--ds-success); border-color: var(--ds-success); }
    .liq-tl__step.is-current .liq-tl__dot { border-color: var(--brand-primary); }
    /* Conector entre nodos */
    .liq-tl__step::after {
      content: ''; position: absolute; top: 11px; left: 24px; right: -8px; height: 2px;
      background: var(--ds-border);
    }
    .liq-tl__step:last-child::after { display: none; }
    .liq-tl__step.is-done::after { background: var(--ds-success); }
    .liq-tl__label { font-size: 11px; text-transform: uppercase; letter-spacing: .4px; color: var(--ds-text-muted); font-weight: 600; }
    .liq-tl__step.is-current .liq-tl__label { color: var(--ds-text); }
    .liq-tl__meta { font-size: 12px; color: var(--ds-text); font-variant-numeric: tabular-nums; }

    /* Banda de anulada */
    .liq-cancel {
      display: flex; align-items: center; gap: 10px; margin-top: var(--space-4);
      padding: var(--space-3) var(--space-4); border-radius: 8px;
      background: color-mix(in srgb, var(--ds-danger) 10%, white);
      border-left: 4px solid var(--ds-danger);
      color: color-mix(in srgb, var(--ds-danger) 70%, black); font-size: 13px;
    }

    /* Grid totales | planes */
    .liq-grid { display: grid; grid-template-columns: 1fr 1.6fr; gap: var(--space-4); align-items: start; }

    /* Totales */
    .liq-total {
      position: sticky; top: calc(var(--ds-topbar-h) + var(--space-4));
      display: flex; flex-direction: column;
      border-left: 4px solid var(--brand-primary);
    }
    .liq-total.is-void { border-left-color: var(--ds-text-muted); }
    .liq-total.is-void .liq-total__v, .liq-total.is-void .liq-kv b { color: var(--ds-text-muted); }
    .liq-total__k { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: var(--ds-text-muted); }
    .liq-total__v { font-size: clamp(24px, 5vw, 32px); font-weight: 700; color: var(--brand-primary); font-variant-numeric: tabular-nums; line-height: 1.15; margin-top: 2px; }
    .liq-total__rows { margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--ds-surface); display: flex; flex-direction: column; gap: 6px; }
    .liq-kv { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-4); }
    .liq-kv span { font-size: 12px; color: var(--ds-text-muted); }
    .liq-kv b { font-size: 14px; font-weight: 600; color: var(--ds-text); font-variant-numeric: tabular-nums; }
    .liq-kv--informed { padding-top: 6px; border-top: 1px dashed var(--ds-border); }
    .liq-kv--informed i { color: var(--ds-warning); margin-left: 4px; font-size: 12px; }
    .liq-total__foot { margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--ds-surface); display: flex; flex-wrap: wrap; gap: var(--space-4); font-size: 12px; color: var(--ds-text-muted); }
    .liq-total__foot span { display: inline-flex; align-items: center; gap: 5px; }

    /* Detalle por plan */
    .liq-plans__head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: var(--space-2); }
    .liq-plans__head h2 { margin: 0; font-size: 15px; font-weight: 700; color: var(--ds-text); }
    .liq-plans__count { font-size: 12px; color: var(--ds-text-muted); }
    .liq-prow {
      display: grid; grid-template-columns: 1fr 120px 120px 130px; align-items: center;
      gap: var(--space-3); padding: var(--space-3) 0; border-top: 1px solid var(--ds-surface);
    }
    .liq-prow--head { border-top: none; padding: 6px 0; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; color: var(--ds-text-muted); font-weight: 600; }
    .liq-prow .num { text-align: right; font-variant-numeric: tabular-nums; }
    .liq-prow__plan { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
    .liq-prow__name { font-size: 14px; font-weight: 600; color: var(--ds-text); }
    .liq-prow__tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .liq-tag { font-size: 11px; color: var(--ds-text-muted); background: var(--ds-surface); padding: 1px 8px; border-radius: 999px; }
    .liq-prow__net, .liq-prow__iva { font-size: 13px; color: var(--ds-text-muted); }
    .liq-prow__total { font-size: 14px; font-weight: 700; color: var(--ds-text); }
    .liq-prow--total { border-top: 2px solid var(--ds-border); font-weight: 700; }
    .liq-prow--total .liq-prow__name { font-size: 12px; text-transform: uppercase; letter-spacing: .4px; }
    .liq-prow--total .num { color: var(--ds-text); }
    .liq-prow .num[data-label]::before { content: ''; }

    /* Vacío */
    .liq-empty { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: var(--space-6) 0; color: var(--ds-text-muted); }
    .liq-empty i { font-size: 24px; }
    .liq-empty p { margin: 0; font-weight: 600; color: var(--ds-text); }
    .liq-empty small { font-size: 12px; }

    /* Skeleton */
    .liq-sk { animation: liq-pulse 1.2s ease-in-out infinite; }
    @keyframes liq-pulse { 0%,100% { opacity: 1; } 50% { opacity: .55; } }

    /* Responsive */
    @media (max-width: 900px) {
      .liq-grid { grid-template-columns: 1fr; }
      .liq-total { position: static; }
      .liq-id__pill { margin-left: 0; }
      .liq-tl { grid-auto-flow: row; grid-auto-columns: auto; }
      .liq-tl__step::after { display: none; }
      .liq-prow { grid-template-columns: 1fr; gap: 6px; }
      .liq-prow--head { display: none; }
      .liq-prow .num { text-align: left; }
      .liq-prow .num[data-label]::before { content: attr(data-label) ": "; color: var(--ds-text-muted); font-weight: 500; }
      .liq-prow--total .num[data-label]::before { content: ''; }
    }
  `],
})
export class LiquidacionDetallePage implements OnInit {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tokens = inject(TokenService);

  readonly isAdmin = signal(this.tokens.getRoles().includes('ADMINISTRADOR'));
  protected readonly modal = signal<Modal>(null);

  protected readonly liq = this.store.selectSignal(selectLiqSelected);
  protected readonly detailLoading = this.store.selectSignal(selectLiqDetailLoading);
  protected readonly detailError = this.store.selectSignal(selectLiqDetailError);
  protected readonly lifecycleInProgress = this.store.selectSignal(selectLiqLifecycleInProgress);
  protected readonly exporting = this.store.selectSignal(selectLiqExporting);
  protected readonly insurers = this.store.selectSignal(selectLiqInsurersIndex);

  protected readonly headerTitle = computed(() => {
    const l = this.liq();
    return l ? `Liquidación N° ${l.settlementNumber}` : 'Liquidación';
  });

  protected readonly total = computed(() =>
    (this.liq()?.plans ?? []).flatMap(p => p.agreements).reduce((sum, a) => sum + a.agreementSubtotal, 0));
  protected readonly prestacionesCount = computed(() =>
    (this.liq()?.plans ?? []).flatMap(p => p.agreements).reduce((n, a) => n + a.providedServiceIds.length, 0));

  // Planes de la OS (nombre + IVA) para enriquecer el detalle. Se cargan al conocer el insurerId.
  private readonly insurerPlans = this.store.selectSignal(selectLiqInsurerPlans);
  private readonly planInfo = computed(() => {
    const m = new Map<number, { name: string; iva: number }>();
    for (const p of this.insurerPlans()) m.set(p.id, { name: p.name, iva: p.iva });
    return m;
  });

  /** Resumen por plan: nombre, IVA, N° prestaciones, neto, IVA $, total. */
  protected readonly planesResumen = computed(() =>
    (this.liq()?.plans ?? []).map(plan => {
      const info = this.planInfo().get(plan.planId);
      const neto = plan.agreements.reduce((s, a) => s + a.agreementSubtotal, 0);
      const count = plan.agreements.reduce((n, a) => n + a.providedServiceIds.length, 0);
      const ivaPct = info?.iva ?? 0;
      const iva = Math.round(neto * ivaPct) / 100;
      return { planId: plan.planId, name: info?.name ?? 'Plan', ivaPct, count, neto, iva, total: neto + iva };
    }));
  protected readonly totalIva = computed(() => this.planesResumen().reduce((s, p) => s + p.iva, 0));
  protected readonly totalConIva = computed(() => this.total() + this.totalIva());

  /** El monto informado a la OS difiere del total calculado (chequeo del administrador). */
  protected readonly informedDiffiere = computed(() => {
    const l = this.liq();
    if (!l || l.informedAmount == null) return false;
    return Math.abs(l.informedAmount - this.totalConIva()) > 0.01;
  });

  /** Ciclo de vida: Creada → Informada → Facturada, con estado por nodo según el status. */
  protected readonly timeline = computed<TimelineStep[]>(() => {
    const l = this.liq();
    if (!l) return [];
    const s: SettlementStatus = l.status;
    const informedState: TlState = s === 'PENDING' ? 'current' : 'done';
    const billedState: TlState = s === 'BILLED' ? 'done' : s === 'INFORMED' ? 'current' : 'future';
    return [
      { label: 'Creada', date: l.createdAt, amount: null, state: 'done' },
      { label: 'Informada', date: l.informedDate, amount: l.informedAmount, state: informedState },
      { label: 'Facturada', date: null, amount: null, state: billedState },
    ];
  });

  constructor() {
    // Al conocer la OS de la liquidación, cargar sus planes (nombre + IVA) una sola vez por insurerId.
    let lastInsurerId: number | null = null;
    effect(() => {
      const l = this.liq();
      if (l && l.insurerId !== lastInsurerId) {
        lastInsurerId = l.insurerId;
        this.store.dispatch(loadInsurerPlans({ insurerId: l.insurerId }));
      }
    });
  }

  private get id(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  private readonly actions$ = inject(Actions);
  private readonly destroy = inject(DestroyRef);

  ngOnInit(): void {
    // El nombre de la OS se resuelve del índice insurerId→nombre; al entrar por
    // deep-link/recarga directa al detalle hay que cargarlo (no solo desde el listado).
    this.store.dispatch(loadInsurersIndex());
    this.recargar();

    // Tras informar/anular con éxito → volver al listado (el toast lo emite el effect). KAN-175.
    merge(
      this.actions$.pipe(ofType(informSettlementSuccess)),
      this.actions$.pipe(ofType(cancelSettlementSuccess)),
    ).pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => this.router.navigate(['/financiero/liquidaciones']));
  }

  protected recargar(): void {
    this.store.dispatch(loadSettlement({ id: this.id }));
  }

  protected onInformar(body: InformSettlementBody): void {
    this.store.dispatch(informSettlement({ id: this.id, body }));
    this.modal.set(null);
  }

  protected onCobrar(body: RegisterCollectionBody): void {
    this.store.dispatch(registerSettlementCollection({ id: this.id, body }));
    this.modal.set(null);
  }

  protected onAnular(body: CancelSettlementBody): void {
    this.store.dispatch(cancelSettlement({ id: this.id, body }));
    this.modal.set(null);
  }

  protected exportar(): void {
    const l = this.liq();
    if (!l) return;
    this.store.dispatch(exportSettlement({ id: l.id, settlementNumber: l.settlementNumber }));
  }

  protected volver(): void {
    this.router.navigate(['/financiero/liquidaciones']);
  }
}
