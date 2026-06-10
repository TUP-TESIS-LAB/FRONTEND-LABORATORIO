import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';
import { TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { TableColumn } from '@shared/ui/models/table-column.model';
import { FilterBarComponent, FilterBarConfig, FilterBarValue } from '@shared/ui/components/filter-bar/filter-bar.component';
import { InsurerStateFilter } from '../../models/obra-social-page.model';
import { InsurerTypeCode } from '../../models/insurer.model';
import { setObraSocialPageRequest, loadObraSocialCatalogs } from '../../store/obra-social.actions';
import {
  selectObraSocialItems, selectObraSocialPending, selectObraSocialPageRequest,
  selectObraSocialTotalElements, selectObraSocialInsurerTypes,
} from '../../store/obra-social.selectors';

interface TypeOption { label: string; value: InsurerTypeCode | null; }

@Component({
  selector: 'os-obras-sociales-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ButtonModule, TagModule, TooltipModule,
    DataTableComponent, UiCellDirective, FilterBarComponent,
  ],
  template: `
    <div class="p-6">
      <header class="flex items-center justify-between mb-4">
        <h2 class="page-title"><i class="pi pi-id-card page-title-icon" aria-hidden="true"></i> Obras Sociales</h2>
        <div class="flex items-center gap-2">
          <p-button label="Exportar" icon="pi pi-file-export" severity="secondary" [outlined]="true" [disabled]="true" pTooltip="Próximamente" />
          <a [routerLink]="['/obras-sociales', 'nueva']">
            <p-button label="Nueva obra social" icon="pi pi-plus" />
          </a>
        </div>
      </header>

      <div class="mb-3">
        <ui-filter-bar [config]="filterConfig()" (valueChange)="onFilterChange($event)" />
      </div>

      <ui-table
        [value]="items()"
        [loading]="pending()"
        [columns]="columns"
        [lazy]="true"
        [paginator]="true"
        [rows]="pageRequest().size"
        [totalRecords]="total()"
        [first]="pageRequest().page * pageRequest().size"
        [showView]="true"
        emptyHeading="Sin obras sociales"
        emptyIcon="pi-id-card"
        emptyCtaLabel="Nueva obra social"
        (lazyLoad)="onPage($event)"
        (view)="onView($any($event))"
        (emptyCtaClick)="router.navigate(['/obras-sociales', 'nueva'])">

        <ng-template uiCell="active" let-row>
          @if ($any(row).active) {
            <p-tag severity="success" value="Activa" />
          } @else {
            <p-tag severity="danger" value="Inactiva" />
          }
        </ng-template>
      </ui-table>
    </div>
  `,
})
export class ObrasSocialesListPage implements OnInit {
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();
  protected readonly router = inject(Router);

  readonly items = this.store.selectSignal(selectObraSocialItems);
  readonly pending = this.store.selectSignal(selectObraSocialPending);
  readonly total = this.store.selectSignal(selectObraSocialTotalElements);
  readonly pageRequest = this.store.selectSignal(selectObraSocialPageRequest);
  private readonly insurerTypes = this.store.selectSignal(selectObraSocialInsurerTypes);

  readonly columns: readonly TableColumn[] = [
    { field: 'code',           header: 'Código' },
    { field: 'acronym',        header: 'Sigla' },
    { field: 'name',           header: 'Nombre' },
    { field: 'insurerTypeName',header: 'Tipo' },
    { field: 'active',         header: 'Estado' },
  ];

  readonly stateOptions: { value: InsurerStateFilter; label: string }[] = [
    { value: 'active', label: 'Activas' },
    { value: 'inactive', label: 'Inactivas' },
    { value: 'all', label: 'Todas' },
  ];

  readonly typeOptions = computed<TypeOption[]>(() => [
    { label: 'Todos los tipos', value: null },
    ...this.insurerTypes().map((t) => ({ label: t.description, value: t.name })),
  ]);

  // FilterBar estándar: estado single-value (activa/inactiva; sin selección = todas) y
  // tipo single-value desde el catálogo dinámico. Computed porque los tipos vienen del
  // store. Las options de tipo no incluyen "Todos" — la ausencia de selección ya es eso.
  readonly filterConfig = computed<FilterBarConfig>(() => ({
    searchPlaceholder: 'Buscar por nombre, sigla o código…',
    selects: [
      {
        key: 'state',
        label: 'Estado',
        options: [
          { value: 'active', label: 'Activas' },
          { value: 'inactive', label: 'Inactivas' },
        ],
      },
      {
        key: 'insurerType',
        label: 'Tipo',
        options: this.insurerTypes().map((t) => ({ value: t.name, label: t.description })),
      },
    ],
  }));

  ngOnInit(): void {
    this.store.dispatch(loadObraSocialCatalogs());
    this.search$.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe((q) =>
      this.store.dispatch(setObraSocialPageRequest({ patch: { q, page: 0 } })),
    );
  }

  onSearch(q: string): void { this.search$.next(q); }

  setState(state: InsurerStateFilter): void {
    this.store.dispatch(setObraSocialPageRequest({ patch: { state, page: 0 } }));
  }

  onType(value: InsurerTypeCode | null): void {
    this.store.dispatch(setObraSocialPageRequest({ patch: { insurerType: value ?? undefined, page: 0 } }));
  }

  /**
   * Cableo del FilterBar estándar. El texto pasa por el debounce de search$; estado y
   * tipo son single-value mapeados desde los arrays del filter-bar (sin selección =
   * 'all' / sin tipo) y se despachan ya. Resetea page a 0.
   */
  onFilterChange(value: FilterBarValue): void {
    this.search$.next((value['search'] as string) ?? '');

    const states = (value['state'] as InsurerStateFilter[]) ?? [];
    const state: InsurerStateFilter = states.length ? states[states.length - 1] : 'all';

    const types = (value['insurerType'] as InsurerTypeCode[]) ?? [];
    const insurerType: InsurerTypeCode | undefined = types.length ? types[types.length - 1] : undefined;

    if (state !== this.pageRequest().state || insurerType !== this.pageRequest().insurerType) {
      this.store.dispatch(setObraSocialPageRequest({ patch: { state, insurerType, page: 0 } }));
    }
  }

  onPage(e: TableLazyLoadEvent): void {
    const rows = e.rows ?? this.pageRequest().size;
    const page = Math.floor((e.first ?? 0) / rows);
    this.store.dispatch(setObraSocialPageRequest({ patch: { page, size: rows } }));
  }

  onView(row: { id: number }): void {
    this.router.navigate(['/obras-sociales', row.id]);
  }
}
