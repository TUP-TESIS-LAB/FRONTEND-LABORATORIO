import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'pat-patient-form-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonModule],
  template: `
    <div class="flex flex-col h-full">
      <header class="flex items-center gap-3 px-6 py-3 bg-surface-0 border-b sticky top-0 z-10">
        <p-button [text]="true" icon="pi pi-arrow-left" label="Volver" (onClick)="onBack()" />
        <h1 class="text-base font-semibold m-0">
          {{ isEdit() ? 'Editar paciente' : 'Nuevo paciente' }}
        </h1>
        <nav class="ml-auto text-xs text-surface-500">
          Pacientes › {{ isEdit() ? 'Editar' : 'Nuevo' }}
        </nav>
      </header>

      <div class="flex-1 overflow-y-auto p-6">
        <p>Form placeholder — viene en la próxima task.</p>
      </div>
    </div>
  `,
})
export class PatientFormPage {
  readonly id = input<string | undefined>(undefined);

  private readonly router = inject(Router);

  readonly isEdit = computed(() => this.id() != null && this.id() !== '');

  onBack(): void {
    this.router.navigate(['/pacientes']);
  }
}
