import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, merge } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { FilterBarComponent, FilterBarConfig, FilterBarValue } from '@shared/ui/components/filter-bar/filter-bar.component';
import { ReportDef, ReportFilterDef } from '../models/report.model';

export interface ReportBranchOption { id: number; name: string; }

/** ISO date (yyyy-MM-dd) de `d`, en horario local — evita corrimientos de timezone. */
function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Filtros de un reporte: compone lo universal (búsqueda + rango de fechas + sucursal,
 * comunes a los 17 reportes) con lo propio del reporte (`ReportDef.filters`).
 *
 * `ui-filter-bar` (skill laboratory-ui-table) resuelve la búsqueda y los selects
 * multi-valor (sucursal + filtros propios `type: 'select'`). No soporta rango de
 * fechas ni tipos boolean/number/text — esos se resuelven acá al lado, con los
 * mismos componentes PrimeNG que usa `ui-metric-filter-bar` para las fechas
 * (mismo look, sin reusar el componente de dashboards — regla del proyecto).
 */
@Component({
  selector: 'rpt-report-filters',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePickerModule, InputTextModule, InputNumberModule, CheckboxModule, FilterBarComponent],
  template: `
    <div class="rpt-filters">
      @if (def().dateRange) {
        <div class="rpt-filters__row">
          <div class="rpt-filters__field">
            <label for="rpt-date-from">Desde</label>
            <p-datepicker inputId="rpt-date-from" dateFormat="dd/mm/yy" appendTo="body" styleClass="w-full"
                          [showIcon]="false" [maxDate]="dateTo() ?? undefined"
                          [ngModel]="dateFrom()" (ngModelChange)="setDateFrom($event)" />
          </div>
          <div class="rpt-filters__field">
            <label for="rpt-date-to">Hasta</label>
            <p-datepicker inputId="rpt-date-to" dateFormat="dd/mm/yy" appendTo="body" styleClass="w-full"
                          [showIcon]="false" [minDate]="dateFrom() ?? undefined"
                          [ngModel]="dateTo()" (ngModelChange)="setDateTo($event)" />
          </div>
        </div>
      }

      <ui-filter-bar [config]="filterBarConfig()" [resetKey]="def().id" (valueChange)="onFilterBarChange($event)" />

      @if (extraFilters().length) {
        <div class="rpt-filters__extra">
          @for (f of extraFilters(); track f.key) {
            @if (f.type === 'boolean') {
              <label class="rpt-filters__bool">
                <p-checkbox [binary]="true" [ngModel]="booleanValues()[f.key]"
                            (ngModelChange)="onBoolChange(f.key, $event)" />
                {{ f.label }}
              </label>
            } @else if (f.type === 'number') {
              <div class="rpt-filters__field rpt-filters__field--compact">
                <label>{{ f.label }}</label>
                <p-inputNumber [ngModel]="numberValues()[f.key] ?? null" (ngModelChange)="onNumberChange(f.key, $event)" />
              </div>
            } @else if (f.type === 'text') {
              <div class="rpt-filters__field rpt-filters__field--compact">
                <label>{{ f.label }}</label>
                <input pInputText type="text" [ngModel]="textValues()[f.key]" (ngModelChange)="onTextChange(f.key, $event)" />
              </div>
            }
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .rpt-filters { display: flex; flex-direction: column; gap: var(--space-3); }
    .rpt-filters__row { display: flex; gap: var(--space-3); flex-wrap: wrap; }
    .rpt-filters__field { display: flex; flex-direction: column; gap: 5px; min-width: 150px; }
    .rpt-filters__field--compact { min-width: 130px; }
    .rpt-filters__field label { font-size: 12px; font-weight: 600; color: var(--ds-text-muted); }
    .rpt-filters__extra { display: flex; align-items: flex-end; gap: var(--space-4); flex-wrap: wrap; }
    .rpt-filters__bool { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ds-text); cursor: pointer; }
  `],
})
export class ReportFiltersComponent {
  readonly def = input.required<ReportDef>();
  readonly branchOptions = input<readonly ReportBranchOption[]>([]);
  readonly filtersChange = output<Record<string, unknown>>();

  protected readonly dateFrom = signal<Date | null>(null);
  protected readonly dateTo = signal<Date | null>(null);
  protected readonly searchValue = signal('');
  /** key → valores seleccionados (incluye 'branchId' y los filtros propios type: 'select'). */
  protected readonly selectValues = signal<Record<string, unknown[]>>({});
  protected readonly booleanValues = signal<Record<string, boolean>>({});
  protected readonly numberValues = signal<Record<string, number | null>>({});
  protected readonly textValues = signal<Record<string, string>>({});

  protected readonly selectFilters = computed<ReportFilterDef[]>(() =>
    this.def().filters.filter((f) => f.type === 'select'));

