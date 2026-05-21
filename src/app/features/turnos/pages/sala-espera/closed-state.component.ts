import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-closed-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap">
      <h1>CERRADO</h1>
      @if (reopenTime) {
        <p>Reabrimos a las {{ reopenTime }}</p>
      }
    </div>
  `,
  styles: [`
    .wrap { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; gap: 1rem; }
    h1 { font-size: 6rem; letter-spacing: 0.2em; opacity: 0.6; }
    p { font-size: 2rem; opacity: 0.5; }
  `],
})
export class ClosedStateComponent {
  @Input() reopenTime = '';
}
