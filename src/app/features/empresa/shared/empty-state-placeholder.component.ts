import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'emp-empty-placeholder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-empty-state">
      <i [class]="icon"></i>
      <h4>{{ title }}</h4>
      <p>{{ description }}</p>
    </div>
  `,
  styles: [`
    .ui-empty-state {
      display: flex; flex-direction: column; align-items: center;
      gap: var(--space-3); padding: var(--space-12) var(--space-4);
      color: var(--ds-text-muted); text-align: center;
    }
    .ui-empty-state i { font-size: 56px; color: var(--ds-text-muted); }
    .ui-empty-state h4 { margin: 0; color: var(--ds-text); }
    .ui-empty-state p { max-width: 360px; margin: 0; }
  `],
})
export class EmptyStatePlaceholderComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) description!: string;
  @Input() icon = 'pi pi-clock';
}
