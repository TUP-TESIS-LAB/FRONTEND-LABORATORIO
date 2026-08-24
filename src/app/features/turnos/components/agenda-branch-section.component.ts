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

  // KAN-310: el filtro comparaba contra el valor crudo (startTime/endTime con
  // segundos, días en inglés tipo "MONDAY,TUESDAY") en vez de contra lo que la
  // fila realmente muestra ("09:00–17:00", "Lunes a Viernes") — buscar "lunes"
  // nunca matcheaba nada. Ahora compara contra los mismos strings formateados
  // que ve el usuario en la tabla.
  ngOnChanges(): void {
    const q = (this.searchTerm ?? '').trim().toLowerCase();
    if (!q) {
      this.filtered = this.agendas;
      return;
    }
    this.filtered = this.agendas.filter(
      a =>
        this.formatRange(a).toLowerCase().includes(q) ||
        this.formatDays(a.recurringDaysOfWeek).toLowerCase().includes(q),
    );
  }

  protected formatDays(daysCSV: string | null): string {
    if (!daysCSV) return '—';
    const NAME_TO_ISO: Record<string, number> = {
      MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4,
      FRIDAY: 5, SATURDAY: 6, SUNDAY: 7,
    };
    const FULL: Record<number, string> = {
      1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves',
      5: 'Viernes', 6: 'Sábado', 7: 'Domingo',
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

    // Agrupar consecutivos para mostrar "Lunes a Viernes" en lugar de
    // "Lunes, Martes, Miércoles, Jueves, Viernes". 2+ consecutivos hacen
    // rango ("Lunes a Martes"); sueltos quedan separados por coma.
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
      .map(r => r.length >= 2
        ? `${FULL[r[0]]} a ${FULL[r[r.length - 1]]}`
        : FULL[r[0]])
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
