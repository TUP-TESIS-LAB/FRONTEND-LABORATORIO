import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges,
  inject, signal,
} from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { AccordionModule } from 'primeng/accordion';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import {
  DeterminationCatalogItem, DeterminationOverride, NbuConfigApiService, ReferenceValueItem,
  TenantAnalysisRow,
} from '../../../services/nbu-config-api.service';
import { CatalogRow } from '../../../models/nomenclador.model';

interface GenderOption { label: string; value: 'MALE' | 'FEMALE' | null; }

/**
 * Modelo de trabajo del form por determinación: SOLO la tabla de valores de referencia
 * (editable) + el override existente intacto (para mergear el ayuno al guardar) + la unidad
 * de la determinación (read-only) + snapshot original para detectar cambios.
 */
interface DetForm {
  detId: number;
  detName: string;
  /** Unidad de medida de la determinación (read-only, contexto). */
  unit: string | null;
  /** Override existente tal cual lo trajo el BE — base para mergear el ayuno (fix pérdida de datos). */
  existingOverride: DeterminationOverride | null;
  refValues: FormArray;
  /** Snapshot serializado de los ref-values al cargar (para diff). */
  originalRefValues: string;
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
 * Drawer de configuración por tenant de un análisis del Nomenclador NBU (KAN-130).
 *
 * Diseño orientado al admin de laboratorio (no volcado 1:1 del DTO):
 * - General: código interno (requerido) y nombre propio (opcional) editables, con estado
 *   y contexto NBU/familia read-only. La sección se configura en otra pantalla.
 * - Preparación del paciente / ayuno: UN solo campo a nivel análisis (se replica a todas
 *   las determinaciones, mergeando el override existente para no pisar config técnica).
 * - Valores de referencia: por determinación, en años (se convierten a meses para la API),
 *   con la unidad de la determinación como contexto read-only.
 *
 * Patrón de drawer del repo (`medico-form-drawer`): `p-drawer position="right"
 * styleClass="ui-drawer-half"`, footer sticky Cancelar/Guardar, `ngOnChanges` abre/cierra.
 * Editor aislado: carga y guarda vía services directos con signals locales (no NgRx).
 * Solo opera ADMINISTRADOR (gating BE + el botón "Configurar" se oculta a no-admin).
 */
@Component({
  selector: 'lab-nbu-config-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  imports: [
    ReactiveFormsModule, DrawerModule, ButtonModule, InputTextModule, InputNumberModule,
    TextareaModule, SelectModule, AccordionModule, ToastModule,
  ],
  template: `
    <p-drawer
      [visible]="visibleInternal"
      (visibleChange)="onVisibleChange($event)"
      position="right"
      styleClass="ui-drawer-half"
      [modal]="true"
      [dismissible]="true"
      [header]="headerLabel()">
      <p-toast position="top-right" />

      <div class="flex flex-col h-full">
        <div class="pat-form" style="flex:1; overflow-y:auto;">
          @if (loading()) {
            <span class="text-sm text-[var(--ds-text-muted)] italic px-2">Cargando configuración…</span>
          } @else if (loadError()) {
            <span class="text-sm text-[var(--ds-danger)] px-2">{{ loadError() }}</span>
          } @else {
            <!-- General — código interno y nombre propio editables + contexto read-only -->
            <section class="pat-form__card" [formGroup]="generalForm">
              <div class="pat-form__card-header"><span>General</span></div>
              <div class="pat-form__grid">
                <div class="pat-form__field">
                  <label class="pat-form__label" for="nbu-short-code">
                    Código interno <span class="text-[var(--ds-danger)]">*</span>
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
                  <span class="text-xs text-[var(--ds-text-muted)]">
                    Estado: {{ active() ? 'Activo' : 'Inactivo' }}
                    · Cód. NBU: {{ analysis?.nbuCode ?? '—' }}
                    · Familia: {{ analysis?.familyName ?? '—' }}
                  </span>
                </div>
              </div>
            </section>

            <!-- Preparación del paciente / ayuno — un solo campo a nivel análisis -->
            <section class="pat-form__card">
              <div class="pat-form__card-header"><span>Preparación del paciente</span></div>
              <div class="pat-form__grid">
                <div class="pat-form__field" style="grid-column: 1 / -1;">
                  <label class="pat-form__label" for="nbu-ayuno">Preparación del paciente / ayuno</label>
                  <textarea id="nbu-ayuno" pTextarea rows="2" autocomplete="off"
                            class="pat-form__input"
                            placeholder="Ej: Ayuno de 8 horas. Concurrir con primera orina."
                            [value]="ayuno()"
                            (input)="onAyunoInput($event)"></textarea>
                </div>
              </div>
            </section>

            <!-- Valores de referencia — por determinación -->
            <section class="pat-form__card">
              <div class="pat-form__card-header"><span>Valores de referencia</span></div>
              @if (detForms.length === 0) {
                <span class="text-sm text-[var(--ds-text-muted)] px-2">Este análisis no tiene determinaciones.</span>
              } @else {
                <p-accordion [multiple]="true">
                  @for (det of detForms; track det.detId) {
                    <p-accordion-panel [value]="det.detId">
                      <p-accordion-header>{{ det.detName }}</p-accordion-header>
                      <p-accordion-content>
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
                      </p-accordion-content>
                    </p-accordion-panel>
                  }
                </p-accordion>
              }
            </section>
          }
        </div>

        <div class="pat-form__footer">
          <p-button label="Cancelar" severity="secondary" text type="button"
                    [disabled]="saving()" (onClick)="onCancel()" />
          <p-button label="Guardar" severity="primary" type="button"
                    [disabled]="loading() || !!loadError() || saving()" [loading]="saving()"
                    (onClick)="onSave()" />
        </div>
      </div>
    </p-drawer>
  `,
  styles: [`
    .nbu-rv-row--invalid {
      background: var(--ds-danger-soft, rgba(220, 38, 38, 0.08));
    }
  `],
})
export class NbuConfigDrawerComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly nbuConfig = inject(NbuConfigApiService);
  private readonly messageService = inject(MessageService);

  @Input() visible = false;
  @Input() analysis: CatalogRow | null = null;

  /** Emite el analysisId al guardar con éxito (el parent refresca el resumen). */
  @Output() saved = new EventEmitter<number>();
  @Output() cancel = new EventEmitter<void>();

  protected visibleInternal = false;

  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly active = signal(false);
  protected readonly ayuno = signal('');

  /** Form de la sección General: código interno (requerido) y nombre propio (opcional). */
  protected readonly generalForm = this.fb.group({
    shortCode: this.fb.control<string>('', { nonNullable: true }),
    customName: this.fb.control<string | null>(null),
  });

  protected readonly genderOptions: GenderOption[] = [
    { label: 'Ambos', value: null },
    { label: 'Masculino', value: 'MALE' },
    { label: 'Femenino', value: 'FEMALE' },
  ];

  /** Forms por determinación (solo ref-values; el override existente se guarda aparte). */
  protected detForms: DetForm[] = [];

  /** Texto de ayuno original (para detectar cambios al guardar). */
  private originalAyuno = '';
  private wasVisible = false;

  /** tenant_analysis.id de la fila (destino del PATCH de shortCode/customName). */
  private tenantAnalysisId: number | null = null;
  /** Valores originales de shortCode/customName (para detectar cambios al guardar). */
  private originalShortCode = '';
  private originalCustomName: string | null = null;

  protected headerLabel(): string {
    return this.analysis ? `Configurar — ${this.analysis.name}` : 'Configurar análisis';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('visible' in changes) {
      this.visibleInternal = this.visible;
      if (this.visible && !this.wasVisible && this.analysis) {
        this.loadConfig(this.analysis);
      }
      this.wasVisible = this.visible;
    }
  }

  protected onVisibleChange(open: boolean): void {
    this.visibleInternal = open;
    if (!open) this.cancel.emit();
  }

  protected onCancel(): void {
    this.visibleInternal = false;
    this.cancel.emit();
  }

  protected onAyunoInput(event: Event): void {
    this.ayuno.set((event.target as HTMLTextAreaElement).value);
  }

  // ── Carga ────────────────────────────────────────────────────────────────────

  private loadConfig(analysis: CatalogRow): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.detForms = [];
    this.active.set(false);
    this.ayuno.set('');
    this.originalAyuno = '';
    this.tenantAnalysisId = null;
    this.originalShortCode = '';
    this.originalCustomName = null;
    this.generalForm.reset({ shortCode: '', customName: null });

    forkJoin({
      determinations: this.nbuConfig.getCatalogDeterminations(analysis.id).pipe(
        catchError(() => of([] as DeterminationCatalogItem[])),
      ),
      tenantRows: this.nbuConfig.listTenantAnalyses().pipe(catchError(() => of([] as TenantAnalysisRow[]))),
    }).subscribe({
      next: ({ determinations, tenantRows }) => {
        const tenantRow = tenantRows.find((r) => r.catalogId === analysis.id) ?? null;
        this.active.set(tenantRow?.active ?? false);

        this.tenantAnalysisId = tenantRow?.id ?? null;
        this.originalShortCode = tenantRow?.shortCode ?? '';
        this.originalCustomName = tenantRow?.customName ?? null;
        this.generalForm.setValue({
          shortCode: this.originalShortCode,
          customName: this.originalCustomName,
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
        }).pipe(map((res) => ({ det, ...res }))),
      ),
    ).subscribe({
      next: (results) => {
        this.detForms = results.map(({ det, override, refValues }) =>
          this.buildDetForm(det, override, refValues),
        );

        // Ayuno: el preIndications de la primera determinación que lo tenga cargado.
        const withAyuno = results.find((r) => (r.override?.preIndications ?? '').trim().length > 0);
        const ayunoInicial = withAyuno?.override?.preIndications ?? '';
        this.ayuno.set(ayunoInicial);
        this.originalAyuno = ayunoInicial;

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
  ): DetForm {
    const refArray = this.fb.array(refValues.map((rv) => this.buildRefValueGroup(rv)));
    return {
      detId: det.id,
      detName: det.name,
      unit: det.unit,
      existingOverride: override,
      refValues: refArray,
      originalRefValues: JSON.stringify(refArray.getRawValue()),
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
      det.refValues.controls.some((c) => this.isRowInvalid(c as FormGroup)),
    );
  }

  // ── Guardado ───────────────────────────────────────────────────────────────────

  protected onSave(): void {
    if (!this.analysis || this.saving()) return;

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

    const calls: Array<Observable<unknown>> = [];

    // General: si cambió el código interno o el nombre propio, PATCH a tenant-analyses.
    const customNameRaw = this.generalForm.controls.customName.value;
    const customNameNuevo = customNameRaw == null || customNameRaw.trim().length === 0
      ? null
      : customNameRaw.trim();
    const generalChanged =
      shortCodeNuevo !== (this.originalShortCode ?? '').trim() ||
      customNameNuevo !== (this.originalCustomName ?? null);
    if (generalChanged && this.tenantAnalysisId != null) {
      calls.push(this.nbuConfig.updateTenantAnalysis(this.tenantAnalysisId, {
        shortCode: shortCodeNuevo,
        customName: customNameNuevo,
      }));
    }

    // Ayuno: si cambió, mergear el override existente y solo pisar preIndications en TODAS.
    const ayunoNuevo = this.ayuno().trim();
    const ayunoChanged = ayunoNuevo !== (this.originalAyuno ?? '').trim();
    if (ayunoChanged) {
      for (const det of this.detForms) {
        const body: Partial<DeterminationOverride> = {
          ...(det.existingOverride ?? {}),
          preIndications: ayunoNuevo.length > 0 ? ayunoNuevo : null,
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
      }>;
      if (JSON.stringify(rawRows) === det.originalRefValues) continue;

      const items: ReferenceValueItem[] = rawRows.map((r) => ({
        minValue: r.minValue,
        maxValue: r.maxValue,
        criticalMinValue: r.criticalMinValue,
        criticalMaxValue: r.criticalMaxValue,
        ageMinMonths: yearsToMonths(r.ageMinYears),
        ageMaxMonths: yearsToMonths(r.ageMaxYears),
        gender: r.gender,
        unit: det.unit,
      }));
      calls.push(this.nbuConfig.upsertReferenceValues(det.detId, items));
    }

    if (calls.length === 0) {
      this.messageService.add({ severity: 'info', summary: 'Sin cambios', detail: 'No hay cambios para guardar.' });
      this.saved.emit(this.analysis.id);
      this.visibleInternal = false;
      return;
    }

    this.saving.set(true);
    forkJoin(calls).subscribe({
      next: () => {
        this.saving.set(false);
        this.messageService.add({ severity: 'success', summary: 'Configuración guardada', detail: 'Los cambios se guardaron correctamente.' });
        this.saved.emit(this.analysis!.id);
        this.visibleInternal = false;
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la configuración. Intentá de nuevo.' });
      },
    });
  }
}
