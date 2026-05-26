import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
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
  imports: [CommonModule, ButtonModule],
  templateUrl: './step-confirmar.component.html',
  styleUrl: './step-confirmar.component.scss',
})
export class StepConfirmarComponent {
  @Input({ required: true }) summary!: AgendaWizardState;
  @Input() saving = false;
  @Output() confirm = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
}
