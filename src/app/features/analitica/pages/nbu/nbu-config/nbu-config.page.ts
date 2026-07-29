import {
  ChangeDetectionStrategy, Component, computed, effect, inject, input, signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { AccordionModule } from 'primeng/accordion';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import {
  DeterminationCatalogItem, DeterminationOverride, NbuConfigApiService,
  PreparationTypeOption, QualitativeCategory, ReferenceValueItem, TenantAnalysisRow,
} from '../../../services/nbu-config-api.service';
import { CatalogRow } from '../../../models/nomenclador.model';
import { loadConfigResumen, loadNomenclador } from '../../../store/nomenclador/nomenclador.actions';
import { selectCatalogRows } from '../../../store/nomenclador/nomenclador.selectors';

interface GenderOption { label: string; value: 'MALE' | 'FEMALE' | null; }

type AnalyticalType = 'QUANTITATIVE' | 'QUALITATIVE' | 'SEMI_QUALITATIVE';

interface AnalyticalTypeOption { label: string; value: AnalyticalType; }

/**
 * Modelo de trabajo del form por determinación: tabla de valores de referencia (editable),
 * preparación estructurada (tipos + horas ayuno + observaciones), el override existente
 * intacto (para mergear al guardar), unidad read-only, y snapshots originales para diff.
 */
interface DetForm {
  detId: number;
  detName: string;
  /** Unidad de medida de la determinación (read-only, contexto). */
  unit: string | null;
  /** Override existente tal cual lo trajo el BE — base para mergear (fix pérdida de datos). */
  existingOverride: DeterminationOverride | null;
  refValues: FormArray;
  /** Snapshot serializado de los ref-values al cargar (para diff). */
  originalRefValues: string;
  /** Codes de PreparationType seleccionados. */
  prepTypes: Set<string>;
  /** Horas de ayuno (solo si AYUNO seleccionado). */
  fastingHours: number | null;
  /** Observaciones libres (→ preObservations del override). */
  observations: string;
  /** Snapshot serializado de la preparación al cargar (para diff). */
  originalPrep: string;
  /** Tipo analítico de la determinación (QUANTITATIVE / QUALITATIVE / SEMI_QUALITATIVE). */
  valueType: AnalyticalType;
  /** Categoría cualitativa seleccionada (solo si valueType != QUANTITATIVE). */
  qualitativeCategoryId: number | null;
}

/** Edad en años → meses para la API (soporta decimales para pediatría). */
function yearsToMonths(years: number | null): number | null {
  return years == null ? null : Math.round(years * 12);
}

/** Edad en meses (API) → años para la UI (redondeo). */
function monthsToYears(months: number | null): number | null {
  return months == null ? null : Math.round(months / 12);
}

/**
 * Pantalla de configuración por tenant de un análisis del Nomenclador NBU (KAN-258).
 *
 * Reemplaza al drawer `lab-nbu-config-drawer`: la configuración tenía demasiadas secciones
 * para el ancho de medio drawer, así que ahora vive en una pantalla propia a la que se
 * navega desde el catálogo (`/analitica/nbu/:catalogId/config`). Aprovecha el ancho completo:
 * General y Estado/contexto en dos columnas arriba, y Valores de referencia + preparación
 * a lo ancho abajo, con la tabla de cada determinación desplegada.
 *
 * El `catalogId` (analysis_catalog.id) llega por ruta (withComponentInputBinding). La lógica
 * de carga y guardado es idéntica a la del ex-drawer: services directos + signals locales
 * (no NgRx para el editor). El nombre/código NBU/familia del encabezado salen del catálogo
 * del store (se dispara `loadNomenclador()` para soportar navegación directa por URL).
 * Solo opera ADMINISTRADOR (gating BE + la acción "Configurar" se oculta a no-admin).
 */
@Component({
  selector: 'lab-nbu-config-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  imports: [
    FormsModule, ReactiveFormsModule, ButtonModule, InputTextModule, InputNumberModule,
    TextareaModule, SelectModule, AccordionModule, ToastModule, ToggleSwitchModule, CheckboxModule,
    PageHeaderComponent,
  ],
  template: `
    <div class="p-4 flex flex-col gap-4">
      <p-toast position="top-right" />

      <ui-page-header [heading]="headerLabel()" [subtitle]="headerSubtitle()">
        <p-button label="Volver" icon="pi pi-arrow-left" severity="secondary" [outlined]="true"
                  type="button" (onClick)="onCancel()" />
        <p-button label="Guardar cambios" icon="pi pi-check" severity="primary" type="button"
                  [disabled]="loading() || !!loadError() || saving()" [loading]="saving()"
                  (onClick)="onSave()" />
      </ui-page-header>

      @if (loading()) {
        <span class="text-sm text-[var(--ds-text-muted)] italic px-1">Cargando configuración…</span>
      } @else if (loadError()) {
        <div class="pat-form__card">
          <span class="text-sm text-[var(--ds-danger)]">{{ loadError() }}</span>
        </div>
      } @else {
        <!-- Fila superior: General + Estado/contexto en dos columnas (aprovecha el ancho) -->
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] items-start">
          <!-- General — código interno y nombre propio editables + tiempo estimado -->
          <section class="pat-form__card" [formGroup]="generalForm">
            <div class="pat-form__card-header"><span>General</span></div>
            <div class="pat-form__grid">
              <div class="pat-form__field">
                <label class="pat-form__label" for="nbu-short-code">
                  Código interno <span class="pat-form__req">*</span>
                </label>
                <input id="nbu-short-code" pInputText type="text" autocomplete="off"
                       class="pat-form__input" formControlName="shortCode"
                       placeholder="Ej: GLUC" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label" for="nbu-custom-name">Nombre propio</label>
                <input id="nbu-custom-name" pInputText type="text" autocomplete="off"
                       class="pat-form__input" formControlName="customName" />
              </div>
              <div class="pat-form__field" style="grid-column: 1 / -1;">
                <label class="pat-form__label" for="nbu-handling-time">Tiempo estimado de resultado</label>
                <div class="flex gap-2">
                  <p-inputnumber inputId="nbu-handling-time" formControlName="handlingTimeValue"
                                 [min]="1" [useGrouping]="false" inputStyleClass="pat-form__input w-24"
                                 placeholder="—" />
                  <p-select [options]="handlingTimeUnitOptions" optionLabel="label" optionValue="value"
                            formControlName="handlingTimeUnit" appendTo="body" styleClass="w-32"
                            placeholder="Unidad" [showClear]="true" />
                </div>
                <span class="text-xs text-[var(--ds-text-muted)]">Se muestra en el comprobante del paciente.</span>
              </div>
            </div>
          </section>

          <!-- Estado y contexto -->
          <section class="pat-form__card">
            <div class="pat-form__card-header"><span>Estado y contexto</span></div>
            <div class="flex flex-col gap-3">
              <div class="flex items-center gap-2">
                <p-toggleswitch [ngModel]="active()" [ngModelOptions]="{ standalone: true }"
                                (ngModelChange)="onToggleActive($event)" inputId="nbu-active" />
                <label for="nbu-active" class="pat-form__label" style="margin:0;">
                  {{ active() ? 'Análisis activo' : 'Análisis inactivo' }}
                </label>
              </div>
              <dl class="text-xs text-[var(--ds-text-muted)] flex flex-col gap-1 m-0">
                <div class="flex justify-between gap-2">
                  <dt>Código NBU</dt>
                  <dd class="font-mono text-[var(--ds-text)] m-0">{{ analysisRow()?.nbuCode ?? '—' }}</dd>
                </div>
                <div class="flex justify-between gap-2">
                  <dt>Familia</dt>
                  <dd class="text-[var(--ds-text)] m-0">{{ analysisRow()?.familyName ?? '—' }}</dd>
                </div>
              </dl>
            </div>
          </section>
        </div>

        <!-- Valores de referencia + preparación — por determinación, a lo ancho -->
        <section class="pat-form__card">
          <div class="pat-form__card-header"><span>Valores de referencia y preparación</span></div>
          @if (detForms.length === 0) {
            <span class="text-sm text-[var(--ds-text-muted)] px-1">Este análisis no tiene determinaciones.</span>
          } @else {
            <p-accordion [multiple]="true" [value]="defaultOpenPanels">
              @for (det of detForms; track det.detId) {
                <p-accordion-panel [value]="det.detId">
                  <p-accordion-header>{{ det.detName }}</p-accordion-header>
                  <p-accordion-content>
                    <div class="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] items-start pt-2">
                      <!-- Preparación del paciente + tipo de resultado -->
                      <div class="flex flex-col gap-3">
                        <div>
                          <span class="text-xs font-medium text-[var(--ds-text-muted)] block mb-1">Preparación del paciente</span>
                          <div class="flex flex-wrap gap-3">
                            @for (opt of prepTypeOptions(); track opt.code) {
                              <label class="flex items-center gap-1 text-xs">
                                <p-checkbox [binary]="true"
                                            [ngModel]="det.prepTypes.has(opt.code)"
                                            [ngModelOptions]="{ standalone: true }"
                                            (ngModelChange)="onPrepTypeToggle(det, opt.code, $event)" />
                                {{ opt.label }}
                              </label>
                            }
                          </div>
                          @if (det.prepTypes.has('AYUNO')) {
                            <div class="mt-2 flex items-center gap-2">
                              <label class="text-xs">Horas de ayuno</label>
                              <p-inputnumber [ngModel]="det.fastingHours" [ngModelOptions]="{ standalone: true }"
                                             (ngModelChange)="det.fastingHours = $event" [min]="1" [useGrouping]="false"
                                             inputStyleClass="pat-form__input w-20" />
                            </div>
                          }
                          <div class="mt-2">
                            <label class="text-xs block">Observaciones</label>
                            <textarea pTextarea rows="2" autocomplete="off" class="pat-form__input"
                                      [ngModel]="det.observations" [ngModelOptions]="{ standalone: true }"
                                      (ngModelChange)="det.observations = $event"></textarea>
                          </div>
                        </div>

                        <div>
                          <label class="text-xs font-medium text-[var(--ds-text-muted)] block mb-1">Tipo de resultado</label>
                          <p-select
                            [options]="analyticalTypeOptions"
                            optionLabel="label"
                            optionValue="value"
                            [ngModel]="det.valueType"
                            [ngModelOptions]="{ standalone: true }"
                            (ngModelChange)="onValueTypeChange(det, $event)"
                            appendTo="body"
                            styleClass="w-full" />
                        </div>
                      </div>

                      <!-- Tabla de valores de referencia -->
                      <div>
                        @if (det.valueType !== 'QUANTITATIVE') {
                          <!-- Editor cualitativo / semicuantitativo -->
                          <div>
                            <label class="text-xs font-medium text-[var(--ds-text-muted)] block mb-1">Categoría de valores</label>
                            <div class="flex gap-2 items-center">
                              <p-select
                                [options]="qualitativeCategoryOptions()"
                                optionLabel="label"
                                optionValue="value"
                                [ngModel]="det.qualitativeCategoryId"
                                [ngModelOptions]="{ standalone: true }"
                                (ngModelChange)="det.qualitativeCategoryId = $event"
                                appendTo="body"
                                styleClass="flex-1"
                                placeholder="Elegir categoría" />
                              <p-button
                                label="+ Nueva categoría"
                                severity="secondary"
                                [text]="true"
                                size="small"
                                type="button"
                                (onClick)="openNewCategoryForm(det)" />
                            </div>

                            @if (openCategoryFormDetId() === det.detId) {
                              <!-- Mini-form para crear una nueva categoría -->
                              <div class="mt-2 p-3 border border-[var(--ds-border)] rounded-lg bg-[var(--ds-surface,#f1f5f9)]">
                                <span class="text-xs font-medium block mb-2">Nueva categoría</span>
                                <div class="flex flex-col gap-2">
                                  <div class="pat-form__field">
                                    <label class="text-xs">Nombre</label>
                                    <input pInputText type="text" autocomplete="off" class="pat-form__input"
                                           [ngModel]="newCategoryName()" [ngModelOptions]="{ standalone: true }"
                                           (ngModelChange)="newCategoryName.set($event)" />
                                  </div>
                                  <div class="pat-form__field">
                                    <label class="text-xs">Valores (separados por coma)</label>
                                    <input pInputText type="text" autocomplete="off" class="pat-form__input"
                                           [ngModel]="newCategoryValues()" [ngModelOptions]="{ standalone: true }"
                                           (ngModelChange)="newCategoryValues.set($event)"
                                           placeholder="Ej: Positivo, Negativo, Trazas" />
                                  </div>
                                  <label class="flex items-center gap-1 text-xs">
                                    <p-checkbox [binary]="true"
                                                [ngModel]="newCategoryOrdinal()"
                                                [ngModelOptions]="{ standalone: true }"
                                                (ngModelChange)="newCategoryOrdinal.set($event)" />
                                    Ordinal (los valores tienen orden)
                                  </label>
                                  <div class="flex gap-2 mt-1">
                                    <p-button label="Crear" severity="primary" size="small" type="button"
                                              [loading]="creatingCategory()"
                                              (onClick)="createNewCategory(det)" />
                                    <p-button label="Cancelar" severity="secondary" [text]="true" size="small"
                                              type="button" (onClick)="closeNewCategoryForm()" />
                                  </div>
                                </div>
                              </div>
                            }

                            @if (selectedCategory(det); as cat) {
                              <!-- Tabla de valores cualitativos por fila (sexo + edad) -->
                              <div class="mt-3">
                                <div class="flex items-center justify-between mb-2">
                                  <span class="text-xs text-[var(--ds-text-muted)]">
                                    Unidad: {{ det.unit || '—' }}
                                  </span>
                                  <p-button label="Agregar fila" icon="pi pi-plus" severity="secondary"
                                            [text]="true" size="small" type="button"
                                            (onClick)="addRefValue(det)" />
                                </div>
                                @if (det.refValues.length === 0) {
                                  <span class="text-xs italic text-[var(--ds-text-muted)]">Sin valores de referencia propios.</span>
                                } @else {
                                  <div class="overflow-x-auto">
                                    <table class="w-full text-xs border-collapse">
                                      <thead>
                                        <tr class="text-[var(--ds-text-muted)] text-left">
                                          <th class="py-1 pr-2 font-medium">Sexo</th>
                                          <th class="py-1 pr-2 font-medium">Edad mín (años)</th>
                                          <th class="py-1 pr-2 font-medium">Edad máx (años)</th>
                                          <th class="py-1 pr-2 font-medium">
                                            {{ cat.ordinal ? 'Normal hasta' : 'Valor esperado' }}
                                          </th>
                                          <th class="py-1"></th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        @for (rvCtrl of det.refValues.controls; track $index) {
                                          <tr [formGroup]="$any(rvCtrl)">
                                            <td class="py-0.5 pr-2">
                                              <p-select [options]="genderOptions" optionLabel="label" optionValue="value"
                                                        formControlName="gender" appendTo="body" styleClass="w-28" />
                                            </td>
                                            <td class="py-0.5 pr-2"><p-inputnumber formControlName="ageMinYears" [useGrouping]="false" [min]="0" inputStyleClass="pat-form__input w-20" /></td>
                                            <td class="py-0.5 pr-2"><p-inputnumber formControlName="ageMaxYears" [useGrouping]="false" [min]="0" inputStyleClass="pat-form__input w-20" /></td>
                                            <td class="py-0.5 pr-2">
                                              <p-select
                                                [options]="cat.values"
                                                optionLabel="label"
                                                optionValue="id"
                                                formControlName="qualitativeValue"
                                                appendTo="body"
                                                styleClass="w-36"
                                                placeholder="Elegir valor" />
                                            </td>
                                            <td class="py-0.5">
                                              <p-button icon="pi pi-trash" severity="danger" [text]="true" size="small"
                                                        type="button" ariaLabel="Quitar fila"
                                                        (onClick)="removeRefValue(det, $index)" />
                                            </td>
                                          </tr>
                                        }
                                      </tbody>
                                    </table>
                                  </div>
                                }
                              </div>
                            }
                          </div>
                        } @else {
                          <!-- Editor cuantitativo (tabla original) -->
                          <div class="flex items-center justify-between mb-2">
                            <span class="text-xs text-[var(--ds-text-muted)]">
                              Unidad: {{ det.unit || '—' }}
                            </span>
                            <p-button label="Agregar fila" icon="pi pi-plus" severity="secondary"
                                      [text]="true" size="small" type="button"
                                      (onClick)="addRefValue(det)" />
                          </div>
                          @if (det.refValues.length === 0) {
                            <span class="text-xs italic text-[var(--ds-text-muted)]">Sin valores de referencia propios.</span>
                          } @else {
                            <div class="overflow-x-auto">
                              <table class="w-full text-xs border-collapse">
                                <thead>
                                  <tr class="text-[var(--ds-text-muted)] text-left">
                                    <th class="py-1 pr-2 font-medium">Mín</th>
                                    <th class="py-1 pr-2 font-medium">Máx</th>
                                    <th class="py-1 pr-2 font-medium">Crít. mín</th>
                                    <th class="py-1 pr-2 font-medium">Crít. máx</th>
                                    <th class="py-1 pr-2 font-medium">Sexo</th>
                                    <th class="py-1 pr-2 font-medium">Edad mín (años)</th>
                                    <th class="py-1 pr-2 font-medium">Edad máx (años)</th>
                                    <th class="py-1"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  @for (rvCtrl of det.refValues.controls; track $index) {
                                    <tr [formGroup]="$any(rvCtrl)"
                                        [class.nbu-rv-row--invalid]="isRowInvalid($any(rvCtrl))">
                                      <td class="py-0.5 pr-2"><p-inputnumber formControlName="minValue" [useGrouping]="false" inputStyleClass="pat-form__input w-20" /></td>
                                      <td class="py-0.5 pr-2"><p-inputnumber formControlName="maxValue" [useGrouping]="false" inputStyleClass="pat-form__input w-20" /></td>
                                      <td class="py-0.5 pr-2"><p-inputnumber formControlName="criticalMinValue" [useGrouping]="false" inputStyleClass="pat-form__input w-20" /></td>
                                      <td class="py-0.5 pr-2"><p-inputnumber formControlName="criticalMaxValue" [useGrouping]="false" inputStyleClass="pat-form__input w-20" /></td>
                                      <td class="py-0.5 pr-2">
                                        <p-select [options]="genderOptions" optionLabel="label" optionValue="value"
                                                  formControlName="gender" appendTo="body" styleClass="w-28" />
                                      </td>
                                      <td class="py-0.5 pr-2"><p-inputnumber formControlName="ageMinYears" [useGrouping]="false" [min]="0" inputStyleClass="pat-form__input w-20" /></td>
                                      <td class="py-0.5 pr-2"><p-inputnumber formControlName="ageMaxYears" [useGrouping]="false" [min]="0" inputStyleClass="pat-form__input w-20" /></td>
                                      <td class="py-0.5">
                                        <p-button icon="pi pi-trash" severity="danger" [text]="true" size="small"
                                                  type="button" ariaLabel="Quitar fila"
                                                  (onClick)="removeRefValue(det, $index)" />
                                      </td>
                                    </tr>
                                    @if (isRowInvalid($any(rvCtrl))) {
                                      <tr>
                                        <td colspan="8" class="pb-1 text-[11px] text-[var(--ds-danger)]">
                                          El mínimo debe ser menor al máximo.
                                        </td>
                                      </tr>
                                    }
                                  }
                                </tbody>
                              </table>
                            </div>
                          }
                        }
                      </div>
                    </div>
                  </p-accordion-content>
                </p-accordion-panel>
              }
            </p-accordion>
          }
        </section>

        <!-- Barra de acciones inferior (pegajosa) para formularios largos -->
        <div class="pat-form__footer" style="border-radius: 10px;">
          <p-button label="Cancelar" severity="secondary" text type="button"
                    [disabled]="saving()" (onClick)="onCancel()" />
          <p-button label="Guardar cambios" severity="primary" type="button"
                    [disabled]="loading() || !!loadError() || saving()" [loading]="saving()"
                    (onClick)="onSave()" />
        </div>
      }
    </div>
  `,
  styles: [`
    .nbu-rv-row--invalid {
      background: var(--ds-danger-soft, rgba(220, 38, 38, 0.08));
    }
  `],
})
export class NbuConfigPage {
  private readonly fb = inject(FormBuilder);
  private readonly nbuConfig = inject(NbuConfigApiService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  /** analysis_catalog.id, provisto por la ruta `nbu/:catalogId/config` (withComponentInputBinding). */
  readonly catalogId = input.required<string>();

  /** Id numérico del análisis (NaN si la ruta trae algo inválido). */
  protected readonly numericId = computed(() => Number(this.catalogId()));

  /** Filas del catálogo del store — para resolver nombre/código NBU/familia del encabezado. */
  private readonly catalogRows = this.store.selectSignal(selectCatalogRows);

  /** Fila del catálogo del análisis actual (para el encabezado). Puede ser null en navegación directa. */
  protected readonly analysisRow = computed<CatalogRow | null>(() => {
    const id = this.numericId();
    if (Number.isNaN(id)) return null;
    return this.catalogRows().find((r) => r.id === id) ?? null;
  });

  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly active = signal(false);

  /** Opciones de tipos de preparación (catálogo fijo del BE, cargado una vez). */
  protected readonly prepTypeOptions = signal<PreparationTypeOption[]>([]);

  /** Categorías cualitativas disponibles (globales + propias del tenant). */
  protected readonly qualitativeCategories = signal<QualitativeCategory[]>([]);

  /**
   * detId de la determinación que tiene el mini-form "+ Nueva categoría" abierto,
   * o null si ninguna lo tiene. Un solo form abierto a la vez, aislado por determinación.
   */
  protected readonly openCategoryFormDetId = signal<number | null>(null);
  protected readonly newCategoryName = signal('');
  protected readonly newCategoryValues = signal('');
  protected readonly newCategoryOrdinal = signal(false);
  protected readonly creatingCategory = signal(false);

  /**
   * Form de la sección General: código interno (requerido), nombre propio (opcional) y
   * tiempo estimado de resultado (opcional, valor + unidad Horas/Días).
   */
  protected readonly generalForm = this.fb.group({
    shortCode: this.fb.control<string>('', { nonNullable: true }),
    customName: this.fb.control<string | null>(null),
    handlingTimeValue: this.fb.control<number | null>(null),
    handlingTimeUnit: this.fb.control<'HOURS' | 'DAYS' | null>(null),
  });

  protected readonly handlingTimeUnitOptions = [
    { label: 'Horas', value: 'HOURS' as const },
    { label: 'Días', value: 'DAYS' as const },
  ];

  protected readonly genderOptions: GenderOption[] = [
    { label: 'Ambos', value: null },
    { label: 'Masculino', value: 'MALE' },
    { label: 'Femenino', value: 'FEMALE' },
  ];

  protected readonly analyticalTypeOptions: AnalyticalTypeOption[] = [
    { label: 'Numérico', value: 'QUANTITATIVE' },
    { label: 'Cualitativo', value: 'QUALITATIVE' },
    { label: 'Semicuantitativo', value: 'SEMI_QUALITATIVE' },
  ];

  /** Forms por determinación (ref-values + preparación + override existente). */
  protected detForms: DetForm[] = [];

  /** detIds a abrir por defecto en el accordion (todos, para aprovechar el ancho). */
  protected defaultOpenPanels: number[] = [];

  /** tenant_analysis.id de la fila (destino del PATCH de shortCode/customName). */
  private tenantAnalysisId: number | null = null;
  /** Valores originales de shortCode/customName (para detectar cambios al guardar). */
  private originalShortCode = '';
  private originalCustomName: string | null = null;
  /** Valores originales del tiempo estimado de resultado (para detectar cambios al guardar). */
  private originalHandlingTimeValue: number | null = null;
  private originalHandlingTimeUnit: 'HOURS' | 'DAYS' | null = null;

  constructor() {
    // Asegura que el catálogo esté en el store para el encabezado (soporta URL directa).
    this.store.dispatch(loadNomenclador());
    // Carga la configuración cuando cambia el id de ruta.
    effect(() => {
      const id = this.numericId();
      if (Number.isNaN(id)) {
        this.loadError.set('No se pudo identificar el análisis a configurar.');
        return;
      }
      this.loadConfig(id);
    });
  }

  protected headerLabel(): string {
    const row = this.analysisRow();
    return row ? `Configurar — ${row.name}` : 'Configurar análisis';
  }

  protected headerSubtitle(): string {
    const row = this.analysisRow();
    if (!row) return 'Configuración del análisis del Nomenclador NBU.';
    const nbu = row.nbuCode ?? '—';
    const fam = row.familyName ?? '—';
    return `Cód. NBU ${nbu} · Familia ${fam}`;
  }

  /** Opciones para el selector de categoría (label = nombre, value = id). */
  protected qualitativeCategoryOptions(): Array<{ label: string; value: number }> {
    return this.qualitativeCategories().map((c) => ({ label: c.name, value: c.id }));
  }

  /** Devuelve la categoría seleccionada de una determinación (o null si no hay). */
  protected selectedCategory(det: DetForm): QualitativeCategory | null {
    if (det.qualitativeCategoryId == null) return null;
    return this.qualitativeCategories().find((c) => c.id === det.qualitativeCategoryId) ?? null;
  }

  protected onCancel(): void {
    this.router.navigate(['/analitica/nbu']);
  }

  protected onToggleActive(next: boolean): void {
    const id = this.numericId();
    if (Number.isNaN(id)) return;
    const shortCode = (this.generalForm.controls.shortCode.value ?? '').trim();
    if (next && shortCode.length === 0) {
      this.messageService.add({
        severity: 'warn', summary: 'Falta el código interno',
        detail: 'Ingresá el código interno antes de activar el análisis.',
      });
      return;  // no flipear el estado
    }
    const customName = (this.generalForm.controls.customName.value ?? '').trim() || null;
    const prev = this.active();
    this.active.set(next);
    this.nbuConfig.setActivation(id, next, shortCode, customName).subscribe({
      next: () => this.messageService.add({
        severity: 'success', summary: next ? 'Análisis activado' : 'Análisis desactivado',
        detail: 'El cambio se guardó correctamente.',
      }),
      error: () => {
        this.active.set(prev);  // revertir
        this.messageService.add({
          severity: 'error', summary: 'Error',
          detail: 'No se pudo cambiar el estado del análisis. Intentá de nuevo.',
        });
      },
    });
  }

  protected onPrepTypeToggle(det: DetForm, code: string, checked: boolean): void {
    if (checked) {
      det.prepTypes.add(code);
    } else {
      det.prepTypes.delete(code);
      if (code === 'AYUNO') det.fastingHours = null;
    }
  }

  protected onValueTypeChange(det: DetForm, type: AnalyticalType): void {
    det.valueType = type;
    if (type === 'QUANTITATIVE') {
      det.qualitativeCategoryId = null;
    }
  }

  protected openNewCategoryForm(det: DetForm): void {
    this.newCategoryName.set('');
    this.newCategoryValues.set('');
    this.newCategoryOrdinal.set(false);
    this.openCategoryFormDetId.set(det.detId);
  }

  protected closeNewCategoryForm(): void {
    this.newCategoryName.set('');
    this.newCategoryValues.set('');
    this.newCategoryOrdinal.set(false);
    this.openCategoryFormDetId.set(null);
  }

  protected createNewCategory(det: DetForm): void {
    const name = this.newCategoryName().trim();
    if (name.length === 0) {
      this.messageService.add({
        severity: 'warn', summary: 'Nombre requerido',
        detail: 'Ingresá un nombre para la categoría.',
      });
      return;
    }
    const values = this.newCategoryValues().split(',').map((v) => v.trim()).filter((v) => v.length > 0);
    if (values.length === 0) {
      this.messageService.add({
        severity: 'warn', summary: 'Valores requeridos',
        detail: 'Ingresá al menos un valor para la categoría.',
      });
      return;
    }
    this.creatingCategory.set(true);
    this.nbuConfig.createQualitativeCategory(name, this.newCategoryOrdinal(), values).subscribe({
      next: (created) => {
        this.qualitativeCategories.update((list) => [...list, created]);
        det.qualitativeCategoryId = created.id;
        this.creatingCategory.set(false);
        this.openCategoryFormDetId.set(null);
        this.messageService.add({
          severity: 'success', summary: 'Categoría creada',
          detail: `La categoría "${created.name}" fue creada correctamente.`,
        });
      },
      error: () => {
        this.creatingCategory.set(false);
        this.messageService.add({
          severity: 'error', summary: 'Error',
          detail: 'No se pudo crear la categoría. Intentá de nuevo.',
        });
      },
    });
  }

  /** Serializa el estado de preparación para comparar cambios (diff). */
  private snapshotPrep(types: Set<string>, hours: number | null, obs: string): string {
    return JSON.stringify({ types: [...types].sort(), hours, obs });
  }

  // ── Carga ────────────────────────────────────────────────────────────────────

  private loadConfig(catalogId: number): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.detForms = [];
    this.defaultOpenPanels = [];
    this.active.set(false);
    this.tenantAnalysisId = null;
    this.originalShortCode = '';
    this.originalCustomName = null;
    this.originalHandlingTimeValue = null;
    this.originalHandlingTimeUnit = null;
    this.generalForm.reset({ shortCode: '', customName: null, handlingTimeValue: null, handlingTimeUnit: null });

    forkJoin({
      determinations: this.nbuConfig.getCatalogDeterminations(catalogId).pipe(
        catchError(() => of([] as DeterminationCatalogItem[])),
      ),
      tenantRows: this.nbuConfig.listTenantAnalyses().pipe(catchError(() => of([] as TenantAnalysisRow[]))),
      prepTypes: this.nbuConfig.getPreparationTypes().pipe(catchError(() => of([] as PreparationTypeOption[]))),
      qualCategories: this.nbuConfig.getQualitativeCategories().pipe(catchError(() => of([] as QualitativeCategory[]))),
    }).subscribe({
      next: ({ determinations, tenantRows, prepTypes, qualCategories }) => {
        this.prepTypeOptions.set(prepTypes);
        this.qualitativeCategories.set(qualCategories);

        const tenantRow = tenantRows.find((r) => r.catalogId === catalogId) ?? null;
        this.active.set(tenantRow?.active ?? false);

        this.tenantAnalysisId = tenantRow?.id ?? null;
        this.originalShortCode = tenantRow?.shortCode ?? '';
        this.originalCustomName = tenantRow?.customName ?? null;
        this.originalHandlingTimeValue = tenantRow?.handlingTimeValue ?? null;
        this.originalHandlingTimeUnit = tenantRow?.handlingTimeUnit ?? null;
        this.generalForm.setValue({
          shortCode: this.originalShortCode,
          customName: this.originalCustomName,
          handlingTimeValue: this.originalHandlingTimeValue,
          handlingTimeUnit: this.originalHandlingTimeUnit,
        });

        if (determinations.length === 0) {
          this.loading.set(false);
          return;
        }
        this.loadDeterminations(determinations);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('No se pudo cargar la configuración. Intentá de nuevo.');
      },
    });
  }

