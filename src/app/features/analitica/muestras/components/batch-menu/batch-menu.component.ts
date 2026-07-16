import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import type { Transition } from '../../models/transition.model';

@Component({
  selector: 'app-muestras-batch-menu',
  standalone: true,
  imports: [NgClass],
  templateUrl: './batch-menu.component.html',
  styleUrl: './batch-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchMenuComponent {
  readonly transitions = input.required<Transition[]>();
  readonly selectionCount = input<number>(0);
  readonly open = input<boolean>(false);

  readonly select = output<Transition>();
  readonly closeMenu = output<void>();
}
