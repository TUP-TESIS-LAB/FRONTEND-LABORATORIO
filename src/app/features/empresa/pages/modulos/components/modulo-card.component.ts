import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tag } from 'primeng/tag';
import { ToggleSwitch } from 'primeng/toggleswitch';

import { ModuloMeta } from '../../../models/modulo.model';

@Component({
  selector: 'emp-modulo-card',
  standalone: true,
  imports: [FormsModule, ToggleSwitch, Tag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-card emp-modulo-card">
      <div class="emp-modulo-card__icon"><i [class]="meta.icon"></i></div>
      <div class="emp-modulo-card__body">
        <div class="emp-modulo-card__title">
          <h4>{{ meta.label }}</h4>
          <p-tag
            [value]="enabled ? 'Activo' : 'Inactivo'"
            [severity]="enabled ? 'success' : 'secondary'" />
        </div>
        <p>{{ meta.description }}</p>
      </div>
      <p-toggleswitch
        [ngModel]="enabled"
        [disabled]="disabled"
        (onChange)="toggle.emit($event.checked)" />
    </div>
  `,
  styles: [`
    .emp-modulo-card { display: flex; align-items: center; gap: var(--space-4);
      padding: var(--space-4); margin-bottom: var(--space-3);
      background: var(--ds-surface); border-radius: 8px; }
    .emp-modulo-card__icon i { font-size: 28px; color: var(--brand-primary); }
    .emp-modulo-card__body { flex: 1; min-width: 0; }
    .emp-modulo-card__body p { margin: var(--space-1) 0 0; color: var(--ds-text-muted); }
    .emp-modulo-card__title { display: flex; align-items: center; gap: var(--space-2); }
    .emp-modulo-card__title h4 { margin: 0; }
  `],
})
export class ModuloCardComponent {
  @Input({ required: true }) meta!: ModuloMeta;
  @Input({ required: true }) enabled!: boolean;
  @Input() disabled = false;
  @Output() toggle = new EventEmitter<boolean>();
}
