import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { FilterBarComponent, FilterBarConfig, FilterBarValue } from '@shared/ui/components/filter-bar/filter-bar.component';
import { NbuCatalogoTabComponent } from './nbu-catalogo-tab/nbu-catalogo-tab.component';
import { NbuParticularTabComponent } from './nbu-particular-tab.component';
import { loadNomenclador, selectNbuVersion } from '../../store/nomenclador/nomenclador.actions';
import {
  selectNbuVersions,
  selectSelectedVersionId,
  selectNomencladorPending,
  selectCatalogRows,
} from '../../store/nomenclador/nomenclador.selectors';

type NbuTab = 'catalogo' | 'particular';

/**
 * Pantalla NBU (KAN-118).
 * Shell: header con eyebrow + selector de versión, tabs "Catálogo de análisis" / "Precio particular".
 * Task 5: tab "Catálogo de análisis" con tabla expandible de determinaciones.
 * Task 6: tab "Precio particular" con valor U.B. editable y override inline.
 */
@Component({
  selector: 'app-nbu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbuCatalogoTabComponent, NbuParticularTabComponent, FilterBarComponent],
  template: `
    <div class="p-4">
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div>
          <p class="text-xs font-medium text-[var(--ds-text-muted,#71717a)] uppercase tracking-wide">Clínico</p>
          <h1 class="text-xl font-semibold text-[var(--ds-text,#18181b)]">Nomenclador NBU</h1>
        </div>

        <!-- Selector de versión NBU (caja visible) -->
        <div class="flex items-center gap-2 border border-[var(--ds-border,#e4e4e7)] rounded-lg bg-white px-3 py-2 shadow-sm">
          <span class="text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-text-muted,#71717a)]">Versión</span>
          <select
            id="nbu-version-select"
            data-testid="version-select"
            class="bg-transparent text-sm font-semibold text-[var(--brand-primary,#2563eb)] cursor-pointer pr-1 focus:outline-none"
            [value]="selectedVersionId()"
            (change)="onVersionChange($event)"
          >
            @for (v of versions(); track v.id) {
              <option [value]="v.id">{{ v.label }}</option>
            }
          </select>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-4 border-b border-[var(--ds-border,#e4e4e7)]">
        <button
          type="button"
          data-testid="tab-catalogo"
          class="px-4 py-2 text-sm font-medium border-b-2 border-transparent transition-colors"
          [style.borderBottomColor]="tab() === 'catalogo' ? 'var(--brand-primary,#2563eb)' : 'transparent'"
          [style.color]="tab() === 'catalogo' ? 'var(--brand-primary,#2563eb)' : 'var(--ds-text-muted,#71717a)'"
          (click)="setTab('catalogo')"
        >
          Catálogo de análisis
        </button>
        <button
          type="button"
          data-testid="tab-particular"
          class="px-4 py-2 text-sm font-medium border-b-2 border-transparent transition-colors"
          [style.borderBottomColor]="tab() === 'particular' ? 'var(--brand-primary,#2563eb)' : 'transparent'"
          [style.color]="tab() === 'particular' ? 'var(--brand-primary,#2563eb)' : 'var(--ds-text-muted,#71717a)'"
          (click)="setTab('particular')"
        >
          Precio particular
        </button>
      </div>

      <!-- Búsqueda + filtro por familia (compartido entre tabs) -->
      <div class="mb-3">
        <ui-filter-bar [config]="filterConfig()" (valueChange)="onFilter($event)" />
      </div>

      <div class="bg-white rounded-lg shadow-sm">
        @if (tab() === 'catalogo') {
          <lab-nbu-catalogo-tab [search]="search()" [families]="families()" />
        } @else {
          <lab-nbu-particular-tab [search]="search()" [families]="families()" />
        }
      </div>
    </div>
  `,
})
export class NbuComponent implements OnInit {
  private readonly store = inject(Store);

  readonly tab = signal<NbuTab>('catalogo');

  protected readonly versions = this.store.selectSignal(selectNbuVersions);
  protected readonly selectedVersionId = this.store.selectSignal(selectSelectedVersionId);
  protected readonly pending = this.store.selectSignal(selectNomencladorPending);

  // ── Filtro compartido (búsqueda + familia) ──
  protected readonly search = signal<string>('');
  protected readonly families = signal<readonly string[]>([]);

  private readonly catalog = this.store.selectSignal(selectCatalogRows);

  /** Config del filtro: search + familias (opciones derivadas del catálogo). */
  protected readonly filterConfig = computed<FilterBarConfig>(() => {
    const familias = [...new Set(this.catalog().map(r => r.familyName).filter((f): f is string => !!f))].sort();
    return {
      searchPlaceholder: 'Buscar por nombre, código o NBU…',
      selects: [
        { key: 'family', label: 'Familia', options: familias.map(f => ({ value: f, label: f })) },
      ],
    };
  });

  protected onFilter(value: FilterBarValue): void {
    this.search.set(value.search ?? '');
    this.families.set((value['family'] as string[]) ?? []);
  }

  ngOnInit(): void {
    this.store.dispatch(loadNomenclador());
  }

  setTab(t: NbuTab): void {
    this.tab.set(t);
  }

  protected onVersionChange(event: Event): void {
    const versionId = (event.target as HTMLSelectElement).value;
    this.store.dispatch(selectNbuVersion({ versionId }));
  }
}