  // 'dateRange' no tiene UI propia acá — ver comentario en ReportFilterType (report.model.ts).
  protected readonly extraFilters = computed<ReportFilterDef[]>(() =>
    this.def().filters.filter((f) => f.type === 'boolean' || f.type === 'number' || f.type === 'text'));

  protected readonly filterBarConfig = computed<FilterBarConfig>(() => ({
    searchPlaceholder: 'Buscar…',
    selects: [
      ...(this.branchOptions().length
        ? [{ key: 'branchId', label: 'Sucursal', options: this.branchOptions().map((b) => ({ value: b.id, label: b.name })) }]
        : []),
      ...this.selectFilters().map((f) => ({
        key: f.key, label: f.label, options: (f.options ?? []).map((o) => ({ value: o.value, label: o.label })),
      })),
    ],
  }));

  /** Emisiones "de tecla" (search + text + number) se debouncean; selects/booleans/fechas se emiten al toque. */
  private readonly debouncedEmit$ = new Subject<void>();

  constructor() {
    // Angular reusa la instancia de ReportFiltersComponent al navegar entre reportes (mismo
    // motivo que ReportPage — ver report.page.ts). Sin este reset, los signals locales (y por
    // ende los filtros mandados al backend) arrastran valores del reporte anterior.
    effect(() => {
      this.def().id; // trackea el cambio de reporte
      untracked(() => {
        this.dateFrom.set(null);
        this.dateTo.set(null);
        this.searchValue.set('');
        this.selectValues.set({});
        this.booleanValues.set({});
        this.numberValues.set({});
        this.textValues.set({});
      });
    });

    this.debouncedEmit$.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => this.emit());
  }

  protected onFilterBarChange(value: FilterBarValue): void {
    const nextSearch = (value['search'] as string) ?? '';
    const searchChanged = nextSearch !== this.searchValue();
    this.searchValue.set(nextSearch);

    const selects: Record<string, unknown[]> = {};
    for (const key of Object.keys(value)) {
      if (key === 'search') continue;
      selects[key] = (value[key] as unknown[]) ?? [];
    }
    this.selectValues.set(selects);

    // La búsqueda es "de tecla" (un GET por letra sin esto) — el resto (selects) es discreto.
    if (searchChanged) this.debouncedEmit$.next();
    else this.emit();
  }

  protected setDateFrom(d: Date | null): void { this.dateFrom.set(d); this.emit(); }
  protected setDateTo(d: Date | null): void { this.dateTo.set(d); this.emit(); }

  protected onBoolChange(key: string, checked: boolean): void {
    this.booleanValues.update((m) => ({ ...m, [key]: checked }));
    this.emit();
  }

  protected onNumberChange(key: string, value: number | null): void {
    this.numberValues.update((m) => ({ ...m, [key]: value }));
    this.debouncedEmit$.next();
  }

  protected onTextChange(key: string, value: string): void {
    this.textValues.update((m) => ({ ...m, [key]: value }));
    this.debouncedEmit$.next();
  }

  /** Arma el bag plano de filtros (universales + propios) y lo emite completo. */
  private emit(): void {
    const filters: Record<string, unknown> = {};

    // La búsqueda de texto usa el param que declara el reporte (search | busqueda | null).
    const searchKey = this.def().searchKey === undefined ? 'search' : this.def().searchKey;
    if (searchKey && this.searchValue().trim()) filters[searchKey] = this.searchValue().trim();

    // El rango de fechas solo se emite si el reporte lo declara, con SUS nombres de param.
    const dateRange = this.def().dateRange;
    if (dateRange) {
      if (this.dateFrom()) filters[dateRange.fromKey] = toIsoDate(this.dateFrom()!);
      if (this.dateTo()) filters[dateRange.toKey] = toIsoDate(this.dateTo()!);
    }

    // Defensa en profundidad: si por lo que sea el reset de arriba no corrió a tiempo, esto
    // evita mandar al backend keys de filtros propios de OTRO reporte (ver bug de reportería).
    const ownFilterKeys = new Set(this.def().filters.map((f) => f.key));

    for (const [key, vals] of Object.entries(this.selectValues())) {
      if (vals.length && (key === 'branchId' || ownFilterKeys.has(key))) filters[key] = vals;
    }
    for (const [key, v] of Object.entries(this.booleanValues())) {
      if (v && ownFilterKeys.has(key)) filters[key] = true;
    }
    for (const [key, v] of Object.entries(this.numberValues())) {
      if (v != null && ownFilterKeys.has(key)) filters[key] = v;
    }
    for (const [key, v] of Object.entries(this.textValues())) {
      if (v.trim() && ownFilterKeys.has(key)) filters[key] = v.trim();
    }

    this.filtersChange.emit(filters);
  }
}
