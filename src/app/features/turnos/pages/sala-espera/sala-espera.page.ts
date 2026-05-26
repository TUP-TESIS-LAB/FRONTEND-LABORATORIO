import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { interval, startWith, switchMap } from 'rxjs';
import { DisplaySnapshot, PublicQueueEntry } from '../../models/public-display.model';
import { QueueStatus } from '../../models/queue-status.enum';
import { PublicDisplayService } from '../../services/public-display.service';
import { EmptyStateComponent } from './empty-state.component';
import { ClosedStateComponent } from './closed-state.component';

@Component({
  selector: 'app-sala-espera-page',
  standalone: true,
  imports: [EmptyStateComponent, ClosedStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sala-espera.page.html',
  styleUrl: './sala-espera.page.scss',
})
export class SalaEsperaPage implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(PublicDisplayService);
  private destroyRef = inject(DestroyRef);

  protected tenantSlug = this.route.snapshot.paramMap.get('tenantSlug') ?? '';
  protected branchId = Number(this.route.snapshot.paramMap.get('branchId') ?? '');

  protected snapshot = signal<DisplaySnapshot | null>(null);
  protected lastSuccessfulFetch = signal<number>(0);
  protected previousCalledId = signal<number | null>(null);

  protected readonly audioUnlocked = signal<boolean>(
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem('tv-audio-unlocked') === '1',
  );

  protected connectionLost = computed(() => {
    const last = this.lastSuccessfulFetch();
    return last > 0 && Date.now() - last > 15000;
  });

  protected calledEntry = computed<PublicQueueEntry | null>(() => {
    const entries = this.snapshot()?.entries ?? [];
    const pending = entries.filter(e => e.status === QueueStatus.PENDING && e.lastCalledAt);
    if (!pending.length) return null;
    const mostRecent = pending.reduce((a, b) =>
      new Date(a.lastCalledAt!) > new Date(b.lastCalledAt!) ? a : b,
    );
    const ageSeconds = (Date.now() - new Date(mostRecent.lastCalledAt!).getTime()) / 1000;
    return ageSeconds < 15 ? mostRecent : null;
  });

  protected upcomingEntries = computed<PublicQueueEntry[]>(() => {
    const entries = this.snapshot()?.entries ?? [];
    const called = this.calledEntry();
    return entries
      .filter(e => e.status === QueueStatus.PENDING && e.id !== called?.id && !e.lastCalledAt)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, 5);
  });

  protected viewMode = computed<'loading' | 'queue' | 'empty' | 'closed'>(() => {
    const snap = this.snapshot();
    if (!snap) return 'loading';
    if (this.isClosed(snap)) return 'closed';
    if (snap.entries.filter(e => e.status === QueueStatus.PENDING).length === 0) return 'empty';
    return 'queue';
  });

  constructor() {
    effect(() => {
      const current = this.calledEntry();
      if (current && current.id !== this.previousCalledId()) {
        this.playBeep();
        this.previousCalledId.set(current.id);
      }
    });
  }

  ngOnInit(): void {
    if (!this.tenantSlug || !this.branchId) return;
    interval(3000)
      .pipe(
        startWith(0),
        switchMap(() => this.service.fetchSnapshot(this.tenantSlug, this.branchId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: snap => {
          this.snapshot.set(snap);
          this.lastSuccessfulFetch.set(Date.now());
        },
        // network error: mantenemos último snapshot
      });
  }

  unlockAudio(): void {
    const a = new Audio('/assets/audio/beep.mp3');
    a.volume = 0;
    a.play().then(() => {
      this.audioUnlocked.set(true);
      sessionStorage.setItem('tv-audio-unlocked', '1');
    }).catch(err => {
      console.warn('[display] audio unlock failed', err);
      // even on play failure, mark as unlocked — user has interacted now,
      // so subsequent .play() calls should work in most browsers.
      this.audioUnlocked.set(true);
      sessionStorage.setItem('tv-audio-unlocked', '1');
    });
  }

  private isClosed(snap: DisplaySnapshot): boolean {
    if (!snap.openWindow) return false;
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return hhmm < snap.openWindow.startTime || hhmm > snap.openWindow.endTime;
  }

  private playBeep(): void {
    try {
      const audio = new Audio('/assets/audio/beep.mp3');
      audio.play().catch(err => console.warn('[sala-espera] beep blocked:', err));
    } catch (e) {
      console.warn('[sala-espera] beep error:', e);
    }
  }
}
