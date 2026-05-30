import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { RegistrationType } from '../../../../models/doctor.model';

export interface DoctorSummaryView {
  firstName: string;
  lastName: string;
  tuition: string;
  registrationType: RegistrationType | null;
}

@Component({
  selector: 'med-resumen-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule],
  template: `
    <div class="max-w-2xl">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-base font-semibold m-0">Datos del médico</h3>
        <p-button label="Editar" icon="pi pi-pencil" [text]="true" (onClick)="editStep.emit(0)" />
      </div>
      <dl class="grid grid-cols-2 gap-y-2 text-sm">
        <dt class="text-surface-500">Nombre</dt><dd>{{ data().firstName }} {{ data().lastName }}</dd>
        <dt class="text-surface-500">Matrícula</dt><dd>{{ data().tuition }}</dd>
        <dt class="text-surface-500">Tipo de registro</dt><dd>{{ registrationLabel() }}</dd>
      </dl>
    </div>
  `,
})
export class ResumenStepComponent {
  readonly data = input.required<DoctorSummaryView>();
  readonly editStep = output<number>();

  registrationLabel(): string {
    const t = this.data().registrationType;
    return t === 'NACIONAL' ? 'Nacional' : t === 'PROVINCIAL' ? 'Provincial' : '—';
  }
}
