import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, catchError, tap } from 'rxjs';
import { DialogModule } from 'primeng/dialog';
import { ExtractionDisplayService } from '../../services/extraction-display.service';
import { PublicDisplayService, PublicBranch } from '../../services/public-display.service';
import { ExtractionDisplaySnapshot } from '../../models/extraction-display.model';
import { PollingService, PollingHandle, isNotModified } from '@core/refresh';
import { AdCarouselComponent } from '../sala-espera/ad-carousel.component';

@Component({
  selector: 'app-tv-extraccion-page',
  standalone: true,
  imports: [DialogModule, AdCarouselComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tv-extraccion.page.html',
  styleUrl: './tv-extraccion.page.scss',
})
export class TvExtraccionPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly displayService = inject(ExtractionDisplayService);
  private readonly publicDisplayService = inject(PublicDisplayService);
  private readonly polling = inject(PollingService);

  protected readonly tenantSlug = this.route.snapshot.paramMap.get('tenantSlug') ?? '';
  protected readonly branchId = Number(this.route.snapshot.paramMap.get('branchId') ?? '');

  protected readonly snapshot = signal<ExtractionDisplaySnapshot | null>(null);
  protected readonly firstAttemptDone = signal(false);

  protected readonly calledEntries = computed(
    () => this.snapshot()?.entries.filter(e => e.displayStatus === 'CALLED') ?? []
  );

  protected readonly waitingEntries = computed(
    () => this.snapshot()?.entries.filter(e => e.displayStatus === 'WAITING') ?? []
  );

  protected readonly audioUnlocked = signal<boolean>(
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem('tv-audio-unlocked') === '1',
  );

  protected readonly dialogOpen = signal(false);
  protected readonly dialogLoading = signal(false);
  protected readonly dialogError = signal<string | null>(null);
  protected readonly branchOptions = signal<PublicBranch[]>([]);

  private pollingHandle: PollingHandle | null = null;

  ngOnInit(): void {
    if (!this.tenantSlug || !this.branchId) return;

    this.pollingHandle = this.polling.startPolling({
      key: 'tv-extraccion',
      intervalMs: 5000,
      poll: () =>
        this.displayService.fetchSnapshot(this.tenantSlug, this.branchId).pipe(
          tap(result => {
            this.firstAttemptDone.set(true);
            if (!isNotModified(result)) {
              this.snapshot.set(result as ExtractionDisplaySnapshot);
            }
          }),
          catchError(() => {
            this.firstAttemptDone.set(true);
            return EMPTY;
          })
        ),
    });
  }

  ngOnDestroy(): void {
    this.pollingHandle?.stop();
  }

  openBranchDialog(): void {
    this.dialogOpen.set(true);
    this.dialogError.set(null);
    this.dialogLoading.set(true);
    this.publicDisplayService.listPublicBranches(this.tenantSlug).subscribe({
      next: branches => {
        this.branchOptions.set(branches);
        this.dialogLoading.set(false);
        if (branches.length === 0) {
          this.dialogError.set(`No hay sucursales registradas para el tenant "${this.tenantSlug}".`);
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
    }).catch(() => {
      this.audioUnlocked.set(true);
      sessionStorage.setItem('tv-audio-unlocked', '1');
    });
  }
}
