import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'ui-list-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-list-card" (click)="cardClick.emit()" [class.ui-list-card--clickable]="clickable()">
      <div class="ui-list-card__body">
        <ng-content />
      </div>
      @if (clickable()) {
        <i class="pi pi-chevron-right ui-list-card__chevron"></i>
      }
    </div>
  `,
  styles: [`
    .ui-list-card {
      display: flex; align-items: center;
      background: white; border-radius: 10px;
      padding: var(--space-4); border: 1px solid var(--ds-surface);
      gap: var(--space-3);
    }
    .ui-list-card--clickable { cursor: pointer; transition: box-shadow 150ms; }
    .ui-list-card--clickable:hover { box-shadow: 0 2px 8px rgba(0,0,0,.1); }
    .ui-list-card--clickable:active { transform: scale(0.98); }
    .ui-list-card__body { flex: 1; min-width: 0; }
    .ui-list-card__chevron { color: var(--ds-text-muted); flex-shrink: 0; }
  `],
})
export class ListCardComponent {
  readonly clickable = input(false);
  readonly cardClick = output<void>();
}
