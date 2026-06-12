import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { CONTACT_TYPE_LABELS } from '../../models/contact-info.model';
import { PlanComplete } from '../../models/plan.model';
import { Agreement } from '../../models/agreement.model';
import { loadObraSocial, loadObraSocialFailure, clearSelectedObraSocial } from '../../store/obra-social.actions';
import { selectSelectedObraSocial, selectObraSocialPending, selectNbuOptions } from '../../store/obra-social.selectors';

@Component({
  selector: 'os-obra-social-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, FormsModule, DatePipe, ButtonModule, TabsModule, TableModule, TagModule, SelectModule,
    CurrencyArPipe, EmptyStateComponent,
  ],
  template: `
    @if (insurer(); as o) {
      <div class="p-6">
        <a routerLink="/obras-sociales" class="inline-block mb-3">
          <p-button [text]="true" icon="pi pi-arrow-left" label="Volver a Obras Sociales" />
        </a>
        <header class="flex items-center justify-between mb-3">
          <h1 class="text-2xl font-semibold">
            {{ o.name }}
            @if (o.active) { <p-tag value="Activa" severity="success" class="ml-2" /> }
            @else { <p-tag value="Inactiva" severity="danger" class="ml-2" /> }
          </h1>
        </header>

        <p-tabs value="info">
          <p-tablist>
            <p-tab value="info">Información</p-tab>
            <p-tab value="plans">Planes y convenios</p-tab>
            <p-tab value="history">Convenios</p-tab>
          </p-tablist>
          <p-tabpanels>
            <!-- INFORMACIÓN (incluye Contactos) -->
            <p-tabpanel value="info">
              <div class="grid grid-cols-3 gap-3">
                <div><div class="text-xs text-surface-500">Código</div><div>{{ o.code }}</div></div>
                <div><div class="text-xs text-surface-500">Sigla</div><div>{{ o.acronym }}</div></div>
                <div><div class="text-xs text-surface-500">Tipo</div><div>{{ o.insurerTypeName }}</div></div>
                @if (o.specificData?.socialHealth || o.specificData?.privateHealth) {
                  <div><div class="text-xs text-surface-500">CUIT</div><div>{{ cuit() }}</div></div>
                }
                @if (o.specificData?.privateHealth?.copayPolicy) {
                  <div class="col-span-2"><div class="text-xs text-surface-500">Política de copago</div><div>{{ o.specificData?.privateHealth?.copayPolicy }}</div></div>
                }
                @if (o.specificData?.selfPay?.acceptedPaymentMethods) {
                  <div class="col-span-3"><div class="text-xs text-surface-500">Medios de pago aceptados</div><div>{{ o.specificData?.selfPay?.acceptedPaymentMethods }}</div></div>
                }
                @if (o.authorizationUrl) {
                  <div class="col-span-3"><div class="text-xs text-surface-500">URL de autorización</div><div>{{ o.authorizationUrl }}</div></div>
                }
                @if (o.description) {
                  <div class="col-span-3"><div class="text-xs text-surface-500">Descripción</div><div>{{ o.description }}</div></div>
                }
              </div>

              <!-- Contactos (movido desde su antigua pestaña) -->
              @if (o.insurerType !== 'SELF_PAY') {
                <div class="mt-5">
                  <div class="text-xs text-surface-500 mb-2">Contactos</div>
                  @if (o.contacts.length === 0) {
                    <ui-empty-state heading="Sin contactos" icon="pi-phone" />
                  } @else {
                    <ul class="space-y-1">
                      @for (c of o.contacts; track c.id) {
                        <li class="flex gap-2 items-center">
                          <p-tag [value]="contactLabel(c.contactType)" />
                          <span>{{ c.contact }}</span>
                          @if (!c.isActive) { <p-tag severity="danger" value="Inactivo" /> }
                        </li>
                      }
                    </ul>
                  }
                </div>
              }
            </p-tabpanel>

            <!-- PLANES Y CONVENIOS -->
            <p-tabpanel value="plans">
              @if (o.plans.length === 0) {
                <ui-empty-state heading="Sin planes" icon="pi-folder-open" />
              } @else {
                <p-table [value]="o.plans" dataKey="id">
                  <ng-template pTemplate="header">
                    <tr><th>Código</th><th>Nombre</th><th>Sigla</th><th>Vigente desde</th><th>NBU</th><th>Valor U.B.</th><th>IVA</th><th>Estado</th></tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-p>
                    <tr>
                      <td>{{ p.code }}</td><td class="font-medium">{{ p.name }}</td><td>{{ p.acronym }}</td>
                      <td>{{ currentAgreement(p)?.validFromDate | date:'dd/MM/yyyy' }}</td>
                      <td>{{ nbuLabel(currentAgreement(p)?.versionNbu) }}</td>
                      <td>{{ currentAgreement(p)?.ubValue | currencyAr }}</td>
                      <td>{{ p.iva }}%</td>
                      <td>
                        @if (p.isActive) { <p-tag severity="success" value="Activo" /> }
                        @else { <p-tag severity="danger" value="Inactivo" /> }
                      </td>
                    </tr>
                  </ng-template>
                </p-table>
              }
            </p-tabpanel>

            <!-- CONVENIOS (historial por plan) -->
            <p-tabpanel value="history">
              @if (o.plans.length === 0) {
                <ui-empty-state heading="Sin convenios" icon="pi-history" />
              } @else {
                <div class="mb-3 max-w-xs">
                  <p-select
                    [options]="planOptions()"
                    optionLabel="label"
                    optionValue="value"
                    [ngModel]="selectedPlanId()"
                    (onChange)="selectedPlanId.set($event.value)"
                    placeholder="Elegí un plan" />
                </div>
                <p-table [value]="selectedAgreements()" dataKey="id">
                  <ng-template pTemplate="header">
                    <tr><th>NBU</th><th>Valor U.B.</th><th>Vigente desde</th><th>Vigente hasta</th></tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-a>
                    <tr>
                      <td>{{ nbuLabel(a.versionNbu) }}</td>
                      <td>{{ a.ubValue | currencyAr }}</td>
                      <td>{{ a.validFromDate | date:'dd/MM/yyyy' }}</td>
                      <td>{{ a.validToDate ? (a.validToDate | date:'dd/MM/yyyy') : '—' }}</td>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="emptymessage">
                    <tr><td colspan="4" class="text-surface-500 text-sm py-3">Elegí un plan para ver sus convenios.</td></tr>
                  </ng-template>
                </p-table>
              }
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </div>
    } @else {
      <div class="p-6">{{ pending() ? 'Cargando...' : 'Obra social no encontrada.' }}</div>
    }
  `,
})
export class ObraSocialDetailPage implements OnInit, OnDestroy {
  /** Param de ruta vía withComponentInputBinding(). */
  readonly id = input.required<string>();

  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly actions$ = inject(Actions);

