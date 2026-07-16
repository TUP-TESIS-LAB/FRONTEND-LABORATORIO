import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { MessageModule } from 'primeng/message';

import { TotemConfigService } from '../services/totem-config.service';
import { submitTotemEntry } from '../../../store/totem/totem.actions';
import { selectTotemError, selectTotemSubmitting } from '../../../store/totem/totem.selectors';
import { TotemNumpadComponent } from './totem-numpad.component';

@Component({
  selector: 'app-totem-input-dni',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MessageModule, TotemNumpadComponent],
  templateUrl: './totem-input-dni.component.html',
  styleUrl: './totem-input-dni.component.scss',
})
export class TotemInputDniComponent {
  private readonly store = inject(Store);
  private readonly config = inject(TotemConfigService);

  readonly submitting = this.store.selectSignal(selectTotemSubmitting);
  readonly error = this.store.selectSignal(selectTotemError);

  protected readonly dni = signal('');
  protected readonly submitDisabled = computed(() => this.dni().length < 7 || this.submitting());

  appendDigit(d: number): void {
    if (this.dni().length >= 8) return;
    this.dni.update(v => v + String(d));
  }

  clear(): void {
    this.dni.update(v => v.slice(0, -1));
  }

  submit(): void {
    const branchId = this.config.branchId();
    const slug = this.config.slug();
    const normalizedDni = this.dni().replace(/\D/g, '');
    if (branchId === null || slug === null || !normalizedDni) return;
    this.store.dispatch(submitTotemEntry({ dni: normalizedDni, slug, branchId }));
  }
}
