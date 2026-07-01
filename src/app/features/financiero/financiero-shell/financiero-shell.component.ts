import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Contenedor del módulo Financiero. Ya no dibuja barra de tabs: la navegación entre
 * pantallas (Caja, Cobros, Cajas, Cuentas destino, Config fiscal) vive en el sidebar
 * como grupo expandible (gateado por rol/sección), igual que Muestras. Este shell solo
 * monta el outlet y aporta la miga "Financiero" al breadcrumb (data.breadcrumb en la ruta).
 */
@Component({
  selector: 'fin-financiero-shell',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<router-outlet />`,
})
export class FinancieroShellComponent {}
