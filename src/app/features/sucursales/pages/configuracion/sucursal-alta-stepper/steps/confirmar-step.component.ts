import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-confirmar-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule],
  templateUrl: './confirmar-step.component.html',
  styleUrl: './confirmar-step.component.scss',
})
export class ConfirmarStepComponent {
  @Output() finish = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
}
