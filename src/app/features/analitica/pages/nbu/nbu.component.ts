import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NbuCatalogoTabComponent } from './nbu-catalogo-tab/nbu-catalogo-tab.component';
import { NbuParticularTabComponent } from './nbu-particular-tab.component';

type NbuTab = 'catalogo' | 'particular';

/**
 * Pantalla NBU (KAN-118).
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
      <h2 class="text-lg font-semibold mb-2">Nomenclador NBU</h2>

      <!-- Tabs -->
      <div class="flex gap-1 mb-4 border-b border-[var(--ds-border,#e4e4e7)]">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
          [class.border-[var(--brand-primary,#4f46e5)]]="tab() === 'catalogo'"
          [class.text-[var(--brand-primary,#4f46e5)]]="tab() === 'catalogo'"
          [class.border-transparent]="tab() !== 'catalogo'"
          [class.text-[var(--ds-text-muted,#71717a)]]="tab() !== 'catalogo'"
          (click)="setTab('catalogo')"
        >
          Catálogo de análisis
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
          [class.border-[var(--brand-primary,#4f46e5)]]="tab() === 'particular'"
          [class.text-[var(--brand-primary,#4f46e5)]]="tab() === 'particular'"
          [class.border-transparent]="tab() !== 'particular'"
          [class.text-[var(--ds-text-muted,#71717a)]]="tab() !== 'particular'"
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
export class NbuComponent {
  readonly tab = signal<NbuTab>('catalogo');

  setTab(t: NbuTab): void {
    this.tab.set(t);
  }
}
