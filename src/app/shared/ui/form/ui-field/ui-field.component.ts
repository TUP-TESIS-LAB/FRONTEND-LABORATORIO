import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FloatLabel } from 'primeng/floatlabel';
import { Message } from 'primeng/message';

@Component({
  selector: 'ui-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FloatLabel, Message],
  template: `
    <div class="ui-field">
      <p-floatlabel [variant]="variant()">
        <ng-content />
      </p-floatlabel>
      @if (error()) {
        <p-message severity="error" size="small" [text]="error()!" />
      }
    </div>
  `,
  styles: [`
    .ui-field { display: flex; flex-direction: column; gap: var(--space-1); }
  `],
})
export class UiFieldComponent {
  readonly error   = input<string | null>(null);
  readonly variant = input<'on' | 'in' | 'over'>('on');
}
