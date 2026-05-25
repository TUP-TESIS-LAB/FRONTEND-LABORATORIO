import { ChangeDetectionStrategy, Component, EventEmitter, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectLastPatientName, selectLastQueueNumber } from '../../../store/totem/totem.selectors';

@Component({
  selector: 'app-totem-confirmation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './totem-confirmation.component.html',
  styleUrl: './totem-confirmation.component.scss',
})
export class TotemConfirmationComponent implements OnInit, OnDestroy {
  @Output() reset = new EventEmitter<void>();

  private readonly store = inject(Store);
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly queueNumber = this.store.selectSignal(selectLastQueueNumber);
  readonly patientName = this.store.selectSignal(selectLastPatientName);

  ngOnInit(): void {
    this.timeoutId = setTimeout(() => this.reset.emit(), 10_000);
  }

  ngOnDestroy(): void {
    if (this.timeoutId !== null) clearTimeout(this.timeoutId);
  }
}
