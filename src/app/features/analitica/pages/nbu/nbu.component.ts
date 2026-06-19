import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { NbuCatalogoTabComponent } from './nbu-catalogo-tab/nbu-catalogo-tab.component';
import { NbuParticularTabComponent } from './nbu-particular-tab.component';
import { loadNomenclador, selectNbuVersion } from '../../store/nomenclador/nomenclador.actions';
import {
  selectNbuVersions,
  selectSelectedVersionId,
  selectNomencladorPending,
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
  imports: [NbuCatalogoTabComponent, NbuParticularTabComponent],
  template: `
    <div class="p-4">
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3">
          <i class="pi pi-book text-2xl text-[var(--brand-primary,#4f46e5)]"></i>
          <div>
            <p class="text-xs font-medium text-[var(--ds-text-muted,#71717a)] uppercase tracking-wide">Clínico</p>
            <h1 class="text-xl font-semibold text-[var(--ds-text,#18181b)]">Nomenclador NBU</h1>
          </div>
        </div>

        <!-- Selector de versión NBU -->
        <div class="flex flex-col items-end gap-1">
          <label
            for="nbu-version-select"
            class="text-xs font-medium text-[var(--ds-text-muted,#71717a)]"
          >
            Versión NBU
          </label>
          <select
            id="nbu-version-select"
            data-testid="version-select"
            class="border border-[var(--ds-border,#e4e4e7)] rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#4f46e5)]"
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

      <div class="bg-white rounded-lg shadow-sm">
        @if (tab() === 'catalogo') {
          <lab-nbu-catalogo-tab />
        } @else {
          <lab-nbu-particular-tab />
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
