import {
  ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, computed, effect, inject, signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { DatePickerModule } from 'primeng/datepicker';

import { WizardShellComponent } from '@shared/ui/components/wizard-shell/wizard-shell.component';
import { FormStep } from '@shared/ui/models/form-step';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { UiRowExpansionDirective } from '@shared/ui/components/data-table/ui-row-expansion.directive';
import { TableColumn } from '@shared/ui/models/table-column.model';
import { FilterBarComponent, FilterBarConfig, FilterBarValue } from '@shared/ui/components/filter-bar/filter-bar.component';

import {
  selectLiqInsurers, selectLiqGenerating, selectLiqInsurerPlans,
  selectLiqPreviewDetail, selectLiqPreviewLoading,
} from '../../store/financiero.selectors';
import {
  loadInsurersIndex, loadInsurerPlans, loadPreviewDetail, resetPreviewDetail,
  generateSettlement, generateSettlementSuccess,
} from '../../store/financiero.actions';
import { InsurerSummary } from '@features/obras-sociales/models/insurer.model';
import {
  PreviewItem, PreviewGroup, PreviewAnalysis, ExcludedAnalysisIdsByPs, SpecialRule, FixedAmountsByPlan,
} from '../../models/liquidaciones.model';
import { TramosEditorComponent, TramoRow, tramosToRules, copyTramosFrom } from './components/tramos-editor.component';
import { FijosEditorComponent, FixedAmountRow, validateFijos, fijosToMap } from './components/fijos-editor.component';

const STEPS: FormStep[] = [
  { key: 'datos', title: 'Datos', subtitle: 'Obra social, período y planes' },
  { key: 'revisar', title: 'Revisar', subtitle: 'Prestaciones a liquidar' },
  { key: 'confirmar', title: 'Confirmar', subtitle: 'Resumen y generación' },
];

function toIso(d: Date | null): string {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Normaliza para búsqueda client-side: minúsculas + sin acentos. */
function norm(s: string | null | undefined): string {
  // ̀-ͯ = marcas diacríticas combinantes (acentos) que deja NFD.
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const currencyPipe = new CurrencyArPipe();

/**
 * Etiqueta del detalle de un análisis en el desglose del preview del paso Revisar:
 * "$X fijo" si tiene un valor fijo asignado (Task 5), si no el detalle por U.B.
 * ("{ubUnits} U.B. × {valor unitario}").
 */
export function analysisLabel(a: PreviewAnalysis): string {
  if (a.fixedAmount != null) {
    return `${currencyPipe.transform(a.fixedAmount)} fijo`;
  }
  const unitValue = a.ubUnits > 0 ? a.amount / a.ubUnits : a.amount;
  return `${a.ubUnits} U.B. × ${currencyPipe.transform(unitValue)}`;
}

@Component({
  selector: 'fin-generar-liquidacion-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, CurrencyArPipe, FormsModule, SelectModule, MultiSelectModule, DatePickerModule,
    WizardShellComponent, DataTableComponent, UiCellDirective, UiRowExpansionDirective, FilterBarComponent,
    TramosEditorComponent, FijosEditorComponent,
  ],
  template: `
    <ui-wizard-shell
      heading="Generar liquidación"
      [steps]="steps()"
      [currentIndex]="step()"
      [visited]="visited()"
      [continueDisabled]="continueDisabled()"
      finishLabel="Generar"
      [finishDisabled]="!canGenerate()"
      [finishLoading]="generating()"
      maxWidth="860px"
      (next)="next()"
      (back)="back()"
      (cancel)="cancelar()"
      (finish)="generar()"
      (stepSelected)="goToStep($event)">

      @if (stepKey() === 'datos') {
        <div class="step">
          <p class="muted">Elegí la obra social, el período y los planes a liquidar.</p>

          <div class="form-field">
            <label for="os">Obra Social <span class="pat-form__req" aria-hidden="true">*</span></label>
            <p-select inputId="os" [options]="insurers()" optionLabel="name" [filter]="true"
                      appendTo="body" [ngModel]="os()" (ngModelChange)="onOsChange($event)" data-testid="sel-os" />
          </div>

          <div class="form-field">
            <label>Tipo de liquidación</label>
            <div class="tipo-sel">
              <label><input type="radio" name="tipo" [checked]="tipo() === 'SIMPLE'" (change)="setTipo('SIMPLE')"> Simple</label>
              <label><input type="radio" name="tipo" [checked]="tipo() === 'ESPECIAL'" (change)="setTipo('ESPECIAL')"> Especial</label>
            </div>
            @if (tipo() === 'ESPECIAL') { <p class="muted">Definís el valor de la UB por tramos de cantidad, para cada plan.</p> }
          </div>

          <div class="form-row">
            <div class="form-field">
              <label for="from">Desde <span class="pat-form__req" aria-hidden="true">*</span></label>
              <p-datePicker inputId="from" dateFormat="dd/mm/yy" appendTo="body" [maxDate]="hoy"
                            [ngModel]="from()" (ngModelChange)="from.set($event)" data-testid="inp-from" />
            </div>
            <div class="form-field">
              <label for="to">Hasta <span class="pat-form__req" aria-hidden="true">*</span></label>
              <p-datePicker inputId="to" dateFormat="dd/mm/yy" appendTo="body" [maxDate]="hoy"
                            [ngModel]="to()" (ngModelChange)="to.set($event)" data-testid="inp-to" />
            </div>
          </div>

          @if (rangoInvalido()) {
            <small class="field-error">La fecha "Desde" no puede ser posterior a "Hasta".</small>
          }

          @if (os()) {
            <div class="form-field">
              <label for="planes">Planes a liquidar <span class="pat-form__req" aria-hidden="true">*</span></label>
              <p-multiSelect inputId="planes" [options]="insurerPlans()" optionLabel="name" optionValue="id"
                             [ngModel]="selectedPlanIds()" (ngModelChange)="selectedPlanIds.set($event)"
                             appendTo="body" [showToggleAll]="true" [filter]="insurerPlans().length > 6"
                             placeholder="Elegí los planes" selectedItemsLabel="{0} planes elegidos"
                             emptyMessage="La obra social no tiene planes" data-testid="sel-planes" />
              <small class="muted">Se liquidan solo los planes tildados. Por defecto van todos.</small>
              @if (os() && insurerPlans().length && !selectedPlanIds().length) {
                <small class="field-error">Elegí al menos un plan para liquidar.</small>
              }
            </div>

            @if (selectedPlans().length) {
              <div class="liq-plans-detail" data-testid="planes-convenio">
                <span class="liq-plans-detail__title">Convenios de los planes tildados</span>
                @for (p of selectedPlans(); track p.id) {
                  <div class="liq-plan-conv" [class.liq-plan-conv--noagr]="!p.hasActiveAgreement"
                       [attr.data-testid]="'plan-conv-' + p.id">
                    <span class="liq-plan-conv__name">{{ p.name }}</span>
                    @if (p.hasActiveAgreement) {
                      <span class="liq-plan-conv__arancel">Arancel {{ p.arancel | currencyAr }}</span>
                      <span class="liq-plan-conv__iva">{{ p.iva > 0 ? ('IVA ' + p.iva + '%') : 'IVA exento' }}</span>
                    } @else {
                      <span class="liq-plan-conv__warn">
                        <i class="pi pi-exclamation-triangle"></i> Sin convenio vigente
                      </span>
                    }
                  </div>
                }
              </div>
              @if (noPlanConvenio()) {
                <small class="field-error" data-testid="sin-convenio-error">
                  Ningún plan tildado tiene convenio vigente. No se puede generar la liquidación.
                </small>
              }
            }
          }
        </div>
      } @else if (stepKey() === 'tramos') {
        <div class="step">
          <p class="muted">Definí el valor de la U.B. por tramos de cantidad de estudios, para cada plan.</p>
          <div class="liq-tabs" role="tablist">
            @for (p of selectedPlans(); track p.id) {
              <button type="button" class="liq-tab" [class.liq-tab--active]="activeTramoPlan() === p.id"
                      (click)="activeTramoPlan.set(p.id)">
                {{ p.name }} {{ tramosValidos()[p.id] ? '✓' : '' }}
              </button>
            }
          </div>
          @for (p of selectedPlans(); track p.id) {
            @if (activeTramoPlan() === p.id) {
              @if (tramoCopySources(p.id).length) {
                <div class="liq-tramos-copy">
                  <label for="copiar-tramos-{{ p.id }}">Copiar tramos de otro plan</label>
                  <p-select inputId="copiar-tramos-{{ p.id }}"
                            [options]="tramoCopySources(p.id)" optionLabel="name" optionValue="id"
                            appendTo="body" placeholder="Elegí un plan"
                            [ngModel]="null" (ngModelChange)="onCopyTramos(p.id, $event)"
                            [attr.data-testid]="'sel-copiar-tramos-' + p.id" />
                </div>
              }
              <fin-tramos-editor [rows]="tramosPorPlan()[p.id] ?? []"
                                 (rowsChange)="onTramosChange(p.id, $event)"
                                 (validChange)="onTramosValid(p.id, $event)" />
              <fin-fijos-editor [rows]="fijosPorPlan()[p.id] ?? []"
                                (rowsChange)="onFijosChange(p.id, $event)" />
            }
          }
        </div>
      } @else if (stepKey() === 'revisar') {
        <div class="step">
          <p class="muted">Revisá las prestaciones agrupadas por plan y elegí cuáles incluir. Podés excluir prestaciones enteras, análisis individuales, o usar la selección múltiple para excluir/incluir en lote; los montos se recalculan solos.</p>

          @if (previewLoading() && !preview()) {
            <div class="liq-loading liq-loading--full">
              <i class="pi pi-spin pi-spinner"></i>
              <span>Buscando prestaciones pendientes…</span>
            </div>
          } @else if (preview(); as pv) {
            @if (previewLoading()) {
              <div class="liq-recalc"><i class="pi pi-spin pi-spinner"></i> Recalculando montos…</div>
            }
            @if (pv.previewWarning) {
              <div class="liq-warn"><i class="pi pi-exclamation-triangle"></i> {{ pv.previewWarning }}</div>
            }

            <div class="liq-summary">
              <div class="liq-summary__os">
                <span class="liq-summary__name">{{ os()?.name }}</span>
                <span class="liq-summary__period">{{ from() | date:'dd/MM/yyyy' }} – {{ to() | date:'dd/MM/yyyy' }}</span>
                <span class="liq-summary__count">{{ incluidas() }} de {{ totalPrestaciones() }} prestaciones incluidas</span>
              </div>
              <div class="liq-summary__totals">
                <div class="liq-summary__row"><span>Neto</span><span data-testid="preview-net">{{ pv.netAmount | currencyAr }}</span></div>
                <div class="liq-summary__row"><span>IVA</span><span data-testid="preview-iva">{{ pv.ivaAmount | currencyAr }}</span></div>
                <div class="liq-summary__row liq-summary__row--gross"><span>Total con IVA</span><span data-testid="preview-gross">{{ pv.grossAmount | currencyAr }}</span></div>
              </div>
            </div>

            @if (!totalPrestaciones()) {
              <div class="liq-empty"><i class="pi pi-info-circle"></i><span>No hay prestaciones pendientes para esa obra social y período. No se puede generar la liquidación.</span></div>
            } @else {
              @if (pv.groups.length > 1) {
                <div class="liq-tabs" role="tablist" data-testid="plan-tabs">
                  <button type="button" class="liq-tab" [class.liq-tab--active]="activePlanTab() === null"
                          (click)="activePlanTab.set(null)" data-testid="tab-todos">Todos</button>
                  @for (g of pv.groups; track g.planId) {
                    <button type="button" class="liq-tab" [class.liq-tab--active]="activePlanTab() === g.planId"
                            (click)="activePlanTab.set(g.planId)" [attr.data-testid]="'tab-' + g.planId">{{ g.planName }}</button>
                  }
                </div>
              }

              <ui-filter-bar [config]="reviewFilterConfig" (valueChange)="onReviewSearch($event)" />

              @if (activePlanTab() === null && plansWithoutPrestaciones().length) {
                @for (p of plansWithoutPrestaciones(); track p.id) {
                  <div class="liq-empty liq-empty--plan" [attr.data-testid]="'sin-prestaciones-' + p.id">
                    <i class="pi pi-info-circle"></i>
                    <span><strong>{{ p.name }}</strong> — No se encontraron prestaciones para este plan en el período.</span>
                  </div>
                }
              }

              @if (!visibleGroups().length) {
                <div class="liq-empty" data-testid="sin-resultados-busqueda">
                  <i class="pi pi-search"></i><span>No hay prestaciones que coincidan con la búsqueda.</span>
                </div>
              }
              @for (g of visibleGroups(); track g.planId) {
                <div class="liq-group" [attr.data-testid]="'group-' + g.planId">
                  <div class="liq-group__head">
                    <div class="liq-group__title">
                      <span class="liq-group__name">{{ g.planName }}</span>
                      <span class="liq-group__iva">{{ g.ivaPercentage > 0 ? ('IVA ' + g.ivaPercentage + '%') : 'IVA exento' }}</span>
                    </div>
                    <div class="liq-group__totals">
                      <span>Neto {{ g.netAmount | currencyAr }}</span>
                      <span>IVA {{ g.ivaAmount | currencyAr }}</span>
                      <span class="liq-group__gross">Bruto {{ g.grossAmount | currencyAr }}</span>
                    </div>
                  </div>

                  <div class="liq-bulk" [attr.data-testid]="'bulk-' + g.planId">
                    <span class="liq-bulk__count">{{ incluidasEnItems(g.items) }} de {{ g.items.length }} incluidas</span>
                    <div class="liq-bulk__actions">
                      <button type="button" class="liq-bulk__btn liq-bulk__btn--ok"
                              data-testid="bulk-incluir" (click)="incluirTodasGrupo(g)">
                        <i class="pi pi-check-circle"></i> Incluir todas
                      </button>
                      <button type="button" class="liq-bulk__btn liq-bulk__btn--danger"
                              data-testid="bulk-excluir" (click)="excluirTodasGrupo(g)">
                        <i class="pi pi-times-circle"></i> Excluir todas
                      </button>
                    </div>
                  </div>

                  <ui-table
                    [value]="g.items"
                    [columns]="itemColumns()"
                    dataKey="providedServiceId"
                    [selectable]="true"
                    [selection]="selectionFor(g)"
                    (selectionChange)="onGroupSelectionChange(g, $any($event))"
                    [expandable]="true"
                    [paginator]="true"
                    [rows]="rowsPerPage"
                    [rowsPerPageOptions]="[10, 20, 50, 100]"
                    scrollHeight="46vh"
                    entityLabel="prestaciones"
                    emptyHeading="Sin prestaciones en este plan"
                    emptyIcon="pi-inbox">

                    <ng-template uiCell="patientName" let-it>
                      <div class="liq-cell-patient" [class.liq-cell--excluded]="it.fullyExcluded">
                        <span class="liq-cell-patient__name">{{ it.patientName }}</span>
                        <span class="liq-cell-patient__meta">DNI {{ it.patientDni ?? '—' }}@if (it.protocolNumber) { · Prot. {{ it.protocolNumber }}} · {{ it.analyses.length }} análisis</span>
                      </div>
                    </ng-template>

                    <ng-template uiCell="serviceDate" let-it>
                      {{ it.serviceDate | date:'dd/MM/yy' }}
                    </ng-template>

                    <ng-template uiCell="copaymentAmount" let-it>
                      {{ it.copaymentAmount | currencyAr }}
                    </ng-template>

                    <ng-template uiCell="coveredAmount" let-it>
                      <span class="liq-cell-covered" [class.liq-cell--excluded]="it.fullyExcluded">{{ it.coveredAmount | currencyAr }}</span>
                    </ng-template>

                    <ng-template uiCell="appliedUbValue" let-it>
                      {{ it.appliedUbValue != null ? (it.appliedUbValue | currencyAr) : '—' }}
                    </ng-template>

                    <ng-template uiRowExpansion let-it>
                      <div class="liq-analyses">
                        @for (a of it.analyses; track a.analysisId) {
                          <label class="liq-analysis"
                                 [class.liq-analysis--excluded]="a.excluded"
                                 [class.liq-analysis--unauth]="!a.authorized">
                            <input type="checkbox" [checked]="!a.excluded" [disabled]="!a.authorized"
                                   (change)="toggleAnalysis(it.providedServiceId, a.analysisId)"
                                   [attr.aria-label]="'Incluir análisis ' + a.name" />
                            <span class="liq-analysis__code">{{ a.code }}</span>
                            <span class="liq-analysis__name">
                              {{ a.name }}
                              @if (!a.authorized) {
                                <span class="liq-tag-unauth">No cubierto por OS</span>
                              }
                            </span>
                            <span class="liq-analysis__detail" [class.liq-analysis__detail--fixed]="a.fixedAmount != null">
                              {{ analysisLabel(a) }}
                            </span>
                          </label>
                        }
                      </div>
                    </ng-template>
                  </ui-table>
                </div>
              }
            }
          }
        </div>
      } @else {
        <div class="step">
          <p class="muted">Revisá el resumen antes de generar la liquidación.</p>

          <div class="liq-confirm">
            <div class="liq-confirm__row"><span class="liq-confirm__label">Obra Social</span><span class="liq-confirm__value">{{ os()?.name }}</span></div>
            <div class="liq-confirm__row"><span class="liq-confirm__label">Período</span><span class="liq-confirm__value">{{ from() | date:'dd/MM/yyyy' }} – {{ to() | date:'dd/MM/yyyy' }}</span></div>
            <div class="liq-confirm__row"><span class="liq-confirm__label">Planes</span><span class="liq-confirm__value">{{ selectedPlanNames() }}</span></div>
            <div class="liq-confirm__row"><span class="liq-confirm__label">Prestaciones</span><span class="liq-confirm__value">{{ incluidas() }} incluidas · {{ excluidasCount() }} excluidas</span></div>
          </div>

          @if (preview(); as pv) {
            <div class="liq-confirm__plans">
              <span class="liq-confirm__plans-title">Prestaciones por plan</span>
              @for (g of pv.groups; track g.planId) {
                <div class="liq-confirm__plan-row">
                  <span class="liq-confirm__plan-name">{{ g.planName }}</span>
                  <span class="liq-confirm__plan-count">{{ incluidasEnGrupo(g.planId) }} de {{ g.items.length }} prestaciones</span>
                  <span class="liq-confirm__plan-amount">{{ g.netAmount | currencyAr }}</span>
                </div>
              }
            </div>

            <div class="liq-summary liq-summary--confirm">
              <div class="liq-summary__os">
                <span class="liq-summary__count">{{ incluidas() }} de {{ totalPrestaciones() }} prestaciones incluidas</span>
              </div>
              <div class="liq-summary__totals">
                <div class="liq-summary__row"><span>Neto</span><span data-testid="confirm-net">{{ pv.netAmount | currencyAr }}</span></div>
                <div class="liq-summary__row"><span>IVA</span><span data-testid="confirm-iva">{{ pv.ivaAmount | currencyAr }}</span></div>
                <div class="liq-summary__row liq-summary__row--gross"><span>Total con IVA</span><span data-testid="confirm-gross">{{ pv.grossAmount | currencyAr }}</span></div>
              </div>
            </div>
          }
        </div>
      }
    </ui-wizard-shell>
  `,
  styles: [`
    .step { display: flex; flex-direction: column; gap: 16px; }
    .muted { color: var(--ds-text-muted, #64748b); font-size: 13px; margin: 0; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .form-field label { font-size: 13px; font-weight: 500; color: var(--ds-text, #1a1a2e); }
    .form-field p-datepicker { display: block; width: 100%; }
    /* flex (no block): PrimeNG usa flex interno; block recorta el label del select a ~1 carácter. */
    .form-field p-select, .form-field p-multiselect { display: flex; width: 100%; }
    .form-row { display: flex; gap: 14px; }
    .form-row .form-field { flex: 1; min-width: 0; }
    :host ::ng-deep .form-field .p-datepicker { width: 100%; }
    :host ::ng-deep .form-field .p-datepicker .p-inputtext { width: 100%; }
    /* display:flex (no block): block rompe el flex interno de PrimeNG y el label se recorta a ~1 carácter. */
    :host ::ng-deep .form-field .p-select { display: flex; width: 100%; }
    :host ::ng-deep .form-field .p-multiselect { display: flex; width: 100%; }
    :host ::ng-deep .form-field .p-select .p-select-label { flex: 1 1 auto; min-width: 0; text-overflow: ellipsis; }
    .field-error { color: #d83a3a; font-size: 12.5px; }
    .tipo-sel { display: flex; gap: 20px; }
    .tipo-sel label { display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 400;
                       color: var(--ds-text, #1a1a2e); cursor: pointer; }
    .tipo-sel input[type="radio"] { accent-color: #0f8a55; cursor: pointer; }

    .liq-warn { display: flex; align-items: center; gap: 8px; background: #fcf1dd; color: #b5740c; padding: 10px 14px; border-radius: 9px; font-size: 13px; }
    .liq-summary { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; padding: 14px 16px; background: #f8fafc; border: 1px solid #e8edf3; border-radius: 10px; }
    .liq-summary--confirm { margin-top: 4px; }
    .liq-summary__os { display: flex; flex-direction: column; gap: 2px; }
    .liq-summary__name { font-weight: 600; font-size: 15px; }
    .liq-summary__period { font-size: 12.5px; color: #64748b; }
    .liq-summary__count { font-size: 12px; color: #7c8092; }
    .liq-summary__totals { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; min-width: 180px; }
    .liq-summary__row { display: flex; justify-content: space-between; gap: 18px; width: 100%; font-size: 13px; color: #4a4d63; }
    .liq-summary__row span:last-child { font-variant-numeric: tabular-nums; }
    .liq-summary__row--gross { font-weight: 700; font-size: 16px; color: #0f6b44; padding-top: 3px; border-top: 1px solid #e2e8f0; margin-top: 2px; }

    .liq-confirm { display: flex; flex-direction: column; gap: 0; border: 1px solid #e8edf3; border-radius: 10px; overflow: hidden; }
    .liq-confirm__row { display: flex; justify-content: space-between; gap: 16px; padding: 11px 16px; font-size: 13.5px; }
    .liq-confirm__row + .liq-confirm__row { border-top: 1px solid #eef2f7; }
    .liq-confirm__label { color: #7c8092; }
    .liq-confirm__value { font-weight: 600; color: #22243a; text-align: right; }
    .liq-confirm__plans { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; background: #f8fafc; border: 1px solid #e8edf3; border-radius: 10px; }
    .liq-confirm__plans-title { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: #7c8092; font-weight: 700; }
    .liq-confirm__plan-row { display: grid; grid-template-columns: 1fr auto auto; gap: 14px; align-items: center; font-size: 13px; }
    .liq-confirm__plan-name { font-weight: 600; }
    .liq-confirm__plan-count { color: #64748b; font-size: 12.5px; }
    .liq-confirm__plan-amount { font-weight: 600; font-variant-numeric: tabular-nums; }

    .liq-empty { display: flex; align-items: center; gap: 8px; background: #fcf1dd; color: #b5740c; padding: 12px 14px; border-radius: 9px; font-size: 13.5px; }
    /* Aviso discreto por plan sin prestaciones en el período (paso Revisar, Item 3 KAN-237). */
    .liq-empty--plan { margin-bottom: 2px; }
    /* Control "Copiar tramos de otro plan" (paso Tramos, Item 2 KAN-237). */
    .liq-tramos-copy { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    .liq-tramos-copy label { font-size: 12.5px; font-weight: 500; color: var(--ds-text-muted, #64748b); white-space: nowrap; }
    .liq-tramos-copy p-select { display: flex; min-width: 220px; }
    .liq-loading { color: #7c8092; font-size: 13.5px; display: flex; align-items: center; gap: 8px; padding: 12px; }
    /* Loading grande centrado mientras se buscan las prestaciones (antes de renderizar el paso). */
    .liq-loading--full { flex-direction: column; justify-content: center; align-items: center; gap: 12px;
                         min-height: 260px; color: #64748b; font-size: 14px; }
    .liq-loading--full .pi-spinner { font-size: 30px; color: #0f8a55; }
    /* Indicador sutil de recálculo (los datos ya están; se están recalculando montos). */
    .liq-recalc { display: inline-flex; align-items: center; gap: 8px; align-self: flex-start;
                  background: #eef4ff; color: #26457a; border: 1px solid #d3e0fb; border-radius: 20px;
                  padding: 4px 12px; font-size: 12.5px; }

    .liq-group { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
    .liq-group__head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .liq-group__title { display: flex; align-items: baseline; gap: 10px; }
    .liq-group__name { font-weight: 600; font-size: 14.5px; }
    .liq-group__iva { font-size: 12px; color: #64748b; background: #eef2f7; padding: 2px 8px; border-radius: 20px; }
    .liq-group__totals { display: flex; gap: 14px; font-size: 12.5px; color: #64748b; }
    .liq-group__gross { font-weight: 700; color: #0f6b44; }

    /* Lista de convenios de los planes tildados (paso Datos). */
    .liq-plans-detail { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px;
                        background: #f8fafc; border: 1px solid #e8edf3; border-radius: 10px; }
    .liq-plans-detail__title { font-size: 11px; text-transform: uppercase; letter-spacing: .05em;
                               color: #7c8092; font-weight: 700; margin-bottom: 2px; }
    .liq-plan-conv { display: flex; align-items: center; gap: 12px; padding: 5px 8px; border-radius: 7px; font-size: 13px; }
    .liq-plan-conv + .liq-plan-conv { border-top: 1px solid #eef2f7; }
    .liq-plan-conv__name { font-weight: 600; flex: 1; min-width: 0; }
    .liq-plan-conv__arancel { color: #4a4d63; font-variant-numeric: tabular-nums; }
    .liq-plan-conv__iva { font-size: 12px; color: #64748b; background: #eef2f7; padding: 2px 8px; border-radius: 20px; }
    .liq-plan-conv--noagr { background: #fdecea; }
    .liq-plan-conv--noagr .liq-plan-conv__name { color: #c0392b; }
    .liq-plan-conv__warn { display: inline-flex; align-items: center; gap: 5px; color: #c0392b;
                           font-size: 12px; font-weight: 600; }

    /* Tabs por plan (paso Revisar). */
    .liq-tabs { display: flex; gap: 4px; flex-wrap: wrap; border-bottom: 1px solid #e8edf3; padding-bottom: 2px; }
    .liq-tab { padding: 7px 14px; border: none; background: transparent; color: #64748b; font-size: 13px;
               font-weight: 500; cursor: pointer; border-radius: 7px 7px 0 0; border-bottom: 2px solid transparent;
               margin-bottom: -2px; }
    .liq-tab:hover { color: #1a1a2e; background: #f4f7fb; }
    .liq-tab--active { color: #0f6b44; border-bottom-color: #0f8a55; font-weight: 600; }

    /* Barra de acción masiva (aparece cuando hay prestaciones tildadas en el grupo). */
    .liq-bulk { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
                padding: 8px 12px; background: #eef4ff; border: 1px solid #d3e0fb; border-radius: 9px; }
    .liq-bulk__count { font-size: 12.5px; font-weight: 600; color: #26457a; }
    .liq-bulk__actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .liq-bulk__btn { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 7px;
                     border: 1px solid #cbd6ea; background: #fff; color: #4a4d63; font-size: 12.5px; cursor: pointer; }
    .liq-bulk__btn:hover { background: #f4f7fb; }
    .liq-bulk__btn--danger { color: #c0392b; border-color: #f0c4bd; }
    .liq-bulk__btn--danger:hover { background: #fdecea; }
    .liq-bulk__btn--ok { color: #0f6b44; border-color: #c2e3d1; }
    .liq-bulk__btn--ok:hover { background: #eefaf2; }

    .liq-check { width: 17px; height: 17px; cursor: pointer; accent-color: #0f8a55; }
    .liq-cell-patient { display: flex; flex-direction: column; gap: 1px; }
    .liq-cell-patient__name { font-weight: 600; font-size: 13px; }
    .liq-cell-patient__meta { font-size: 11.5px; color: #7c8092; }
    .liq-cell-covered { font-weight: 600; }
    .liq-cell--excluded { opacity: .55; text-decoration: line-through; }

    .liq-analyses { display: flex; flex-direction: column; }
    .liq-analysis { display: grid; grid-template-columns: 22px 70px 1fr auto; align-items: center; gap: 10px; padding: 7px 4px; font-size: 12.5px; cursor: pointer; }
    .liq-analysis + .liq-analysis { border-top: 1px solid #eef2f7; }
    .liq-analysis input { accent-color: #0f8a55; }
    .liq-analysis--excluded { color: #94a3b8; }
    .liq-analysis--excluded .liq-analysis__detail { text-decoration: line-through; }
    .liq-analysis--unauth { color: #94a3b8; cursor: not-allowed; }
    .liq-analysis__code { font-family: 'Roboto Mono', monospace; color: #64748b; }
    .liq-analysis__name { display: flex; align-items: center; gap: 8px; }
    .liq-analysis__detail { font-weight: 500; white-space: nowrap; }
    .liq-analysis__detail--fixed { color: #0f8a55; }
    .liq-tag-unauth { font-size: 10.5px; background: #fbeaea; color: #b5740c; padding: 1px 7px; border-radius: 20px; white-space: nowrap; }
  `],
})
export class GenerarLiquidacionPage implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly actions$ = inject(Actions);
  private readonly destroy = inject(DestroyRef);

  /** Etiqueta del desglose por análisis (valor fijo o U.B. × valor). */
  protected readonly analysisLabel = analysisLabel;

  /** Steps dinámicos: ESPECIAL inserta el paso "Tramos por plan" entre Datos y Revisar. */
  protected readonly steps = computed<FormStep[]>(() => this.tipo() === 'ESPECIAL'
    ? [{ key: 'datos', title: 'Datos y tipo', subtitle: 'Obra social, período y tipo' },
       { key: 'tramos', title: 'Tramos por plan', subtitle: 'Valor U.B. por cantidad' },
       { key: 'revisar', title: 'Revisar', subtitle: 'Prestaciones a liquidar' },
       { key: 'confirmar', title: 'Confirmar', subtitle: 'Resumen y generación' }]
    : STEPS);
  /** Key del paso actual, para no keyear la navegación por índice fijo (el paso "tramos" corre los índices). */
  protected readonly stepKey = computed(() => this.steps()[this.step()]?.key);
  /** Tope de fecha: hoy — no se pueden liquidar períodos futuros. */
  protected readonly hoy = new Date();
  protected readonly step = signal(0);
  protected readonly visited = signal<ReadonlySet<number>>(new Set([0]));

  // form state
  os = signal<InsurerSummary | null>(null);
  protected readonly from = signal<Date | null>(null);
  protected readonly to = signal<Date | null>(null);
  /** Planes tildados de la OS (ids). Por defecto todos; se re-tildan al cambiar de OS. */
  protected readonly selectedPlanIds = signal<number[]>([]);
  /** SIMPLE (arancel del convenio) o ESPECIAL (tramos por plan, valor U.B. por cantidad). */
  protected readonly tipo = signal<'SIMPLE' | 'ESPECIAL'>('SIMPLE');
  /** Filas de tramos por plan: { planId: TramoRow[] }. */
  protected readonly tramosPorPlan = signal<Record<number, TramoRow[]>>({});
  /** Validez de tramos por plan: { planId: boolean }. */
  protected readonly tramosValidos = signal<Record<number, boolean>>({});
  /** Tab de plan activo en el paso Tramos. */
  protected readonly activeTramoPlan = signal<number | null>(null);
  /** Filas de valores fijos por análisis, por plan: { planId: FixedAmountRow[] }. Opcional, solo en ESPECIAL. */
  protected readonly fijosPorPlan = signal<Record<number, FixedAmountRow[]>>({});

  // ── Paso Revisar: tab de plan activo + búsqueda client-side ──
  /** Plan activo del tab en el paso Revisar; null = "Todos". */
  protected readonly activePlanTab = signal<number | null>(null);
  /** Texto de búsqueda del paso Revisar (filtra prestaciones visibles). */
  protected readonly reviewSearch = signal('');
  protected readonly reviewFilterConfig: FilterBarConfig = {
    searchPlaceholder: 'Buscar por paciente, DNI, N° de protocolo, N° de autorización o análisis…',
  };

  // selección de exclusiones { providedServiceId: [analysisId,...] }
  private readonly excluded = signal<ExcludedAnalysisIdsByPs>({});

  protected readonly rowsPerPage = 10;
  /** En ESPECIAL se agrega la columna del valor U.B. de tramo aplicado a cada prestación. */
  protected readonly itemColumns = computed<readonly TableColumn[]>(() => {
    const cols: TableColumn[] = [
      { field: 'patientName', header: 'Paciente' },
      { field: 'serviceDate', header: 'Fecha' },
      { field: 'copaymentAmount', header: 'Copago', align: 'right' },
      { field: 'coveredAmount', header: 'Cubierto', align: 'right' },
    ];
    if (this.tipo() === 'ESPECIAL') cols.push({ field: 'appliedUbValue', header: 'Valor U.B.', align: 'right' });
    return cols;
  });

  protected readonly insurers = this.store.selectSignal(selectLiqInsurers);
  protected readonly insurerPlans = this.store.selectSignal(selectLiqInsurerPlans);
  protected readonly generating = this.store.selectSignal(selectLiqGenerating);
  protected readonly preview = this.store.selectSignal(selectLiqPreviewDetail);
  protected readonly previewLoading = this.store.selectSignal(selectLiqPreviewLoading);

  protected readonly rangoInvalido = computed(() => {
    const f = this.from(); const t = this.to();
    return !!f && !!t && f.getTime() > t.getTime();
  });
  /** Planes tildados, resueltos a su detalle (nombre + arancel + convenio). */
  protected readonly selectedPlans = computed(() => {
    const ids = new Set(this.selectedPlanIds());
    return this.insurerPlans().filter(p => ids.has(p.id));
  });
  /** true si hay planes tildados y NINGUNO tiene convenio vigente → no se puede liquidar. */
  protected readonly noPlanConvenio = computed(() => {
    const sel = this.selectedPlans();
    return sel.length > 0 && sel.every(p => !p.hasActiveAgreement);
  });

  protected readonly paso1Valido = computed(() =>
    !!this.os() && !!this.from() && !!this.to() && !this.rangoInvalido()
    && this.selectedPlanIds().length > 0 && !this.noPlanConvenio());

  /**
   * En ESPECIAL, todos los planes tildados deben tener sus tramos completos y válidos,
   * y si tienen filas de valores fijos cargadas, esas filas también deben ser válidas
   * (análisis elegido, monto > 0, sin repetidos).
   */
  protected readonly tramosTodosValidos = computed(() => {
    if (this.tipo() !== 'ESPECIAL') return true;
    const v = this.tramosValidos();
    const fijos = this.fijosPorPlan();
    return this.selectedPlans().every(p =>
      v[p.id] === true && validateFijos(fijos[p.id] ?? []) === null);
  });

  /**
   * Planes tildados SIN prestaciones pendientes en el período (KAN-237, Item 3): el
   * backend solo devuelve grupo para los planes con al menos una prestación, así que
   * un plan tildado que no aparece en `pv.groups` (o aparece con `items` vacío) quedaba
   * mudo en el paso Revisar. Se resuelve mostrando un aviso explícito por plan.
   */
  protected readonly plansWithoutPrestaciones = computed(() => {
    const pv = this.preview();
    if (!pv) return [];
    const withData = new Set(pv.groups.filter(g => g.items.length > 0).map(g => g.planId));
    return this.selectedPlans().filter(p => !withData.has(p.id));
  });

  /** Todas las prestaciones de todos los grupos, aplanadas. */
  private readonly allItems = computed(() =>
    (this.preview()?.groups ?? []).flatMap(g => g.items));
  protected readonly totalPrestaciones = computed(() => this.allItems().length);
  protected readonly incluidas = computed(() =>
    this.allItems().filter(i => !i.fullyExcluded).length);
  protected readonly excluidasCount = computed(() => this.totalPrestaciones() - this.incluidas());
  protected readonly canGenerate = computed(() => this.incluidas() > 0);

  /** Botón "Continuar": por paso — Datos exige form válido, Tramos exige tramos completos, Revisar exige ≥1 incluida. */
  protected readonly continueDisabled = computed(() => {
    const k = this.stepKey();
    if (k === 'datos') return !this.paso1Valido();
    if (k === 'tramos') return !this.tramosTodosValidos();
    if (k === 'revisar') return !this.canGenerate();
    return false;
  });

  /** Nombres de los planes elegidos, para el resumen del paso Confirmar. */
  protected readonly selectedPlanNames = computed(() => {
    const ids = new Set(this.selectedPlanIds());
    const names = this.insurerPlans().filter(p => ids.has(p.id)).map(p => p.name);
    return names.length ? names.join(', ') : '—';
  });

  /**
   * Grupos visibles en el paso Revisar según el tab de plan activo y la búsqueda.
   * - tab null = todos los grupos; tab con planId = solo ese grupo.
   * - búsqueda: filtra las prestaciones (por paciente/DNI/N° auth/análisis) dentro de
   *   los grupos visibles; los grupos que quedan sin prestaciones se ocultan.
   * Se mantienen los objetos de grupo (con items filtrados) para que selección/bulk/
   * paginado operen sobre lo visible.
   */
  protected readonly visibleGroups = computed<PreviewGroup[]>(() => {
    const pv = this.preview();
    if (!pv) return [];
    const tab = this.activePlanTab();
    const q = norm(this.reviewSearch().trim());
    let groups = tab === null ? pv.groups : pv.groups.filter(g => g.planId === tab);
    if (!q) return [...groups];
    return groups
      .map(g => ({ ...g, items: g.items.filter(it => this.matchesSearch(it, q)) }))
      .filter(g => g.items.length > 0);
  });

  constructor() {
    // Al (re)cargar los planes de la OS elegida, tildar todos por defecto.
    effect(() => {
      const plans = this.insurerPlans();
      this.selectedPlanIds.set(plans.map(p => p.id));
    });
  }

  /**
   * ¿La prestación matchea la búsqueda? Cubre paciente, DNI, N° de autorización, N° de protocolo y
   * nombre/código de análisis. `q` viene ya normalizado (minúsculas, sin acentos).
   */
  private matchesSearch(it: PreviewItem, q: string): boolean {
    if (!q) return true;
    if (norm(it.patientName).includes(q)) return true;
    if (norm(it.patientDni).includes(q)) return true;
    if (norm(it.authorizationNumber).includes(q)) return true;
    if (norm(it.protocolNumber).includes(q)) return true;
    return it.analyses.some(a => norm(a.name).includes(q) || norm(a.code).includes(q));
  }

  protected onReviewSearch(value: FilterBarValue): void {
    this.reviewSearch.set(value.search ?? '');
  }

  /** Incluidas dentro de un conjunto de items (para la barra bulk sobre items filtrados). */
  protected incluidasEnItems(items: readonly PreviewItem[]): number {
    return items.filter(i => !i.fullyExcluded).length;
  }

  ngOnInit(): void {
    this.store.dispatch(loadInsurersIndex());
    this.actions$.pipe(ofType(generateSettlementSuccess), takeUntilDestroyed(this.destroy))
      // Post-generar: volvemos al listado (la nueva liquidación aparece arriba); el toast
      // de éxito ya lo emite el effect.
      .subscribe(() => this.router.navigate(['/financiero/liquidaciones']));
  }

  ngOnDestroy(): void {
    this.store.dispatch(resetPreviewDetail());
  }

  protected onOsChange(insurer: InsurerSummary | null): void {
    this.os.set(insurer);
    this.selectedPlanIds.set([]);
    if (insurer) this.store.dispatch(loadInsurerPlans({ insurerId: insurer.id }));
  }

  /** Cambia SIMPLE/ESPECIAL; al pasar a ESPECIAL, asegura el tramo inicial de cada plan tildado. */
  protected setTipo(t: 'SIMPLE' | 'ESPECIAL'): void {
    this.tipo.set(t);
    if (t === 'ESPECIAL') this.ensureTramoDefaults();
  }

  /**
   * Garantiza que cada plan tildado tenga al menos un tramo (`desde: 1, hasta: null,
   * valorUb: null` = "en adelante") apenas se entra al paso Tramos o se activa ESPECIAL
   * (KAN-237, Item 1) — antes el editor podía arrancar vacío. También arregla el tab
   * activo si quedó en `null` o apuntando a un plan que ya no está tildado.
   */
  private ensureTramoDefaults(): void {
    const cur = this.tramosPorPlan();
    const next = { ...cur };
    let changed = false;
    for (const p of this.selectedPlans()) {
      if (!next[p.id]?.length) {
        next[p.id] = [{ desde: 1, hasta: null, valorUb: null }];
        changed = true;
      }
    }
    if (changed) this.tramosPorPlan.set(next);

    const ids = this.selectedPlans().map(p => p.id);
    const active = this.activeTramoPlan();
    if (active == null || !ids.includes(active)) this.activeTramoPlan.set(ids[0] ?? null);
  }

  protected onTramosChange(planId: number, rows: TramoRow[]): void {
    this.tramosPorPlan.update(m => ({ ...m, [planId]: rows }));
  }

  protected onTramosValid(planId: number, valid: boolean): void {
    this.tramosValidos.update(m => ({ ...m, [planId]: valid }));
  }

  protected onFijosChange(planId: number, rows: FixedAmountRow[]): void {
    this.fijosPorPlan.update(m => ({ ...m, [planId]: rows }));
  }

  /** Otros planes tildados que ya tienen tramos cargados — fuentes válidas para "Copiar tramos de…". */
  protected tramoCopySources(planId: number): Array<{ id: number; name: string }> {
    const tp = this.tramosPorPlan();
    return this.selectedPlans()
      .filter(p => p.id !== planId && (tp[p.id]?.length ?? 0) > 0)
      .map(p => ({ id: p.id, name: p.name }));
  }

  /**
   * Copia SOLO los tramos del plan `sourcePlanId` al plan `targetPlanId`, reemplazando
   * los que tuviera (KAN-237, Item 2). Deep copy — no comparte referencias entre planes.
   * NO copia los valores fijos: son montos por análisis que inciden en la facturación y
   * el control dice explícitamente "tramos", así que un swap de fijos sería inesperado.
   */
  protected onCopyTramos(targetPlanId: number, sourcePlanId: number | null): void {
    if (sourcePlanId == null) return;
    const sourceTramos = this.tramosPorPlan()[sourcePlanId];
    if (!sourceTramos?.length) return;
    this.tramosPorPlan.update(m => ({ ...m, [targetPlanId]: copyTramosFrom(sourceTramos) }));
  }

  protected toggleAnalysis(psId: number, analysisId: number): void {
    const cur = { ...this.excluded() };
    const set = new Set(cur[psId] ?? []);
    set.has(analysisId) ? set.delete(analysisId) : set.add(analysisId);
    if (set.size) cur[psId] = [...set]; else delete cur[psId];
    this.excluded.set(cur);
    this.reloadPreview();
  }

  // ── Inclusión por checkbox (paso Revisar) ─────────────────────────────────
  // El checkbox de cada fila = "incluida". La selección de la tabla ES el conjunto de incluidas;
  // el header "seleccionar todo" incluye/excluye la página. Un solo checkbox por fila (sin duplicar).

  /** Prestaciones incluidas del grupo = las que NO están totalmente excluidas. */
  protected selectionFor(group: PreviewGroup): readonly PreviewItem[] {
    return group.items.filter(i => !i.fullyExcluded);
  }

  /** Cambió el tildado: las que salieron de la selección se excluyen; las que entraron se incluyen. */
  protected onGroupSelectionChange(group: PreviewGroup, rows: PreviewItem[]): void {
    const nowIncluded = new Set((rows ?? []).map(r => r.providedServiceId));
    const cur = { ...this.excluded() };
    let changed = false;
    for (const it of group.items) {
      const wasIncluded = !it.fullyExcluded;
      const isIncluded = nowIncluded.has(it.providedServiceId);
      if (wasIncluded && !isIncluded) {
        cur[it.providedServiceId] = it.analyses.map(a => a.analysisId); // excluir toda la prestación
        changed = true;
      } else if (!wasIncluded && isIncluded) {
        delete cur[it.providedServiceId];                               // incluir toda la prestación
        changed = true;
      }
    }
    if (changed) { this.excluded.set(cur); this.reloadPreview(); }
  }

  /** Incluir todas las prestaciones del plan (quita sus exclusiones). */
  protected incluirTodasGrupo(group: PreviewGroup): void {
    const cur = { ...this.excluded() };
    for (const it of group.items) delete cur[it.providedServiceId];
    this.excluded.set(cur);
    this.reloadPreview();
  }

  /** Excluir todas las prestaciones del plan (todas sus análisis). */
  protected excluirTodasGrupo(group: PreviewGroup): void {
    const cur = { ...this.excluded() };
    for (const it of group.items) cur[it.providedServiceId] = it.analyses.map(a => a.analysisId);
    this.excluded.set(cur);
    this.reloadPreview();
  }

  /** Prestaciones incluidas en un grupo (para el resumen del paso Confirmar). */
  protected incluidasEnGrupo(planId: number): number {
    const g = this.preview()?.groups.find(gr => gr.planId === planId);
    return g ? g.items.filter(i => !i.fullyExcluded).length : 0;
  }

  private reloadPreview(): void {
    const insurer = this.os();
    if (!insurer) return;
    const excl = this.excluded();
    this.store.dispatch(loadPreviewDetail({
      body: {
        insurerId: insurer.id,
        period: { from: toIso(this.from()), to: toIso(this.to()) },
        excludedAnalysisIdsByPs: Object.keys(excl).length ? excl : null,
        planIds: this.selectedPlanIds(),
        specialRulesByPlan: this.buildRulesByPlan(),
        fixedAmountsByPlan: this.buildFixedByPlan(),
      },
    }));
  }

  /** Reglas especiales por plan para el body de preview/generate; null fuera de ESPECIAL. */
  private buildRulesByPlan(): Record<number, SpecialRule[]> | null {
    if (this.tipo() !== 'ESPECIAL') return null;
    const out: Record<number, SpecialRule[]> = {};
    for (const p of this.selectedPlans()) out[p.id] = tramosToRules(this.tramosPorPlan()[p.id] ?? []);
    return out;
  }

  /**
   * Valores fijos por plan para el body de preview/generate: solo incluye planes con
   * al menos una fila válida cargada. null si no hay ninguno (o fuera de ESPECIAL).
   */
  private buildFixedByPlan(): FixedAmountsByPlan | null {
    if (this.tipo() !== 'ESPECIAL') return null;
    const out: FixedAmountsByPlan = {};
    for (const p of this.selectedPlans()) {
      const map = fijosToMap(this.fijosPorPlan()[p.id] ?? []);
      if (Object.keys(map).length) out[p.id] = map;
    }
    return Object.keys(out).length ? out : null;
  }

  /**
   * Navega al paso siguiente keyeando por la KEY del paso actual (no por índice fijo):
   * el paso "tramos" solo existe en ESPECIAL, así que los índices se corren según el tipo.
   */
  protected next(): void {
    const k = this.stepKey();
    if (k === 'datos') {
      if (!this.paso1Valido()) return;
      this.goTo(this.step() + 1);
      if (this.stepKey() === 'tramos') this.ensureTramoDefaults();
      if (this.stepKey() === 'revisar') this.enterRevisar();
    } else if (k === 'tramos') {
      if (!this.tramosTodosValidos()) return;
      this.goTo(this.step() + 1);
      this.enterRevisar();
    } else if (k === 'revisar') {
      if (!this.canGenerate()) return;
      this.goTo(this.step() + 1);
    }
  }

  private goTo(i: number): void {
    this.step.set(i);
    this.visited.update(s => new Set(s).add(i));
  }

  /** Al entrar al paso Revisar (desde Datos en SIMPLE, o desde Tramos en ESPECIAL): reset de filtros + preview. */
  private enterRevisar(): void {
    this.excluded.set({});
    this.activePlanTab.set(null);
    this.reviewSearch.set('');
    this.reloadPreview();
  }

  protected back(): void {
    this.step.update(s => Math.max(0, s - 1));
  }

  /**
   * Click en el header del stepper (KAN-237, Item A): navega directo a un paso YA
   * VISITADO, sin tocar ningún otro estado (OS, tramos, fijos, exclusiones quedan
   * intactos — a diferencia de `next()`, que dispara side-effects como `enterRevisar()`
   * o `ensureTramoDefaults()`). El guard es cinturón-y-tiradores: `ui-form-stepper-header`
   * ya sólo emite `stepSelected` para pasos visitados (nunca hacia adelante a uno no
   * completado), igual que el resto de los wizards del repo (`goToStep` en paciente,
   * médico, empleado, obra social, agenda, sucursal).
   */
  protected goToStep(i: number): void {
    if (!this.visited().has(i)) return;
    this.step.set(i);
  }

  protected generar(): void {
    const insurer = this.os();
    if (!insurer || !this.canGenerate()) return;
    const excl = this.excluded();
    this.store.dispatch(generateSettlement({
      body: {
        insurerId: insurer.id,
        period: { from: toIso(this.from()), to: toIso(this.to()) },
        specialRulesByPlan: this.buildRulesByPlan(),
        excludedAnalysisIdsByPs: Object.keys(excl).length ? excl : null,
        planIds: this.selectedPlanIds(),
        fixedAmountsByPlan: this.buildFixedByPlan(),
      },
    }));
  }

  protected cancelar(): void {
    this.router.navigate(['/financiero/liquidaciones']);
  }
}
