import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from 'primeng/button';
import { ExportFormat } from '../models/report.model';

/** Los tres botones de export, idénticos para los 17 reportes. */
@Component({
  selector: 'rpt-export-buttons',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  template: `
    <div class="rpt-export">
      <p-button
        label="CSV" icon="pi pi-file" size="small" severity="secondary" [outlined]="true"
        [loading]="exporting()" [disabled]="exporting()"
        (onClick)="exportFormat.emit('csv')" />
      <p-button
        label="Excel" icon="pi pi-file-excel" size="small" severity="secondary" [outlined]="true"
        [loading]="exporting()" [disabled]="exporting()"
        (onClick)="exportFormat.emit('xlsx')" />
      <p-button
        label="PDF" icon="pi pi-file-pdf" size="small" severity="secondary" [outlined]="true"
        [loading]="exporting()" [disabled]="exporting()"
        (onClick)="exportFormat.emit('pdf')" />
    </div>
  `,
  styles: [`
    .rpt-export { display: flex; gap: var(--space-2); }
  `],
})
export class ReportExportButtonsComponent {
  readonly exporting = input<boolean>(false);
  readonly exportFormat = output<ExportFormat>();
}
