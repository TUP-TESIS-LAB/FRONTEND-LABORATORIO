import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { FormsModule } from '@angular/forms';

import { TotemConfigService } from '../services/totem-config.service';
import { submitTotemEntry } from '../../../store/totem/totem.actions';
import { selectTotemError, selectTotemSubmitting } from '../../../store/totem/totem.selectors';

@Component({
  selector: 'app-totem-input-dni',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InputTextModule, ButtonModule, MessageModule, FormsModule],
  templateUrl: './totem-input-dni.component.html',
  styleUrl: './totem-input-dni.component.scss',
})
export class TotemInputDniComponent {
  private readonly store = inject(Store);
  private readonly config = inject(TotemConfigService);

  readonly submitting = this.store.selectSignal(selectTotemSubmitting);
  readonly error = this.store.selectSignal(selectTotemError);

  dni = '';

  submit(): void {
    const branchId = this.config.branchId();
    if (branchId === null || !this.dni.trim()) return;
    this.store.dispatch(submitTotemEntry({ dni: this.dni.trim(), branchId }));
  }
}