  private loadDeterminations(dets: ReadonlyArray<DeterminationCatalogItem>): void {
    forkJoin(
      dets.map((det) =>
        forkJoin({
          override: this.nbuConfig.getOverride(det.id).pipe(
            map((r) => r.override),
            catchError(() => of(null)),
          ),
          refValues: this.nbuConfig.getReferenceValues(det.id).pipe(
            catchError(() => of([] as ReferenceValueItem[])),
          ),
          preparation: this.nbuConfig.getPreparation(det.id).pipe(
            catchError(() => of({ items: [] })),
          ),
        }).pipe(map((res) => ({ det, ...res }))),
      ),
    ).subscribe({
      next: (results) => {
        this.detForms = results.map(({ det, override, refValues, preparation }) =>
          this.buildDetForm(det, override, refValues, preparation.items),
        );
        this.defaultOpenPanels = this.detForms.map((d) => d.detId);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('No se pudo cargar la configuración. Intentá de nuevo.');
      },
    });
  }

  private buildDetForm(
    det: DeterminationCatalogItem,
    override: DeterminationOverride | null,
    refValues: ReferenceValueItem[],
    prepItems: Array<{ type: string; fastingHours: number | null }>,
  ): DetForm {
    const analyticalType = (override?.analyticalType ?? 'QUANTITATIVE') as AnalyticalType;
    const refArray = this.fb.array(refValues.map((rv) => this.buildRefValueGroup(rv)));
    const prepTypes = new Set<string>(prepItems.map((i) => i.type));
    const fastingHours = prepItems.find((i) => i.type === 'AYUNO')?.fastingHours ?? null;
    const observations = override?.preObservations ?? '';
    return {
      detId: det.id,
      detName: det.name,
      unit: det.unit,
      existingOverride: override,
      refValues: refArray,
      originalRefValues: JSON.stringify(refArray.getRawValue()),
      prepTypes,
      fastingHours,
      observations,
      originalPrep: this.snapshotPrep(prepTypes, fastingHours, observations),
      valueType: analyticalType,
      qualitativeCategoryId: override?.qualitativeCategoryId ?? null,
    };
  }

