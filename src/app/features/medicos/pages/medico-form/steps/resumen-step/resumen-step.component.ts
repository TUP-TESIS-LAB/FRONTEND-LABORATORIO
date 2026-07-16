import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { RegistrationType } from '../../../../models/doctor.model';

export interface DoctorSummaryView {
  firstName: string;
  lastName: string;
  tuition: string;
  registrationType: RegistrationType | null;
  specialty?: string | null;
  institution?: string | null;
  email?: string | null;
  phone?: string | null;
  street?: string | null;
  streetNumber?: string | null;
  signature?: string | null;
}

@Component({
  selector: 'med-resumen-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule],
  template: `
    <div class="max-w-2xl flex flex-col gap-5">
      <section>
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold m-0">Datos profesionales</h3>
          <p-button label="Editar" [text]="true" (onClick)="editStep.emit(0)" />
        </div>
        <dl class="grid grid-cols-2 gap-y-2 text-sm">
          <dt class="text-surface-500">Nombre</dt><dd>{{ data().firstName }} {{ data().lastName }}</dd>
          <dt class="text-surface-500">Matrícula</dt><dd>{{ data().tuition }}</dd>
          <dt class="text-surface-500">Tipo de registro</dt><dd>{{ registrationLabel() }}</dd>
          <dt class="text-surface-500">Especialidad</dt><dd>{{ data().specialty || '—' }}</dd>
          <dt class="text-surface-500">Institución</dt><dd>{{ data().institution || '—' }}</dd>
        </dl>
      </section>
      <section>
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold m-0">Contacto y dirección</h3>
          <p-button label="Editar" [text]="true" (onClick)="editStep.emit(1)" />
        </div>
        <dl class="grid grid-cols-2 gap-y-2 text-sm">
          <dt class="text-surface-500">Email</dt><dd>{{ data().email || '—' }}</dd>
          <dt class="text-surface-500">Teléfono</dt><dd>{{ data().phone || '—' }}</dd>
          <dt class="text-surface-500">Dirección</dt><dd>{{ addressLabel() }}</dd>
        </dl>
      </section>
      <section>
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold m-0">Firma</h3>
          <p-button label="Editar" [text]="true" (onClick)="editStep.emit(2)" />
        </div>
        @if (data().signature) {
          <img [src]="data().signature!" alt="Firma del médico"
               class="border rounded bg-surface-0" style="max-height: 120px;" />
        } @else {
          <span class="text-sm text-surface-400">Sin firma.</span>
        }
      </section>
    </div>
  `,
})
export class ResumenStepComponent {
  readonly data = input.required<DoctorSummaryView>();
  readonly editStep = output<number>();

  readonly addressLabel = computed(() => {
    const d = this.data();
    if (!d.street) return '—';
    return d.streetNumber ? `${d.street} ${d.streetNumber}` : d.street;
  });

  registrationLabel(): string {
    const t = this.data().registrationType;
    return t === 'NACIONAL' ? 'Nacional' : t === 'PROVINCIAL' ? 'Provincial' : '—';
  }
}
