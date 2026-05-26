import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DatosStepComponent } from './steps/datos-step.component';
import { HorariosStepComponent } from './steps/horarios-step.component';

@Component({
  selector: 'app-sucursal-alta-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StepperModule, ButtonModule, ToastModule, DatosStepComponent, HorariosStepComponent],
  templateUrl: './sucursal-alta-stepper.page.html',
  styleUrl: './sucursal-alta-stepper.page.scss',
  providers: [MessageService],
})
export class SucursalAltaStepperPage {
  private router = inject(Router);
  private store = inject(Store);

  protected readonly STEPS = [
    { key: 'datos', label: 'Datos' },
    { key: 'horarios', label: 'Horarios' },
    { key: 'contactos', label: 'Contactos' },
    { key: 'workspaces', label: 'Workspaces' },
    { key: 'totem', label: 'Tótem' },
    { key: 'confirmar', label: 'Confirmar' },
  ];

  protected readonly currentStep = signal(1);
  protected readonly branchId = signal<number | null>(null);

  /**
   * Llamado por DatosStepComponent (T8) cuando la sucursal se crea y devuelve su id.
   * Habilita los steps 2-6 (que requieren branchId).
   */
  onDatosCompleted(branchId: number) {
    this.branchId.set(branchId);
    this.currentStep.set(2);
  }

  /**
   * Navegación libre entre steps. Solo permite ir a steps >= 2 si branchId ya está seteado.
   */
  goToStep(step: number) {
    if (step > 1 && this.branchId() == null) return;
    if (step < 1 || step > this.STEPS.length) return;
    this.currentStep.set(step);
  }

  /** Llamado por ConfirmarStepComponent (T13). Navega al detalle de la sucursal creada. */
  finish() {
    const id = this.branchId();
    if (id != null) {
      this.router.navigate(['/sucursales/configuracion', id]);
    }
  }

  /** Cancel-and-bail (botón opcional en el header). */
  cancel() {
    this.router.navigate(['/sucursales/configuracion']);
  }
}
