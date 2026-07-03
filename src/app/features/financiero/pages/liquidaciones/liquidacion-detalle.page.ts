import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  informSettlementSuccess, cancelSettlementSuccess,
} from '../../store/financiero.actions';
import { InformSettlementBody, CancelSettlementBody } from '../../models/liquidaciones.model';
import { EstadoLiquidacionPillComponent } from '../../components/estado-liquidacion-pill.component';
import { InformarLiquidacionModalComponent } from './components/informar-liquidacion-modal.component';
import { AnularLiquidacionModalComponent } from './components/anular-liquidacion-modal.component';

type Modal = 'informar' | 'anular' | null;

@Component({
  selector: 'fin-liquidacion-detalle-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, PageHeaderComponent, EmptyStateComponent, CurrencyArPipe,
    EstadoLiquidacionPillComponent, InformarLiquidacionModalComponent, AnularLiquidacionModalComponent,
  ],
  template: `
    <div class="fin-liq-det">
      <ui-page-header heading="Detalle de liquidación">
        <button class="fin-btn fin-btn--ghost" type="button" (click)="volver()">
          <i class="pi pi-arrow-left"></i> Volver
        </button>
        @if (liq(); as lh) {
          @if (lh.status !== 'CANCELLED') {
            <button class="fin-btn fin-btn--secondary" type="button" data-testid="btn-exportar"
                    [disabled]="exporting()" (click)="exportar()">
              <i class="pi" [class.pi-file-excel]="!exporting()" [class.pi-spin]="exporting()" [class.pi-spinner]="exporting()"></i>
              Exportar a Excel
            </button>
          }
        }
      </ui-page-header>

      @if (detailError()) {
        <ui-empty-state icon="pi-exclamation-circle" heading="No se pudo cargar la liquidación"
          [description]="detailError()!" ctaLabel="Reintentar" (ctaClick)="recargar()" />
      } @else if (liq(); as l) {
        <div class="fin-card liq-head">
          <div class="liq-head__main">
            <h2>N° {{ l.settlementNumber }}</h2>
            <fin-estado-liquidacion-pill [status]="l.status" />
            <span class="liq-type">{{ l.type === 'SIMPLE' ? 'Simple' : 'Especial' }}</span>
          </div>
          <div class="liq-head__meta">
            <span><b>Obra Social:</b> {{ insurers().get(l.insurerId) ?? 'Obra social' }}</span>
            <span><b>Período:</b> {{ l.periodFrom | date:'dd/MM/yyyy' }} – {{ l.periodTo | date:'dd/MM/yyyy' }}</span>
            @if (l.informedDate) {
              <span><b>Informada:</b> {{ l.informedDate | date:'dd/MM/yyyy' }} · {{ l.informedAmount | currencyAr }}</span>
            }
          </div>
        </div>

        <div class="fin-card liq-total">
          <div class="liq-total__head">
            <span class="liq-total__label">Total a liquidar</span>
            <span class="liq-total__value">{{ totalConIva() | currencyAr }}</span>
          </div>
          <div class="liq-total__break">
            <span>Neto <b>{{ total() | currencyAr }}</b></span>
            <span>IVA <b>{{ totalIva() | currencyAr }}</b></span>
            <span>{{ l.plans.length }} plan{{ l.plans.length === 1 ? '' : 'es' }}@if (prestacionesCount() > 0) { · {{ prestacionesCount() }} {{ prestacionesCount() === 1 ? 'prestación' : 'prestaciones' }}}</span>
          </div>
        </div>

        <div class="fin-card liq-convenios">
          <h3>Detalle por plan</h3>
          @for (p of planesResumen(); track p.planId) {
            <div class="liq-conv-row" [attr.data-testid]="'plan-row-' + p.planId">
              <div class="liq-conv-main">
                <span class="liq-conv-name">{{ p.name }}</span>
                <span class="liq-conv-tags">
                  <span class="liq-conv-tag">{{ p.ivaPct > 0 ? ('IVA ' + p.ivaPct + '%') : 'IVA exento' }}</span>
                  <span class="liq-conv-tag">{{ p.count }} {{ p.count === 1 ? 'prestación' : 'prestaciones' }}</span>
                </span>
              </div>
              <div class="liq-conv-amounts">
                <span class="liq-conv-net">Neto {{ p.neto | currencyAr }}</span>
                @if (p.iva > 0) { <span class="liq-conv-iva">IVA {{ p.iva | currencyAr }}</span> }
                <span class="liq-conv-total">{{ p.total | currencyAr }}</span>
              </div>
            </div>
          } @empty {
            <p class="liq-muted">Esta liquidación no tiene planes cargados.</p>
          }
        </div>

        @if (isAdmin() && l.status === 'PENDING') {
          <div class="liq-actions">
            <button class="fin-btn fin-btn--success" type="button" data-testid="btn-informar" [disabled]="lifecycleInProgress()" (click)="modal.set('informar')">
              <i class="pi pi-check"></i> Informar
            </button>
            <button class="fin-btn fin-btn--danger" type="button" data-testid="btn-anular" [disabled]="lifecycleInProgress()" (click)="modal.set('anular')">
              <i class="pi pi-times"></i> Anular
            </button>
          </div>
        } @else if (isAdmin() && l.status === 'INFORMED') {
          <div class="liq-actions">
            <button class="fin-btn fin-btn--danger" type="button" data-testid="btn-anular" [disabled]="lifecycleInProgress()" (click)="modal.set('anular')">
              <i class="pi pi-times"></i> Anular
            </button>
          </div>
        }
      } @else {
        <div class="fin-card liq-loading">Cargando…</div>
      }

      @if (modal() === 'informar') {
        <fin-informar-liquidacion-modal [total]="total()" (confirm)="onInformar($event)" (closed)="modal.set(null)" />
      }
      @if (modal() === 'anular') {
        <fin-anular-liquidacion-modal (confirm)="onAnular($event)" (closed)="modal.set(null)" />
      }
    </div>
  `,
  styles: [`
    .fin-liq-det { display: flex; flex-direction: column; gap: 14px; }
    .fin-card { background: #fff; border: 1px solid #e8e9f0; border-radius: 12px; padding: 18px 20px; }
    .liq-head__main { display: flex; align-items: center; gap: 12px; }
    .liq-head__main h2 { margin: 0; font-size: 20px; }
    .liq-type { font-size: 12.5px; color: #64748b; }
    .liq-head__meta { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 10px; font-size: 13px; color: #4a4d63; }
    .liq-total { display: flex; flex-direction: column; gap: 6px; }
    .liq-total__head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
    .liq-total__label { font-size: 12px; color: #7c8092; text-transform: uppercase; letter-spacing: .04em; }
    .liq-total__value { font-size: 28px; font-weight: 700; color: #0f6b44; }
    .liq-total__break { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12.5px; color: #7c8092; }
    .liq-total__break b { color: #4a4d63; font-variant-numeric: tabular-nums; }
    .liq-convenios h3 { margin: 0 0 10px; font-size: 15px; }
    .liq-conv-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 10px 0; border-top: 1px solid #f1f5f9; }
    .liq-conv-main { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .liq-conv-name { font-weight: 600; font-size: 14px; }
    .liq-conv-tags { display: flex; gap: 6px; flex-wrap: wrap; }
    .liq-conv-tag { font-size: 11.5px; color: #64748b; background: #eef2f7; padding: 1px 8px; border-radius: 20px; }
    .liq-conv-amounts { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; font-variant-numeric: tabular-nums; }
    .liq-conv-net { font-size: 12.5px; color: #64748b; }
    .liq-conv-iva { font-size: 12px; color: #94a3b8; }
    .liq-conv-total { font-weight: 700; color: #0f6b44; }
    .liq-muted { color: #7c8092; font-size: 13px; }
    .liq-actions { display: flex; gap: 8px; }
    .fin-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; border: none; font-size: 13.5px; font-weight: 500; cursor: pointer; }
    .fin-btn--ghost { background: #fff; color: #4a4d63; border: 1.5px solid #e8e9f0; }
    .fin-btn--secondary { background: #fff; color: #0f6b44; border: 1.5px solid #cbe6d7; }
    .fin-btn--secondary:disabled { opacity: .6; cursor: default; }
    .fin-btn--success { background: #0f8a55; color: #fff; }
    .fin-btn--danger { background: #d83a3a; color: #fff; }
    .liq-loading { color: #7c8092; }
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
