import {
  ChangeDetectionStrategy, Component, OnInit, computed, inject, signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';

import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { TokenService } from '@core/auth/token.service';

import {
  selectLiqSelected, selectLiqDetailLoading, selectLiqDetailError,
  selectLiqLifecycleInProgress, selectLiqInsurersIndex,
} from '../../store/financiero.selectors';
import { loadSettlement, informSettlement, cancelSettlement, loadInsurersIndex } from '../../store/financiero.actions';
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
          <span class="liq-total__label">Total liquidado</span>
          <span class="liq-total__value">{{ total() | currencyAr }}</span>
          <span class="liq-total__sub">{{ prestacionesCount() }} {{ prestacionesCount() === 1 ? 'prestación' : 'prestaciones' }} en {{ l.plans.length }} convenio{{ l.plans.length === 1 ? '' : 's' }}</span>
        </div>

        <div class="fin-card liq-convenios">
          <h3>Convenios incluidos</h3>
          @for (plan of l.plans; track plan.planId) {
            @for (ag of plan.agreements; track ag.agreementId) {
              <div class="liq-conv-row">
                <span class="liq-conv-name">Convenio del plan</span>
                <span class="liq-conv-count">{{ ag.providedServiceIds.length }} {{ ag.providedServiceIds.length === 1 ? 'prestación' : 'prestaciones' }}</span>
                <span class="liq-conv-subtotal">{{ ag.agreementSubtotal | currencyAr }}</span>
              </div>
            }
          } @empty {
            <p class="liq-muted">Esta liquidación no tiene convenios cargados.</p>
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
        <fin-informar-liquidacion-modal (confirm)="onInformar($event)" (closed)="modal.set(null)" />
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
    .liq-total { display: flex; flex-direction: column; gap: 2px; }
    .liq-total__label { font-size: 12px; color: #7c8092; }
    .liq-total__value { font-size: 28px; font-weight: 700; color: #22243a; }
    .liq-total__sub { font-size: 12.5px; color: #7c8092; }
    .liq-convenios h3 { margin: 0 0 10px; font-size: 15px; }
    .liq-conv-row { display: grid; grid-template-columns: 1fr auto auto; gap: 16px; padding: 8px 0; border-top: 1px solid #f1f5f9; align-items: center; }
    .liq-conv-count { font-size: 12.5px; color: #64748b; }
    .liq-conv-subtotal { font-weight: 600; }
    .liq-muted { color: #7c8092; font-size: 13px; }
    .liq-actions { display: flex; gap: 8px; }
    .fin-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; border: none; font-size: 13.5px; font-weight: 500; cursor: pointer; }
    .fin-btn--ghost { background: #fff; color: #4a4d63; border: 1.5px solid #e8e9f0; }
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
  protected readonly insurers = this.store.selectSignal(selectLiqInsurersIndex);

  protected readonly total = computed(() =>
    (this.liq()?.plans ?? []).flatMap(p => p.agreements).reduce((sum, a) => sum + a.agreementSubtotal, 0));
  protected readonly prestacionesCount = computed(() =>
    (this.liq()?.plans ?? []).flatMap(p => p.agreements).reduce((n, a) => n + a.providedServiceIds.length, 0));

  private get id(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit(): void {
    // El nombre de la OS se resuelve del índice insurerId→nombre; al entrar por
    // deep-link/recarga directa al detalle hay que cargarlo (no solo desde el listado).
    this.store.dispatch(loadInsurersIndex());
    this.recargar();
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

  protected volver(): void {
    this.router.navigate(['/financiero/liquidaciones']);
  }
}
