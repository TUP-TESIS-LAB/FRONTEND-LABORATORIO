import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NbuCatalogoTabComponent } from './nbu-catalogo-tab/nbu-catalogo-tab.component';

/**
 * Pantalla NBU (KAN-118).
 * Task 5: tab "Catálogo de análisis" con tabla expandible de determinaciones.
 */
@Component({
  selector: 'app-nbu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbuCatalogoTabComponent],
  template: `
    <div class="p-4">
      <h2 class="text-lg font-semibold mb-4">Nomenclador NBU — Catálogo de análisis</h2>
      <div class="bg-white rounded-lg shadow-sm">
        <lab-nbu-catalogo-tab />
      </div>
    </div>
  `,
})
export class NbuComponent {}