  private buildRefValueGroup(rv?: ReferenceValueItem): FormGroup {
    return this.fb.group({
      minValue: this.fb.control<number | null>(rv?.minValue ?? null),
      maxValue: this.fb.control<number | null>(rv?.maxValue ?? null),
      criticalMinValue: this.fb.control<number | null>(rv?.criticalMinValue ?? null),
      criticalMaxValue: this.fb.control<number | null>(rv?.criticalMaxValue ?? null),
      ageMinYears: this.fb.control<number | null>(monthsToYears(rv?.ageMinMonths ?? null)),
      ageMaxYears: this.fb.control<number | null>(monthsToYears(rv?.ageMaxMonths ?? null)),
      gender: this.fb.control<'MALE' | 'FEMALE' | null>(rv?.gender ?? null),
      qualitativeValue: this.fb.control<number | null>(rv?.qualitativeValue ?? null),
    });
  }

  protected addRefValue(det: DetForm): void {
    det.refValues.push(this.buildRefValueGroup());
  }

  protected removeRefValue(det: DetForm, index: number): void {
    det.refValues.removeAt(index);
  }

  /**
   * Fila inválida: mín ≥ máx (ambos cargados), o crít.mín > mín, o máx > crít.máx.
   * Solo valida los pares que están cargados.
   */
  protected isRowInvalid(group: FormGroup): boolean {
    const v = group.getRawValue() as {
      minValue: number | null; maxValue: number | null;
      criticalMinValue: number | null; criticalMaxValue: number | null;
    };
    if (v.minValue != null && v.maxValue != null && v.minValue >= v.maxValue) return true;
    if (v.criticalMinValue != null && v.minValue != null && v.criticalMinValue > v.minValue) return true;
    if (v.criticalMaxValue != null && v.maxValue != null && v.maxValue > v.criticalMaxValue) return true;
    return false;
  }