  readonly insurer = this.store.selectSignal(selectSelectedObraSocial);
  readonly pending = this.store.selectSignal(selectObraSocialPending);
  private readonly nbuOptions = this.store.selectSignal(selectNbuOptions);

  readonly selectedPlanId = signal<number | null>(null);

  constructor() {
    this.actions$
      .pipe(ofType(loadObraSocialFailure), takeUntilDestroyed())
      .subscribe(() => this.router.navigate(['/obras-sociales']));
  }

  readonly cuit = computed(() => {
    const sd = this.insurer()?.specificData;
    return sd?.socialHealth?.cuit ?? sd?.privateHealth?.cuit ?? '—';
  });

  readonly planOptions = computed(() =>
    (this.insurer()?.plans ?? []).map((p) => ({ label: `${p.name} (${p.code})`, value: p.id })),
  );

  readonly selectedAgreements = computed(() => {
    const o = this.insurer();
    if (!o) return [];
    const planId = this.selectedPlanId() ?? o.plans[0]?.id ?? null;
    const plan = o.plans.find((p) => p.id === planId);
    return plan?.actualAgreements ?? [];
  });

  ngOnInit(): void {
    const numericId = Number(this.id());
    if (Number.isNaN(numericId)) { this.router.navigate(['/obras-sociales']); return; }
    this.store.dispatch(loadObraSocial({ id: numericId }));
  }

  ngOnDestroy(): void { this.store.dispatch(clearSelectedObraSocial()); }

  contactLabel(code: keyof typeof CONTACT_TYPE_LABELS): string { return CONTACT_TYPE_LABELS[code] ?? code; }
  nbuLabel(value: number | undefined): string {
    if (value == null) return '—';
    return this.nbuOptions().find((o) => o.value === value)?.label ?? String(value);
  }
  currentAgreement(p: PlanComplete): Agreement | undefined {
    return p.actualAgreements.find((a) => !a.validToDate) ?? p.actualAgreements[0];
  }
}
