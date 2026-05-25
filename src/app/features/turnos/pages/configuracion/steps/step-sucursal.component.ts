import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { SelectModule } from 'primeng/select';
import { SucursalesService } from '../../../../sucursales/services/sucursales.service';

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
        [options]="branches()"
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

  private readonly sucursalesSvc = inject(SucursalesService);

  // Trae las branches reales del tenant del JWT vía
  // GET /api/v1/sucursales/branches. Mientras el endpoint responde, la lista
  // queda en [] y el p-select muestra el placeholder. La regla de validación
  // del FormControl ya cubre el "no seleccionar nada".
  protected readonly branches = toSignal(
    this.sucursalesSvc.listBranchesForSelector(),
    { initialValue: [] as { id: number; name: string }[] },
  );
}