  private hasInvalidRows(): boolean {
    return this.detForms.some((det) =>
      det.valueType === 'QUANTITATIVE' &&
      det.refValues.controls.some((c) => this.isRowInvalid(c as FormGroup)),
    );
  }

  private hasInvalidFastingHours(): boolean {
    return this.detForms.some(
      (det) => det.prepTypes.has('AYUNO') && (det.fastingHours == null || det.fastingHours <= 0),
    );
  }

  /**
   * Detecta si alguna fila de ref-values de una determinación tiene un rango de edad inválido
   * (ageMin > ageMax) o si dos filas se solapan por segmento (sexo + edad).
   *
   * Regla de solape (misma que el BE):
   * - Sexo null = ambos → solapa con cualquier sexo concreto.
   * - Dos sexos concretos distintos (MALE vs FEMALE) no solapan.
   * - Edad: null en ageMinYears → 0 meses; null en ageMaxYears → +∞.
   * - Solape inclusivo: lo1 ≤ hi2 && lo2 ≤ hi1.
   */
  private overlappingRefRows(det: DetForm): boolean {
    const rows = det.refValues.getRawValue() as Array<{
      gender: 'MALE' | 'FEMALE' | null;
      ageMinYears: number | null;
      ageMaxYears: number | null;
    }>;
    const segs = rows.map((r) => ({
      gender: r.gender,
      lo: r.ageMinYears == null ? 0 : Math.round(r.ageMinYears * 12),
      hi: r.ageMaxYears == null ? Number.MAX_SAFE_INTEGER : Math.round(r.ageMaxYears * 12),
    }));
    for (let i = 0; i < segs.length; i++) {
      if (segs[i].lo > segs[i].hi) return true; // ageMin > ageMax: fila inválida
      for (let j = i + 1; j < segs.length; j++) {
        // Sexos solapan si alguno es null (= ambos) o si son iguales
        const genderOverlap =
          segs[i].gender == null || segs[j].gender == null || segs[i].gender === segs[j].gender;
        // Rangos de edad solapan en forma inclusiva
        const ageOverlap = segs[i].lo <= segs[j].hi && segs[j].lo <= segs[i].hi;
        if (genderOverlap && ageOverlap) return true;
      }
    }
    return false;
  }

