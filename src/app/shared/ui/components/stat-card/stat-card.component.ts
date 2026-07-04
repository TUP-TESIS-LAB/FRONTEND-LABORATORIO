import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ui-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-stat-card" [style.border-left-color]="accentColor()">
      @if (icon()) {
        <span class="ui-stat-card__icon"><i class="pi {{ icon() }}" [style.color]="accentColor()"></i></span>
      }
      <div class="ui-stat-card__label">{{ label() }}</div>
      <div class="ui-stat-card__value">{{ value() }}</div>
      @if (sub()) {
        <div class="ui-stat-card__sub">{{ sub() }}</div>
      }
    </div>
  `,
  styles: [`
    :host { display: flex; }
    .ui-stat-card {
      position: relative;
      background: white;
      border-radius: 10px;
      padding: var(--space-4) var(--space-5);
      border-left: 4px solid var(--brand-secondary);
      box-shadow: 0 1px 3px rgba(0,0,0,.08);
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    /* Ícono opcional (PrimeIcon) centrado vertical sobre el borde derecho, en el
       color del acento. Centrado (no top-right) para que quede a la altura del
       número y las 4 cards se vean parejas. */
    .ui-stat-card__icon {
      position: absolute;
      top: 50%;
      right: var(--space-5);
      transform: translateY(-50%);
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      background: rgba(15, 23, 42, .05);
      font-size: 18px;
      line-height: 1;
    }
    .ui-stat-card__icon i { line-height: 1; display: block; }
    /* El value crece para empujar el sub al pie y todas las cards quedan
       de la misma altura aunque algunas no tengan sub. */
    .ui-stat-card__value { flex: 1; }
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
  /** PrimeIcon opcional (ej. 'pi-building') mostrado como badge del acento. */
  readonly icon        = input<string | null>(null);
}
