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
import { PublicBranch, PublicDisplayService } from '../../services/public-display.service';
import { EmptyStateComponent } from './empty-state.component';
import { ClosedStateComponent } from './closed-state.component';
import { AdCarouselComponent } from './ad-carousel.component';

@Component({
  selector: 'app-sala-espera-page',
  standalone: true,
  imports: [DatePipe, DialogModule, EmptyStateComponent, ClosedStateComponent, AdCarouselComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sala-espera.page.html',
  styleUrl: './sala-espera.page.scss',
})
export class SalaEsperaPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(PublicDisplayService);
  private destroyRef = inject(DestroyRef);

  protected tenantSlug = this.route.snapshot.paramMap.get('tenantSlug') ?? '';
  protected branchId = Number(this.route.snapshot.paramMap.get('branchId') ?? '');

  protected snapshot = signal<DisplaySnapshot | null>(null);
  protected lastSuccessfulFetch = signal<number>(0);
  protected previousMostRecentCalledId = signal<number | null>(null);
  /** True una vez que el primer fetch resolvio (ok o error). Si sigue false → 'loading'. */
  protected firstAttemptDone = signal(false);

  // ── Dialog de cambio de sucursal ───────────────────────────
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

  protected viewMode = computed<'loading' | 'queue' | 'empty' | 'closed' | 'error'>(() => {
    const snap = this.snapshot();
    if (!snap) {
      // Si el primer fetch ya termino (ok o error) y no hay snapshot,
      // estamos en error persistente — mostramos UI de recuperacion.
      return this.firstAttemptDone() ? 'error' : 'loading';
    }
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
    // Polling cada 3s. switchMap cancela peticiones en vuelo cuando llega un nuevo tick.
    // catchError INSIDE switchMap convierte el error a EMPTY para que NO termine el stream
    // outer — sin esto, el primer error mata el polling y la TV no se recupera.
    // Mantenemos el último snapshot; connectionLost() se activa cuando lastSuccessfulFetch
    // queda más viejo que 15s.
    interval(3000)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.service.fetchSnapshot(this.tenantSlug, this.branchId).pipe(
            // tap solo se ejecuta en next — marca el primer intento como done en exito.
            tap(() => this.firstAttemptDone.set(true)),
            // catchError tambien marca done — sino el viewMode queda en 'loading' eterno.
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

  // ── Cambio de sucursal (UI de recuperacion) ─────────────────────
  openBranchDialog(): void {
    this.dialogOpen.set(true);
    this.dialogError.set(null);
    this.dialogLoading.set(true);
    this.service.listPublicBranches(this.tenantSlug).subscribe({
      next: branches => {
        this.branchOptions.set(branches);
        this.dialogLoading.set(false);
        if (branches.length === 0) {
          this.dialogError.set(
            `No hay sucursales registradas para el tenant "${this.tenantSlug}". Verificá la URL.`,
          );
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
    // navegacion full (reemplaza la URL) — el snapshot signal se reinicia
    // automaticamente al re-crear el componente con los nuevos params.
    this.router.navigate(['/display', this.tenantSlug, branch.id]);
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
