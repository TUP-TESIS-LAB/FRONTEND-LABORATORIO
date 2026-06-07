import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, EMPTY, tap } from 'rxjs';
import { DialogModule } from 'primeng/dialog';
import { isNotModified, PollingHandle, PollingService } from '@core/refresh';
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
export class SalaEsperaPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(PublicDisplayService);
  private readonly polling = inject(PollingService);
  private pollHandle: PollingHandle | null = null;

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
   *
   * Fallback de `boxNumber`: si el backend no lo provee (todavía no existe el campo),
   * lo derivamos del id de la entry para que la TV pueda mostrar "→ Box N" en el smoke.
   * Cuando el backend agregue `boxNumber`, ese valor toma prioridad.
   */
  protected calledEntries = computed<PublicQueueEntry[]>(() => {
    const entries = this.snapshot()?.entries ?? [];
    return entries
      .filter(e => !!e.lastCalledAt)
      .map(e => ({ ...e, boxNumber: e.boxNumber ?? ((e.id % 3) + 1) }))
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
    // Polling cada 3s usando el estándar core/refresh (ETag/304, visibility-paused).
    // isNotModified() evita sobreescribir el snapshot cuando el servidor responde 304 —
    // en ese caso los datos no cambiaron y la TV sigue mostrando el último estado correcto.
    this.pollHandle = this.polling.startPolling({
      key: `sala-espera:${this.tenantSlug}:${this.branchId}`,
      intervalMs: 3000,
      poll: () => this.service.fetchSnapshot(this.tenantSlug, this.branchId).pipe(
        tap((res) => {
          this.firstAttemptDone.set(true);
          if (!isNotModified(res)) {
            this.snapshot.set(res);
            this.lastSuccessfulFetch.set(Date.now());
          }
        }),
        catchError(() => { this.firstAttemptDone.set(true); return EMPTY; }),
      ),
    });
  }

  ngOnDestroy(): void {
    this.pollHandle?.stop();
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