  private hasIncongruentRefValues(): boolean {
    return this.detForms.some((d) => this.overlappingRefRows(d));
  }

  // ── Guardado ───────────────────────────────────────────────────────────────────

  protected onSave(): void {
    const id = this.numericId();
    if (Number.isNaN(id) || this.saving()) return;

    const shortCodeNuevo = (this.generalForm.controls.shortCode.value ?? '').trim();
    if (shortCodeNuevo.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Falta el código interno',
        detail: 'El código interno es obligatorio.',
      });
      return;
    }

    if (this.hasInvalidRows()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Valores inválidos',
        detail: 'Revisá los valores de referencia (mínimo debe ser menor al máximo).',
      });
      return;
    }

    if (this.hasInvalidFastingHours()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Horas de ayuno requeridas',
        detail: 'Ingresá las horas de ayuno (mayor a 0).',
      });
      return;
    }

    if (this.hasIncongruentRefValues()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Rangos superpuestos',
        detail: 'Hay valores de referencia con sexo y edad superpuestos. Revisá que cada combinación de sexo y edad tenga un solo rango.',
      });
      return;
    }

    // General: si cambió el código interno o el nombre propio, PATCH a tenant-analyses.
    const customNameRaw = this.generalForm.controls.customName.value;
    const customNameNuevo = customNameRaw == null || customNameRaw.trim().length === 0
      ? null
      : customNameRaw.trim();

    const htValue = this.generalForm.controls.handlingTimeValue.value;
    const htUnit = this.generalForm.controls.handlingTimeUnit.value;
    // value y unit: ambos o ninguno
    if ((htValue == null) !== (htUnit == null)) {
      this.messageService.add({
        severity: 'warn', summary: 'Tiempo estimado incompleto',
        detail: 'Cargá el tiempo estimado y su unidad juntos, o dejá ambos vacíos.',
      });
      return;
    }
    if (htValue != null && htValue <= 0) {
      this.messageService.add({
        severity: 'warn', summary: 'Tiempo estimado inválido',
        detail: 'El tiempo estimado debe ser mayor a cero.',
      });
      return;
    }

    const calls: Array<Observable<unknown>> = [];

    const handlingTimeChanged =
      (htValue ?? null) !== (this.originalHandlingTimeValue ?? null) ||
      (htUnit ?? null) !== (this.originalHandlingTimeUnit ?? null);
    const generalChanged =
      shortCodeNuevo !== (this.originalShortCode ?? '').trim() ||
      customNameNuevo !== (this.originalCustomName ?? null) ||
      handlingTimeChanged;
    if (generalChanged && this.tenantAnalysisId != null) {
      calls.push(this.nbuConfig.updateTenantAnalysis(this.tenantAnalysisId, {
        shortCode: shortCodeNuevo,
        customName: customNameNuevo,
        handlingTimeValue: htValue ?? null,
        handlingTimeUnit: htUnit ?? null,
      }));
    }

    // Preparación estructurada + observaciones + override: por determinación.
    for (const det of this.detForms) {
      const currentPrepSnapshot = this.snapshotPrep(det.prepTypes, det.fastingHours, det.observations.trim());
      const prepChanged = currentPrepSnapshot !== det.originalPrep;

      if (prepChanged) {
        const items = [...det.prepTypes].map((type) => ({
          type,
          fastingHours: type === 'AYUNO' ? det.fastingHours : null,
        }));
        calls.push(this.nbuConfig.upsertPreparation(det.detId, items));
      }

      // Override (tipo analítico + categoría cualitativa + observaciones).
      const typeChanged = det.valueType !== ((det.existingOverride?.analyticalType ?? 'QUANTITATIVE') as AnalyticalType);
      const categoryChanged = det.qualitativeCategoryId !== (det.existingOverride?.qualitativeCategoryId ?? null);

      if (prepChanged || typeChanged || categoryChanged) {
        const body: Partial<DeterminationOverride> = {
          ...(det.existingOverride ?? {}),
          preObservations: det.observations.trim().length > 0 ? det.observations.trim() : null,
          analyticalType: det.valueType,
          qualitativeCategoryId: det.valueType !== 'QUANTITATIVE' ? det.qualitativeCategoryId : null,
        };
        calls.push(this.nbuConfig.upsertOverride(det.detId, body));
      }
    }

    // Ref-values: por determinación cuya tabla cambió, con unit de la determinación y edades en meses.
    for (const det of this.detForms) {
      const rawRows = det.refValues.getRawValue() as Array<{
        minValue: number | null; maxValue: number | null;
        criticalMinValue: number | null; criticalMaxValue: number | null;
        ageMinYears: number | null; ageMaxYears: number | null;
        gender: 'MALE' | 'FEMALE' | null;
        qualitativeValue: number | null;
      }>;
      if (JSON.stringify(rawRows) === det.originalRefValues) continue;

      if (det.valueType !== 'QUANTITATIVE') {
        // Modo cualitativo: enviar qualitativeValue; sin min/max
        const items: ReferenceValueItem[] = rawRows.map((r) => ({
          minValue: null,
          maxValue: null,
          criticalMinValue: null,
          criticalMaxValue: null,
          ageMinMonths: yearsToMonths(r.ageMinYears),
          ageMaxMonths: yearsToMonths(r.ageMaxYears),
          gender: r.gender,
          unit: det.unit,
          qualitativeValue: r.qualitativeValue,
        }));
        calls.push(this.nbuConfig.upsertReferenceValues(det.detId, items));
      } else {
        // Modo cuantitativo: enviar min/max; sin qualitativeValue
        const items: ReferenceValueItem[] = rawRows.map((r) => ({
          minValue: r.minValue,
          maxValue: r.maxValue,
          criticalMinValue: r.criticalMinValue,
          criticalMaxValue: r.criticalMaxValue,
          ageMinMonths: yearsToMonths(r.ageMinYears),
          ageMaxMonths: yearsToMonths(r.ageMaxYears),
          gender: r.gender,
          unit: det.unit,
          qualitativeValue: null,
        }));
        calls.push(this.nbuConfig.upsertReferenceValues(det.detId, items));
      }
    }

    if (calls.length === 0) {
      this.messageService.add({ severity: 'info', summary: 'Sin cambios', detail: 'No hay cambios para guardar.' });
      this.finishSave(id);
      return;
    }

    this.saving.set(true);
    forkJoin(calls).subscribe({
      next: () => {
        this.saving.set(false);
        this.messageService.add({ severity: 'success', summary: 'Configuración guardada', detail: 'Los cambios se guardaron correctamente.' });
        this.finishSave(id);
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la configuración. Intentá de nuevo.' });
      },
    });
  }

  /**
   * Refresca el resumen de config del análisis y el catálogo (para que las columnas
   * Código/Análisis reflejen el alias nuevo), y vuelve al catálogo NBU. Mismo efecto
   * que antes disparaba el `saved` del ex-drawer.
   */
  private finishSave(analysisId: number): void {
    this.store.dispatch(loadConfigResumen({ analysisId }));
    this.store.dispatch(loadNomenclador());
    this.router.navigate(['/analitica/nbu']);
  }
}
