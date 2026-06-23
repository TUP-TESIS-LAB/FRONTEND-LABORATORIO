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
import { ToggleSwitch } from 'primeng/toggleswitch';
import { AccordionModule } from 'primeng/accordion';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { AnalysisService } from '../../../services/analysis.service';
import { SectionService } from '../../../../sucursales/services/section.service';
import {
  DeterminationOverride, NbuConfigApiService, ReferenceValueItem, TenantAnalysisRow,
} from '../../../services/nbu-config-api.service';
import { CatalogRow } from '../../../models/nomenclador.model';

interface SectionOption { label: string; value: number; }
interface GenderOption { label: string; value: 'MALE' | 'FEMALE' | null; }

/**
 * Modelo de trabajo del form por determinación: override + valores de referencia,
 * más un snapshot del estado original para detectar cambios al guardar.
 */
interface DetForm {
  detId: number;
  detName: string;
  override: FormGroup;
  refValues: FormArray;
  /** Snapshot serializado del override y ref-values al cargar (para diff). */
  originalOverride: string;
  originalRefValues: string;
}

/**
 * Drawer de configuración por tenant de un análisis del Nomenclador NBU (KAN-130).
 *
 * Edita, por análisis: la sección/área del laboratorio (PATCH tenant-analyses) y, por
 * cada determinación, su override de fase preanalítica (ayuno, unidad, validación,
 * orden de impresión) y sus valores de referencia propios. Solo opera ADMINISTRADOR
 * (gating BE + el botón "Configurar" del tab se oculta a no-admin).
 *
 * Patrón de drawer del repo (`medico-form-drawer`): `p-drawer position="right"
 * styleClass="ui-drawer-half"`, footer sticky Cancelar/Guardar, `ngOnChanges` abre/cierra.
 * Editor aislado: carga y guarda vía services directos con signals locales (no NgRx).
 */
