import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SCREENS } from '../../data/state-machine.config';
import { MockSamplesService } from '../../services/mock-samples.service';
import type { ScreenConfig, ScreenKey } from '../../models/transition.model';

@Component({
  selector: 'app-muestras-worklist',
  standalone: true,
  templateUrl: './worklist.page.html',
  styleUrl: './worklist.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorklistPage {
  private readonly route = inject(ActivatedRoute);
  private readonly samples = inject(MockSamplesService);

  readonly config = computed<ScreenConfig>(() => {
    const key = this.route.snapshot.data['screenKey'] as ScreenKey;
    return SCREENS[key];
  });

  readonly rows = computed(() => this.samples.byState(this.config().source)());
  readonly total = computed(() => this.rows().length);
  readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  readonly selectedCount = computed(() => this.selectedIds().size);
}
