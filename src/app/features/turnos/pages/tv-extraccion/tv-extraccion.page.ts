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
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, EMPTY, interval, startWith, switchMap, tap } from 'rxjs';
import { DialogModule } from 'primeng/dialog';
import { DisplaySnapshot, PublicQueueEntry } from '../../models/public-display.model';
import { PublicBranch } from '../../services/public-display.service';
import { EmptyStateComponent } from '../sala-espera/empty-state.component';
import { ClosedStateComponent } from '../sala-espera/closed-state.component';
import { AdCarouselComponent } from '../sala-espera/ad-carousel.component';
import { TvExtraccionMockService } from './tv-extraccion-mock.service';

@Component({
  selector: 'app-tv-extraccion-page',
  standalone: true,
  imports: [DatePipe, DialogModule, EmptyStateComponent, ClosedStateComponent, AdCarouselComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tv-extraccion.page.html',
  styleUrl: './tv-extraccion.page.scss',
})
export class TvExtraccionPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(TvExtraccionMockService);
  private destroyRef = inject(DestroyRef);

  protected tenantSlug = this.route.snapshot.paramMap.get('tenantSlug') ?? '';
  protected branchId = Number(this.route.snapshot.paramMap.get('branchId') ?? '');

  protected snapshot = signal<DisplaySnapshot | null>(null);
  protected lastSuccessfulFetch = signal<number>(0);
  protected previousMostRecentCalledId = signal<number | null>(null);
  protected firstAttemptDone = signal(false);

  protected dialogOpen = signal(false);
  protected dialogLoading = signal(false);
  protected dialogError = signal<string | null>(null);
  protected branchOptions = signal<PublicBranch[]>([]);

  protected readonly audioUnlocked = signal<boolean>(
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem('tv-audio-unlocked') === '1',
  );

  protected connectionLost = computed(() => {
    const last = this.lastSuccessfulFetch();
    return last > 0 && Date.now() - last > 15000;
  });

  protected calledEntries = computed<PublicQueueEntry[]>(() => {
    const entries = this.snapshot()?.entries ?? [];
    return entries
      .filter(e => !!e.lastCalledAt)
      .sort((a, b) => (b.lastCalledAt ?? '').localeCompare(a.lastCalledAt ?? ''));
  });

  protected viewMode = computed<'loading' | 'queue' | 'empty' | 'closed' | 'error'>(() => {
    const snap = this.snapshot();
    if (!snap) return this.firstAttemptDone() ? 'error' : 'loading';
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
        switchMap(() =>
          this.service.fetchSnapshot(this.tenantSlug, this.branchId).pipe(
            tap(() => this.firstAttemptDone.set(true)),
            catchError(() => {
              this.firstAttemptDone.set(true);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(snap => {
        this.snapshot.set(snap);
        this.lastSuccessfulFetch.set(Date.now());
      });
  }

  /** Botón debug: prepende una entry random al mock. Remover cuando el endpoint real esté integrado. */
  onSimulate(): void {
    this.service.simulateNewCall();
  }

  openBranchDialog(): void {
    this.dialogOpen.set(true);
    this.dialogError.set(null);
    this.dialogLoading.set(true);
    this.service.listPublicBranches(this.tenantSlug).subscribe({
      next: branches => {
        this.branchOptions.set(branches);
        this.dialogLoading.set(false);
        if (branches.length === 0) {
          this.dialogError.set(`No hay sucursales registradas para el tenant "${this.tenantSlug}". Verificá la URL.`);
        }
      },
      error: () => {
        this.dialogLoading.set(false);
        this.dialogError.set('No se pudo cargar la lista de sucursales. Reintentá.');
      },
    });
  }

  selectBranch(branch: PublicBranch): void {
    this.dialogOpen.set(false);
    this.router.navigate(['/display/extraccion', this.tenantSlug, branch.id]);
  }

  unlockAudio(): void {
    const a = new Audio('/assets/audio/beep-extraccion.mp3');
    a.volume = 0;
    a.play().then(() => {
      this.audioUnlocked.set(true);
      sessionStorage.setItem('tv-audio-unlocked', '1');
    }).catch(err => {
      console.warn('[tv-extraccion] audio unlock failed', err);
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
      const audio = new Audio('/assets/audio/beep-extraccion.mp3');
      audio.play().catch(err => console.warn('[tv-extraccion] beep blocked or missing asset:', err));
    } catch (e) {
      console.warn('[tv-extraccion] beep error:', e);
    }
  }
}
