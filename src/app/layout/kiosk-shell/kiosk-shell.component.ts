import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-kiosk-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `<div class="kiosk-shell"><router-outlet /></div>`,
  styles: [`
    :host { display: block; height: 100vh; background: var(--ds-surface-2, #f6f7fa); }
    .kiosk-shell { width: 100%; height: 100%; }
  `],
})
export class KioskShellComponent {}
