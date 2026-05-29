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
    const NAME_TO_ISO: Record<string, number> = {
      MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4,
      FRIDAY: 5, SATURDAY: 6, SUNDAY: 7,
    };
    const SHORT: Record<number, string> = {
      1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 7: 'D',
    };
    // Acepta tanto nombres (MONDAY...) como numeros ISO (1...7),
    // por compatibilidad con el seed V903 que guarda numeros.
    const nums = daysCSV
      .split(',')
      .map(d => {
        const trimmed = d.trim();
        const asNum = Number(trimmed);
        if (Number.isInteger(asNum) && asNum >= 1 && asNum <= 7) return asNum;
        return NAME_TO_ISO[trimmed.toUpperCase()];
      })
      .filter((n): n is number => n != null)
      .sort((a, b) => a - b);

    if (nums.length === 0) return '—';

    // Agrupar consecutivos para mostrar "L–V" en lugar de "L M X J V".
    // Threshold: 3 dias o mas hacen rango; 1-2 quedan sueltos.
    const ranges: number[][] = [];
    let current = [nums[0]];
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] === nums[i - 1] + 1) current.push(nums[i]);
      else {
        ranges.push(current);
        current = [nums[i]];
      }
    }
    ranges.push(current);

    return ranges
      .map(r => r.length >= 3
        ? `${SHORT[r[0]]}–${SHORT[r[r.length - 1]]}`
        : r.map(n => SHORT[n]).join(' '))
      .join(', ');
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
