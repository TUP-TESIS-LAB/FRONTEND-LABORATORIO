import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-muestras-scan-bar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './scan-bar.component.html',
  styleUrl: './scan-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScanBarComponent {
  readonly query = input<string>('');
  readonly selectionCount = input<number>(0);

  readonly queryChange = output<string>();
  readonly enterPressed = output<string>();
  readonly simulate = output<void>();
  readonly clear = output<void>();
  readonly openMenu = output<void>();

  readonly hasSelection = computed(() => this.selectionCount() > 0);

  onInput(value: string): void { this.queryChange.emit(value); }
  onEnter(value: string): void { this.enterPressed.emit(value); }
}
