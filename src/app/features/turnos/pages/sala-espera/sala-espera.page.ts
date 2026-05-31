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
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { interval, startWith, switchMap } from 'rxjs';
import { DisplaySnapshot, PublicQueueEntry } from '../../models/public-display.model';
import { PublicDisplayService } from '../../services/public-display.service';
import { EmptyStateComponent } from './empty-state.component';
import { ClosedStateComponent } from './closed-state.component';
import { AdCarouselComponent } from './ad-carousel.component';

@Component({
  selector: 'app-sala-espera-page',
  standalone: true,
  imports: [DatePipe, EmptyStateComponent, ClosedStateComponent, AdCarouselComponent],
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
  protected previousMostRecentCalledId = signal<number | null>(null);

  protected readonly audioUnlocked = signal<boolean>(
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem('tv-audio-unlocked') === '1',
  );

  protected connectionLost = computed(() => {
    const last = this.lastSuccessfulFetch();
    return last > 0 && Date.now() - last > 15000;
  });

  /**
   * Últimos llamados del día: entries con lastCalledAt no nulo, ordenados desc por hora de llamado.
   * El backend ya devuelve sólo los que tienen callCount > 0 y lastCalledAt hoy (máx 10).
   */
  protected calledEntries = computed<PublicQueueEntry[]>(() => {
    const entries = this.snapshot()?.entries ?? [];
    return entries
      .filter(e => !!e.lastCalledAt)
      .sort((a, b) => (b.lastCalledAt ?? '').localeCompare(a.lastCalledAt ?? ''));
  });

  protected viewMode = computed<'loading' | 'queue' | 'empty' | 'closed'>(() => {
    const snap = this.snapshot();
    if (!snap) return 'loading';
    if (this.isClosed(snap)) return 'closed';
    if ((snap.entries ?? []).length === 0) return 'empty';
    return 'queue';
  });

  constructor() {
    effect(() => {
      const list = this.calledEntries();
      const mostRecent = list[0] ?? null;
      if (mostRecent && mostRecent.id !== this.previousMostRecentCalledId()) {
        this.playBeep();
        this.previousMostRecentCalledId.set(mostRecent.id);
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
