import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from 'primeng/button';

@Component({
  selector: 'ui-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  template: `
    <div class="ui-empty-state">
      <i [class]="'pi ' + icon()" class="ui-empty-state__icon"></i>
      <h4>{{ heading() }}</h4>
      @if (description()) {
        <p>{{ description() }}</p>
      }
      @if (ctaLabel()) {
        <p-button [label]="ctaLabel()!" severity="primary" (onClick)="ctaClick.emit()" />
      }
    </div>
  `,
  styles: [`
    .ui-empty-state {
      display: flex; flex-direction: column; align-items: center;
      gap: var(--space-3); padding: var(--space-12) var(--space-6);
      text-align: center;
    }
    .ui-empty-state__icon { font-size: 48px; color: var(--ds-text-muted); }
    h4 { margin: 0; color: var(--ds-text); }
    p  { margin: 0; color: var(--ds-text-muted); max-width: 320px; font-size: 14px; }
  `],
})
export class EmptyStateComponent {
  readonly icon        = input<string>('pi-inbox');
  readonly heading     = input.required<string>();
  readonly description = input<string | null>(null);
  readonly ctaLabel    = input<string | null>(null);
  readonly ctaClick    = output<void>();
}