@Component({
  selector: 'lab-nbu-config-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  imports: [
    ReactiveFormsModule, DrawerModule, ButtonModule, InputTextModule, InputNumberModule,
    TextareaModule, SelectModule, ToggleSwitch, AccordionModule, ToastModule,
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
            <!-- General -->
            <section class="pat-form__card">
              <div class="pat-form__card-header"><span>General</span></div>
              <div class="pat-form__grid">
                <div class="pat-form__field">
                  <label class="pat-form__label">Sección / área</label>
                  <p-select
                    [options]="sectionOptions()"
                    optionLabel="label"
                    optionValue="value"
                    [formControl]="$any(generalForm.controls.sectionId)"
                    placeholder="Sin sección"
                    [showClear]="true"
                    appendTo="body"
                    class="w-full" />
                </div>
                <div class="pat-form__field">
                  <label class="pat-form__label">Estado</label>
                  <span class="text-sm">{{ active() ? 'Activo' : 'Inactivo' }}</span>
                </div>
              </div>
            </section>

            <!-- Determinaciones -->
            @if (detForms.length === 0) {
              <span class="text-sm text-[var(--ds-text-muted)] px-2">Este análisis no tiene determinaciones.</span>
            } @else {
              <p-accordion [multiple]="true">
                @for (det of detForms; track det.detId) {
                  <p-accordion-panel [value]="det.detId">
                    <p-accordion-header>{{ det.detName }}</p-accordion-header>
                    <p-accordion-content>
                      <div [formGroup]="det.override" class="pat-form__grid">
                        <div class="pat-form__field" style="grid-column: 1 / -1;">
                          <label class="pat-form__label">Ayuno / indicaciones preanalíticas</label>
                          <textarea pTextarea formControlName="preIndications" rows="2"
                                    class="pat-form__input" autocomplete="off"></textarea>
                        </div>
                        <div class="pat-form__field">
                          <label class="pat-form__label">Unidad de medida (ID)</label>
                          <p-inputnumber formControlName="measurementUnitId" [useGrouping]="false"
                                         inputStyleClass="pat-form__input w-full" class="w-full" />
                        </div>
                        <div class="pat-form__field">
                          <label class="pat-form__label">Orden de impresión</label>
                          <p-inputnumber formControlName="printOrder" [useGrouping]="false"
                                         inputStyleClass="pat-form__input w-full" class="w-full" />
                        </div>
                        <div class="pat-form__field flex flex-row items-center gap-2">
                          <p-toggleswitch formControlName="requiresApproval" />
                          <label class="pat-form__label !mb-0">Requiere validación</label>
                        </div>
                        <div class="pat-form__field flex flex-row items-center gap-2">
                          <p-toggleswitch formControlName="canSelfApprove" />
                          <label class="pat-form__label !mb-0">Auto-validable</label>
                        </div>
                      </div>

                      <!-- Valores de referencia -->
                      <div class="mt-3">
                        <div class="flex items-center justify-between mb-2">
                          <span class="pat-form__label !mb-0">Valores de referencia</span>
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
                                  <th class="py-1 pr-2 font-medium">Edad mín (m)</th>
                                  <th class="py-1 pr-2 font-medium">Edad máx (m)</th>
                                  <th class="py-1 pr-2 font-medium">Unidad</th>
                                  <th class="py-1"></th>
                                </tr>
                              </thead>
                              <tbody>
                                @for (rvCtrl of det.refValues.controls; track $index) {
                                  <tr [formGroup]="$any(rvCtrl)">
                                    <td class="py-0.5 pr-2"><p-inputnumber formControlName="minValue" [useGrouping]="false" inputStyleClass="pat-form__input w-20" /></td>
                                    <td class="py-0.5 pr-2"><p-inputnumber formControlName="maxValue" [useGrouping]="false" inputStyleClass="pat-form__input w-20" /></td>
                                    <td class="py-0.5 pr-2"><p-inputnumber formControlName="criticalMinValue" [useGrouping]="false" inputStyleClass="pat-form__input w-20" /></td>
                                    <td class="py-0.5 pr-2"><p-inputnumber formControlName="criticalMaxValue" [useGrouping]="false" inputStyleClass="pat-form__input w-20" /></td>
                                    <td class="py-0.5 pr-2">
                                      <p-select [options]="genderOptions" optionLabel="label" optionValue="value"
                                                formControlName="gender" appendTo="body" styleClass="w-28" />
                                    </td>
                                    <td class="py-0.5 pr-2"><p-inputnumber formControlName="ageMinMonths" [useGrouping]="false" inputStyleClass="pat-form__input w-20" /></td>
                                    <td class="py-0.5 pr-2"><p-inputnumber formControlName="ageMaxMonths" [useGrouping]="false" inputStyleClass="pat-form__input w-20" /></td>
                                    <td class="py-0.5 pr-2"><input pInputText formControlName="unit" class="pat-form__input w-20" autocomplete="off" /></td>
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
                    </p-accordion-content>
                  </p-accordion-panel>
                }
              </p-accordion>
            }
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
})
export class NbuConfigDrawerComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly analysisService = inject(AnalysisService);
  private readonly sectionService = inject(SectionService);
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
  protected readonly sectionOptions = signal<SectionOption[]>([]);

  protected readonly genderOptions: GenderOption[] = [
    { label: 'Ambos', value: null },
    { label: 'Masculino', value: 'MALE' },
    { label: 'Femenino', value: 'FEMALE' },
  ];

  /** Form general (sección). El estado activo es informativo en v1. */
  protected generalForm = this.fb.group({ sectionId: this.fb.control<number | null>(null) });

  /** Forms por determinación (override + ref-values). */
  protected detForms: DetForm[] = [];

  private tenantAnalysisId: number | null = null;
  private originalSectionId: number | null = null;
  private wasVisible = false;

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

  // ── Carga ────────────────────────────────────────────────────────────────────

  private loadConfig(analysis: CatalogRow): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.detForms = [];
    this.tenantAnalysisId = null;
    this.originalSectionId = null;

    forkJoin({
      detail: this.analysisService.getById(analysis.id),
      tenantRows: this.nbuConfig.listTenantAnalyses().pipe(catchError(() => of([] as TenantAnalysisRow[]))),
      sections: this.sectionService.list({ size: 200 }).pipe(
        map((p) => p.content),
        catchError(() => of([])),
      ),
    }).subscribe({
      next: ({ detail, tenantRows, sections }) => {
        this.sectionOptions.set(sections.map((s) => ({ label: s.name, value: s.id })));

        const tenantRow = tenantRows.find((r) => r.catalogId === analysis.id) ?? null;
        this.tenantAnalysisId = tenantRow?.id ?? null;
        this.active.set(tenantRow?.active ?? false);
        this.originalSectionId = tenantRow?.defaultSectionId ?? null;
        this.generalForm.controls.sectionId.setValue(this.originalSectionId);

        const dets = detail.determinations ?? [];
        if (dets.length === 0) {
          this.loading.set(false);
          return;
        }
        this.loadDeterminations(dets);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('No se pudo cargar la configuración. Intentá de nuevo.');
      },
    });
  }

  private loadDeterminations(dets: ReadonlyArray<{ id: number; name: string }>): void {
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
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('No se pudo cargar la configuración. Intentá de nuevo.');
      },
    });
  }

  private buildDetForm(
    det: { id: number; name: string },
    override: DeterminationOverride | null,
    refValues: ReferenceValueItem[],
  ): DetForm {
    const overrideForm = this.fb.group({
      preIndications: this.fb.control<string | null>(override?.preIndications ?? null),
      measurementUnitId: this.fb.control<number | null>(override?.measurementUnitId ?? null),
      printOrder: this.fb.control<number | null>(override?.printOrder ?? null),
      requiresApproval: this.fb.control<boolean>(override?.requiresApproval ?? false),
      canSelfApprove: this.fb.control<boolean>(override?.canSelfApprove ?? false),
    });
    const refArray = this.fb.array(refValues.map((rv) => this.buildRefValueGroup(rv)));
    return {
      detId: det.id,
      detName: det.name,
      override: overrideForm,
      refValues: refArray,
      originalOverride: JSON.stringify(overrideForm.getRawValue()),
      originalRefValues: JSON.stringify(refArray.getRawValue()),
    };
  }

  private buildRefValueGroup(rv?: ReferenceValueItem): FormGroup {
    return this.fb.group({
      minValue: this.fb.control<number | null>(rv?.minValue ?? null),
      maxValue: this.fb.control<number | null>(rv?.maxValue ?? null),
      criticalMinValue: this.fb.control<number | null>(rv?.criticalMinValue ?? null),
      criticalMaxValue: this.fb.control<number | null>(rv?.criticalMaxValue ?? null),
      ageMinMonths: this.fb.control<number | null>(rv?.ageMinMonths ?? null),
      ageMaxMonths: this.fb.control<number | null>(rv?.ageMaxMonths ?? null),
      gender: this.fb.control<'MALE' | 'FEMALE' | null>(rv?.gender ?? null),
      unit: this.fb.control<string | null>(rv?.unit ?? null),
    });
  }

  protected addRefValue(det: DetForm): void {
    det.refValues.push(this.buildRefValueGroup());
  }

  protected removeRefValue(det: DetForm, index: number): void {
    det.refValues.removeAt(index);
  }

  // ── Guardado ───────────────────────────────────────────────────────────────────

  protected onSave(): void {
    if (!this.analysis || this.saving()) return;

    const calls: Array<ReturnType<NbuConfigApiService['upsertOverride']> |
      ReturnType<NbuConfigApiService['upsertReferenceValues']> |
      ReturnType<NbuConfigApiService['patchSection']>> = [];

    // Sección (solo si cambió y hay tenant_analysis para patchear).
    const sectionId = this.generalForm.controls.sectionId.value ?? null;
    if (this.tenantAnalysisId != null && sectionId !== this.originalSectionId) {
      calls.push(this.nbuConfig.patchSection(this.tenantAnalysisId, sectionId));
    }

    // Por determinación: override y/o ref-values si cambiaron.
    for (const det of this.detForms) {
      const overrideRaw = det.override.getRawValue();
      if (JSON.stringify(overrideRaw) !== det.originalOverride) {
        calls.push(this.nbuConfig.upsertOverride(det.detId, overrideRaw as Partial<DeterminationOverride>));
      }
      const refRaw = det.refValues.getRawValue();
      if (JSON.stringify(refRaw) !== det.originalRefValues) {
        calls.push(this.nbuConfig.upsertReferenceValues(det.detId, refRaw as ReferenceValueItem[]));
      }
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
