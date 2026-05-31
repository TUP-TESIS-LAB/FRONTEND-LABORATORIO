import { ChangeDetectionStrategy, Component, Input, OnInit, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { FormsModule } from '@angular/forms';

import { selectTotemConfig } from '../../../../store/sucursal.selectors';
import { loadTotemConfig, upsertTotemConfig } from '../../../../store/sucursal.actions';

@Component({
  selector: 'app-totem-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ToggleSwitch],
  templateUrl: './totem-step.component.html',
  styleUrl: './totem-step.component.scss',
})
export class TotemStepComponent implements OnInit {
  @Input({ required: true }) branchId!: number;

  private store = inject(Store);
  protected readonly totemConfig = this.store.selectSignal(selectTotemConfig);
  protected readonly enabled = computed(() => this.totemConfig()?.enabled ?? false);

  ngOnInit() {
    this.store.dispatch(loadTotemConfig({ branchId: this.branchId }));
  }

  onToggle(value: boolean) {
    this.store.dispatch(upsertTotemConfig({ branchId: this.branchId, enabled: value }));
  }
}
