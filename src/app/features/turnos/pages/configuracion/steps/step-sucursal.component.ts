import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-step-sucursal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="step">
      <label for="branchId">Sucursal</label>
      <p-select
        inputId="branchId"
        [options]="branches"
        optionLabel="name"
        optionValue="id"
        placeholder="Seleccioná una sucursal"
        [formControl]="$any(form.get('branchId'))"
      />
      @if (form.get('branchId')?.touched && form.get('branchId')?.invalid) {
        <small class="step__error">Seleccioná una sucursal para continuar.</small>
      }
    </div>
  `,
  styles: [`.step { display: flex; flex-direction: column; gap: .5rem; }
            .step__error { color: var(--p-red-600); }`],
})
export class StepSucursalComponent {
  @Input({ required: true }) form!: FormGroup;
  // Pendiente: cuando exista store de sucursales, inyectar el selector real
  protected branches = [
    { id: 1, name: 'CENTRAL — Sede Principal' },
    { id: 2, name: 'NORTE — Palermo' },
    { id: 3, name: 'SUR — Lomas' },
  ];
}
