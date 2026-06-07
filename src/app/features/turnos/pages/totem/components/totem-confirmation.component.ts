import { ChangeDetectionStrategy, Component, EventEmitter, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { forkJoin } from 'rxjs';
import { selectLastQueueNumber } from '../../../store/totem/totem.selectors';
import { TotemTicketPdfService } from '../services/totem-ticket-pdf.service';
import { PublicTenantBrandingService } from '../../../services/public-tenant-branding.service';
import { PublicDisplayService } from '../../../services/public-display.service';
import { TotemConfigService } from '../services/totem-config.service';

@Component({
  selector: 'app-totem-confirmation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './totem-confirmation.component.html',
  styleUrl: './totem-confirmation.component.scss',
})
export class TotemConfirmationComponent implements OnInit, OnDestroy {
  @Output() reset = new EventEmitter<void>();

  private readonly store = inject(Store);
  private readonly pdf = inject(TotemTicketPdfService);
  private readonly branding = inject(PublicTenantBrandingService);
  private readonly publicDisplay = inject(PublicDisplayService);
  private readonly config = inject(TotemConfigService);
  private readonly datePipe = new DatePipe('en-US');

  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly queueNumber = this.store.selectSignal(selectLastQueueNumber);

  ngOnInit(): void {
    this.timeoutId = setTimeout(() => this.reset.emit(), 10_000);
    this.printTicketOnce();
  }

  ngOnDestroy(): void {
    if (this.timeoutId !== null) clearTimeout(this.timeoutId);
  }

  private printTicketOnce(): void {
    const slug = this.config.slug();
    const branchId = this.config.branchId();
    const callNumber = this.queueNumber();
    if (!slug || !branchId || !callNumber) return;

    forkJoin({
      wl: this.branding.getWhiteLabel(slug),
      branches: this.publicDisplay.listPublicBranches(slug),
    }).subscribe(({ wl, branches }) => {
      const branch = branches.find(b => b.id === branchId);
      this.pdf.printTicket({
        labName: wl.systemName,
        branchName: branch?.description ?? '',
        dateTime: this.datePipe.transform(new Date(), 'dd/MM/yyyy HH:mm') ?? '',
        callNumber,
      });
    });
  }
}
