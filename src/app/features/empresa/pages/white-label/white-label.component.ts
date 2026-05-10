import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-white-label',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h2>White Label</h2><p style="color:var(--ds-text-muted)">Configuración de identidad visual del tenant.</p>`,
})
export class WhiteLabelComponent {}
