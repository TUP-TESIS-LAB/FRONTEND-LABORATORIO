import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

export interface EmployeeSummaryView {
  firstName: string;
  lastName: string;
  document: string;
  registration: string | null;
  isBiochemist: boolean;
  email?: string | null;
  mobile?: string | null;
  street?: string | null;
  streetNumber?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  province?: string | null;
  userLabel?: string;
}

@Component({
  selector: 'emp-resumen-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule],
  template: `
    <div class="max-w-2xl flex flex-col gap-5">
      <section>
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-base font-semibold m-0">Datos generales</h3>
          <p-button label="Editar" [text]="true" (onClick)="editStep.emit(0)" />
        </div>
        <dl class="grid grid-cols-2 gap-y-2 text-sm">
          <dt class="text-surface-500">Nombre</dt><dd>{{ data().firstName }} {{ data().lastName }}</dd>
          <dt class="text-surface-500">Documento</dt><dd>{{ data().document }}</dd>
          <dt class="text-surface-500">Matrícula</dt><dd>{{ data().registration || '—' }}</dd>
          <dt class="text-surface-500">Bioquímico</dt><dd>{{ data().isBiochemist ? 'Sí' : 'No' }}</dd>
          <dt class="text-surface-500">Email</dt><dd>{{ data().email || '—' }}</dd>
          <dt class="text-surface-500">Celular</dt><dd>{{ data().mobile || '—' }}</dd>
          <dt class="text-surface-500">Domicilio</dt><dd>{{ addressLabel() }}</dd>
        </dl>
      </section>
      <section>
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-base font-semibold m-0">Usuario</h3>
          <p-button label="Editar" [text]="true" (onClick)="editStep.emit(1)" />
        </div>
        <p class="text-sm">{{ data().userLabel || 'Sin usuario' }}</p>
      </section>
    </div>
  `,
})
export class ResumenStepComponent {
  readonly data = input.required<EmployeeSummaryView>();
  readonly editStep = output<number>();

  readonly addressLabel = computed(() => {
    const d = this.data();
    const line1 = [d.street, d.streetNumber].filter((p) => p?.trim()).join(' ');
    const rest = [d.neighborhood, d.city, d.province].filter((p) => p?.trim()).join(', ');
    const full = [line1, rest].filter((p) => p).join(' · ');
    return full || 'Sin dirección.';
  });
}
