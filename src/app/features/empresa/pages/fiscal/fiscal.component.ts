import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-fiscal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h2>Configuración Fiscal (ARCA)</h2><p style="color:var(--ds-text-muted)">Pendiente de implementación.</p>`,
})
export class FiscalComponent {}
