import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';
import { TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { TableColumn } from '@shared/ui/models/table-column.model';
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
    RouterLink, FormsModule,
    ButtonModule, InputTextModule, SelectModule, TagModule, TooltipModule,
    DataTableComponent, UiCellDirective,
  ],
  template: `
    <div class="p-6">
      <header class="flex items-center justify-between mb-4">
        <div>
          <div class="text-xs text-surface-500">Gestión</div>
          <h1 class="text-2xl font-semibold flex items-center gap-2"><i class="pi pi-id-card"></i> Obras Sociales</h1>
        </div>
        <div class="flex items-center gap-2">
          <p-button label="Exportar" icon="pi pi-file-export" severity="secondary" [outlined]="true" [disabled]="true" pTooltip="Próximamente" />
          <a [routerLink]="['/obras-sociales', 'nueva']">
            <p-button label="Nueva obra social" icon="pi pi-plus" />
          </a>
        </div>
      </header>

      <div class="flex items-center gap-2 mb-3 flex-wrap">
        <span class="p-input-icon-left">
          <i class="pi pi-search"></i>
          <input pInputText placeholder="Buscar por nombre, sigla o código..." (input)="onSearch($any($event.target).value)" />
        </span>
        @for (opt of stateOptions; track opt.value) {
          <p-button
            [label]="opt.label"
            size="small"
            [severity]="pageRequest().state === opt.value ? 'primary' : 'secondary'"
            [outlined]="pageRequest().state !== opt.value"
            (onClick)="setState(opt.value)" />
        }
        <p-select
          [options]="typeOptions()"
          optionLabel="label"
          optionValue="value"
          [ngModel]="pageRequest().insurerType ?? null"
          (onChange)="onType($event.value)"
          placeholder="Tipo"
          styleClass="w-48" />
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

  onPage(e: TableLazyLoadEvent): void {
    const rows = e.rows ?? this.pageRequest().size;
    const page = Math.floor((e.first ?? 0) / rows);
    this.store.dispatch(setObraSocialPageRequest({ patch: { page, size: rows } }));
  }

  onView(row: { id: number }): void {
    this.router.navigate(['/obras-sociales', row.id]);
  }
}
