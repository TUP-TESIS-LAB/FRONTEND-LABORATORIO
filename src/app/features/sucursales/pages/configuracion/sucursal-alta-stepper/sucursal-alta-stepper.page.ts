import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DatosStepComponent } from './steps/datos-step.component';
import { HorariosStepComponent } from './steps/horarios-step.component';
import { ContactosStepComponent } from './steps/contactos-step.component';
import { WorkspacesStepComponent } from './steps/workspaces-step.component';
import { TotemStepComponent } from './steps/totem-step.component';
import { ConfirmarStepComponent } from './steps/confirmar-step.component';

@Component({
  selector: 'app-sucursal-alta-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StepperModule, ButtonModule, ToastModule, DatosStepComponent, HorariosStepComponent, ContactosStepComponent, WorkspacesStepComponent, TotemStepComponent, ConfirmarStepComponent],
  templateUrl: './sucursal-alta-stepper.page.html',
  styleUrl: './sucursal-alta-stepper.page.scss',
  providers: [MessageService],
})
export class SucursalAltaStepperPage {
  private router = inject(Router);
  private store = inject(Store);
  private messageService = inject(MessageService);

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
   * Llamado por DatosStepComponent cuando la sucursal se crea y devuelve su id.
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

  /** Llamado por ConfirmarStepComponent. Muestra toast y navega al detalle. */
  finish() {
    const id = this.branchId();
    if (id == null) return;
    this.messageService.add({
      severity: 'success',
      summary: 'Sucursal creada',
      detail: 'La configuración se guardó correctamente.',
    });
    this.router.navigate(['/sucursales/configuracion', id]);
  }

  /** Cancel-and-bail (botón opcional en el header). */
  cancel() {
    this.router.navigate(['/sucursales/configuracion']);
  }
}
