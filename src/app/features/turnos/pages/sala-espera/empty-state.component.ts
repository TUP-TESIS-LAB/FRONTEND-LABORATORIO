import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap">
      <h1>Esperando pacientes</h1>
      <div class="meta">
        <span class="time">{{ serverTime }} hs</span>
        <span class="branch">{{ branchName }}</span>
      </div>
    </div>
  `,
  styles: [`
    .wrap { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; gap: 2rem; }
    h1 { font-size: 4rem; opacity: 0.7; }
    .meta { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; opacity: 0.5; font-size: 1.5rem; }
  `],
})
export class EmptyStateComponent {
  @Input() serverTime = '';
  @Input() branchName = '';
}
