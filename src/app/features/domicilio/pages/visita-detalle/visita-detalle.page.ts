import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';

/**
 * Placeholder — Task 8 implementará el detalle completo de la visita.
 * Esta clase mínima existe únicamente para que el build y las rutas de
 * domicilio.routes.ts compilen sin errores mientras la Task 8 no está lista.
 */
@Component({
  selector: 'dom-visita-detalle-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent],
  template: `
    <ui-page-header heading="Detalle de visita" subtitle="Cargando información de la visita..." />
    <p style="padding: 1rem; color: var(--ds-text-muted);">
      Esta pantalla se implementa en la Tarea 8.
    </p>
  `,
})
export class VisitaDetallePage {}
