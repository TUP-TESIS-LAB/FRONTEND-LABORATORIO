import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ui-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-stat-card" [style.border-left-color]="accentColor()">
      <div class="ui-stat-card__label">{{ label() }}</div>
      <div class="ui-stat-card__value">{{ value() }}</div>
      @if (sub()) {
        <div class="ui-stat-card__sub">{{ sub() }}</div>
      }
    </div>
  `,
  styles: [`
    .ui-stat-card {
      background: white;
      border-radius: 10px;
      padding: var(--space-4) var(--space-5);
      border-left: 4px solid var(--brand-secondary);
      box-shadow: 0 1px 3px rgba(0,0,0,.08);
    }
    .ui-stat-card__label { font-size: 12px; color: var(--ds-text-muted); text-transform: uppercase; letter-spacing: .5px; margin-bottom: var(--space-1); }
    .ui-stat-card__value { font-size: 28px; font-weight: 700; color: var(--ds-text); }
    .ui-stat-card__sub   { font-size: 12px; color: var(--ds-text-muted); margin-top: var(--space-1); }
  `],
})
export class StatCardComponent {
  readonly label       = input.required<string>();
  readonly value       = input.required<string | number>();
  readonly sub         = input<string | null>(null);
  readonly accentColor = input<string>('var(--brand-secondary)');
}
