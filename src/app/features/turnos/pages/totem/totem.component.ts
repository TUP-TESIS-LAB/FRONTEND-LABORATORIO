import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TotemConfigService } from './services/totem-config.service';
import { TotemBranchSelectorComponent } from './components/totem-branch-selector.component';
import { TotemInputDniComponent } from './components/totem-input-dni.component';
import { TotemConfirmationComponent } from './components/totem-confirmation.component';
import { resetTotemView, submitTotemEntrySuccess } from '../../store/totem/totem.actions';
import { selectLastQueueNumber } from '../../store/totem/totem.selectors';

type View = 'branch-selector' | 'input-dni' | 'confirmation';

@Component({
  selector: 'app-totem',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TotemBranchSelectorComponent, TotemInputDniComponent, TotemConfirmationComponent],
  template: `
    @switch (currentView()) {
      @case ('branch-selector') {
        <app-totem-branch-selector (configured)="onConfigured($event)" />
      }
      @case ('input-dni') {
        <app-totem-input-dni />
      }
      @case ('confirmation') {
        <app-totem-confirmation (reset)="onReset()" />
      }
    }
  `,
})
export class TotemComponent {
  private readonly config = inject(TotemConfigService);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);

  private readonly forcedConfirmation = signal(false);
  private readonly lastQueueNumber = this.store.selectSignal(selectLastQueueNumber);

  readonly currentView = computed<View>(() => {
    // Show kiosk-config screen when either branchId or slug is not configured.
    if (this.config.branchId() === null || this.config.slug() === null) return 'branch-selector';
    if (this.forcedConfirmation() && this.lastQueueNumber()) return 'confirmation';
    return 'input-dni';
  });

  constructor() {
    this.actions$.pipe(
      ofType(submitTotemEntrySuccess),
      takeUntilDestroyed(),
    ).subscribe(() => this.forcedConfirmation.set(true));
  }

  onConfigured(cfg: { slug: string; branchId: number }): void {
    this.config.setSlug(cfg.slug);
    this.config.setBranchId(cfg.branchId);
  }

  onReset(): void {
    this.forcedConfirmation.set(false);
    this.store.dispatch(resetTotemView());
  }
}
