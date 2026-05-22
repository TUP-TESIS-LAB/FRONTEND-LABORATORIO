import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { AgendaConfig } from '../models/agenda-config.model';

@Component({
  selector: 'app-agenda-branch-section',
  standalone: true,
  imports: [CommonModule, ButtonModule, TableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './agenda-branch-section.component.html',
  styleUrl: './agenda-branch-section.component.scss',
})
export class AgendaBranchSectionComponent implements OnChanges {
  @Input({ required: true }) branch!: { id: number; name: string };
  @Input() agendas: AgendaConfig[] = [];
  @Input() searchTerm = '';
  @Input() canWrite = false;

  @Output() agregar = new EventEmitter<void>();
  @Output() editar = new EventEmitter<number>();
  @Output() eliminar = new EventEmitter<{ id: number }>();

  // Recalculado en ngOnChanges porque @Input no es signal — computed() no detecta cambios.
  protected filtered: AgendaConfig[] = [];

  ngOnChanges(): void {
    const q = (this.searchTerm ?? '').trim().toLowerCase();
    if (!q) {
      this.filtered = this.agendas;
    } else {
      this.filtered = this.agendas.filter(
        a =>
          `${a.startTime}-${a.endTime}`.includes(q) ||
          (a.recurringDaysOfWeek?.toLowerCase().includes(q) ?? false),
      );
    }
  }

  protected formatDays(daysCSV: string | null): string {
    if (!daysCSV) return '—';
    const SHORT: Record<string, string> = {
      MONDAY: 'L',
      TUESDAY: 'M',
      WEDNESDAY: 'X',
      THURSDAY: 'J',
      FRIDAY: 'V',
      SATURDAY: 'S',
      SUNDAY: 'D',
    };
    return daysCSV
      .split(',')
      .map(d => SHORT[d] ?? d)
      .join(' ');
  }

  protected formatRange(a: AgendaConfig): string {
    return `${a.startTime.slice(0, 5)}–${a.endTime.slice(0, 5)}`;
  }

  protected formatVigencia(a: AgendaConfig): string {
    const from = a.validFromDate;
    if (!a.validToDate) return `desde ${from}`;
    return `${from} → ${a.validToDate}`;
  }
}
