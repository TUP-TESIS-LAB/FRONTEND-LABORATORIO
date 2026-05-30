import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { EmployeeContactInput } from '../../../../models/employee.model';

export interface EmployeeSummaryView {
  firstName: string;
  lastName: string;
  document: string;
  registration: string | null;
  isBiochemist: boolean;
  contacts: EmployeeContactInput[];
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
          <h3 class="text-base font-semibold m-0">Datos del empleado</h3>
          <p-button label="Editar" icon="pi pi-pencil" [text]="true" (onClick)="editStep.emit(0)" />
        </div>
        <dl class="grid grid-cols-2 gap-y-2 text-sm">
          <dt class="text-surface-500">Nombre</dt><dd>{{ data().firstName }} {{ data().lastName }}</dd>
          <dt class="text-surface-500">Documento</dt><dd>{{ data().document }}</dd>
          <dt class="text-surface-500">Matrícula</dt><dd>{{ data().registration || '—' }}</dd>
          <dt class="text-surface-500">Bioquímico</dt><dd>{{ data().isBiochemist ? 'Sí' : 'No' }}</dd>
        </dl>
      </section>
      <section>
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-base font-semibold m-0">Contactos</h3>
          <p-button label="Editar" icon="pi pi-pencil" [text]="true" (onClick)="editStep.emit(1)" />
        </div>
        @if (data().contacts.length === 0) {
          <p class="text-surface-500 text-sm">Sin contactos.</p>
        } @else {
          <ul class="text-sm list-disc pl-5">
            @for (c of data().contacts; track $index) {
              <li>{{ typeLabel(c.contactType) }}: {{ c.value }}</li>
            }
          </ul>
        }
      </section>
    </div>
  `,
})
export class ResumenStepComponent {
  readonly data = input.required<EmployeeSummaryView>();
  readonly editStep = output<number>();

  typeLabel(t: string): string {
    const map: Record<string, string> = {
      EMAIL: 'Email', PHONE: 'Teléfono', MOBILE: 'Celular', WHATSAPP: 'WhatsApp', FAX: 'Fax', WEBSITE: 'Sitio web',
    };
    return map[t] ?? t;
  }
}
