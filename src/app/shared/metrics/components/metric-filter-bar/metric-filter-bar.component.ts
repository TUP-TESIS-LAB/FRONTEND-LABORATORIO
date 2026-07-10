import { ChangeDetectionStrategy, Component, OnInit, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { MetricFilter, MetricGranularity } from '../../models/metric-filter.model';

/** Sucursal accesible del usuario, para alimentar el selector. */
export interface MetricBranchOption {
  id: number;
  name: string;
}

const GRANULARITY_OPTIONS: { label: string; value: MetricGranularity }[] = [
  { label: 'Día', value: 'DAY' },
  { label: 'Semana', value: 'WEEK' },
  { label: 'Mes', value: 'MONTH' },
];

/** ISO date (yyyy-MM-dd) de `d`, en horario local — evita corrimientos de timezone. */
function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parsea un ISO date (yyyy-MM-dd) a `Date` local (medianoche). */
function fromIsoDate(iso: string): Date {
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(y, m - 1, day);
}

/** Día local (medianoche) de `d`, para comparar rangos sin la hora. */
function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Filtro común de los 3 dashboards de métricas: rango de fechas, sucursal (única — el
 * contrato `MetricFilter.branchId` es singular, no una lista) y granularidad.
 * Emite `MetricFilter` vía `filterChange` cada vez que cambia algún campo, siempre que
 * el rango sea válido (`dateFrom <= dateTo`).
 */
@Component({
  selector: 'ui-metric-filter-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePickerModule, SelectModule],
  template: `
    <div class="ui-metric-filter-bar">
      <div class="ui-metric-filter-bar__field">
        <label for="mf-from">Desde</label>
        <p-datepicker inputId="mf-from" dateFormat="dd/mm/yy" appendTo="body" styleClass="w-full"
                      [showIcon]="false" [maxDate]="to()"
                      [ngModel]="from()" (ngModelChange)="setFrom($event)" />
      </div>
      <div class="ui-metric-filter-bar__field">
        <label for="mf-to">Hasta</label>
        <p-datepicker inputId="mf-to" dateFormat="dd/mm/yy" appendTo="body" styleClass="w-full"
                      [showIcon]="false" [minDate]="from()"
                      [ngModel]="to()" (ngModelChange)="setTo($event)" />
      </div>
      <div class="ui-metric-filter-bar__field">
        <label for="mf-branch">Sucursal</label>
        <p-select inputId="mf-branch" appendTo="body" styleClass="w-full"
                  [options]="branches()" optionLabel="name" optionValue="id"
                  placeholder="Todas" [showClear]="true"
                  [ngModel]="selectedBranchId() ?? null" (ngModelChange)="setBranch($event)" />
      </div>
      <div class="ui-metric-filter-bar__field">
        <label for="mf-granularity">Granularidad</label>
        <p-select inputId="mf-granularity" appendTo="body" styleClass="w-full"
                  [options]="granularityOptions" optionLabel="label" optionValue="value"
                  [ngModel]="granularity()" (ngModelChange)="setGranularity($event)" />
      </div>
    </div>
  `,
  styles: [`
    .ui-metric-filter-bar {
      display: flex; align-items: flex-end; gap: var(--space-4, 14px); flex-wrap: wrap;
    }
    .ui-metric-filter-bar__field {
      display: flex; flex-direction: column; gap: 5px;
      min-width: 160px; flex: 1 1 160px; max-width: 240px;
    }
    .ui-metric-filter-bar__field label {
      font-size: 12px; font-weight: 600; color: var(--ds-text-muted);
    }
    .ui-metric-filter-bar__field ::ng-deep .p-datepicker,
    .ui-metric-filter-bar__field ::ng-deep .p-select { width: 100%; }
  `],
})
export class MetricFilterBarComponent implements OnInit {
  readonly branches = input<MetricBranchOption[]>([]);
  readonly initial = input<Partial<MetricFilter> | undefined>(undefined);
  readonly filterChange = output<MetricFilter>();

  protected readonly granularityOptions = GRANULARITY_OPTIONS;

  readonly from = signal<Date>(new Date());
  readonly to = signal<Date>(new Date());
  readonly selectedBranchId = signal<number | undefined>(undefined);
  readonly granularity = signal<MetricGranularity>('MONTH');

  ngOnInit(): void {
    const init = this.initial();
    if (!init) return;
    if (init.dateFrom) this.from.set(fromIsoDate(init.dateFrom));
    if (init.dateTo) this.to.set(fromIsoDate(init.dateTo));
    if (init.branchId != null) this.selectedBranchId.set(init.branchId);
    if (init.granularity) this.granularity.set(init.granularity);
  }

  protected setFrom(d: Date): void {
    this.from.set(d);
    this.emit();
  }

  protected setTo(d: Date): void {
    this.to.set(d);
    this.emit();
  }

  /** `null` = "Todas" (se limpió la selección) → `branchId` undefined. */
  protected setBranch(id: number | null): void {
    this.selectedBranchId.set(id ?? undefined);
    this.emit();
  }

  protected setGranularity(g: MetricGranularity): void {
    this.granularity.set(g);
    this.emit();
  }

  /** Emite el filtro solo si el rango es válido; un rango invertido no se propaga. */
  private emit(): void {
    if (startOfDay(this.from()) > startOfDay(this.to())) return;
    this.filterChange.emit({
      dateFrom: toIsoDate(this.from()),
      dateTo: toIsoDate(this.to()),
      branchId: this.selectedBranchId(),
      granularity: this.granularity(),
    });
  }
}
