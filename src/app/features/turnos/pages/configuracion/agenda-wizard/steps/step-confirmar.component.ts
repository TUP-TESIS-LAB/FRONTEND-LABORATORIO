import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HorarioFormValue } from './step-horario.component';
import { PeriodoFormValue } from './step-periodo.component';

export interface AgendaWizardState {
  branchName: string;
  horario: HorarioFormValue;
  periodo: PeriodoFormValue;
}

@Component({
  selector: 'app-step-confirmar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './step-confirmar.component.html',
  styleUrl: './step-confirmar.component.scss',
})
export class StepConfirmarComponent {
  @Input({ required: true }) summary!: AgendaWizardState;
  @Input() saving = false;

  protected readonly DAY_LABELS: Record<number, string> = {
    1: 'Lun',
    2: 'Mar',
    3: 'Mié',
    4: 'Jue',
    5: 'Vie',
    6: 'Sáb',
    7: 'Dom',
  };

  protected formatDays(days: number[]): string {
    return days.map(d => this.DAY_LABELS[d] ?? '?').join(', ');
  }
}
