import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { FormStepperHeaderComponent } from '@shared/ui/components/form-stepper-header/form-stepper-header.component';
import { DatosStepComponent } from './steps/datos-step.component';
import { HorariosStepComponent } from './steps/horarios-step.component';
import { ContactosStepComponent } from './steps/contactos-step.component';
import { WorkspacesStepComponent } from './steps/workspaces-step.component';
import { TotemStepComponent } from './steps/totem-step.component';
import { ConfirmarStepComponent } from './steps/confirmar-step.component';
import { SUCURSAL_FORM_STEPS } from './sucursal-alta-stepper.steps';

@Component({
  selector: 'app-sucursal-alta-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonModule,
    ToastModule,
    FormStepperHeaderComponent,
    DatosStepComponent,
    HorariosStepComponent,
    ContactosStepComponent,
    WorkspacesStepComponent,
    TotemStepComponent,
    ConfirmarStepComponent,
  ],
  templateUrl: './sucursal-alta-stepper.page.html',
  styleUrl: './sucursal-alta-stepper.page.scss',
  providers: [MessageService],
})
export class SucursalAltaStepperPage {
  private router = inject(Router);
  private store = inject(Store);
  private messageService = inject(MessageService);

  protected readonly steps = SUCURSAL_FORM_STEPS;

  /**
   * currentStep es 0-indexed para alinearse con el `currentIndex` del
   * componente compartido `app-form-stepper-header`. Antes era 1-indexed
   * por la API de PrimeNG <p-stepper>; el mapeo nuevo es directo
   * (0=datos, 1=horarios, ..., 5=confirmar).
   */
  protected readonly currentStep = signal(0);
  protected readonly branchId = signal<number | null>(null);

  /**
   * Set de pasos visitados (clickeables desde el header).
   * Arranca con solo el paso 0 (datos). Cuando datos crea la sucursal y
   * devuelve el branchId, se desbloquean todos los demás (1..5).
   */
  protected readonly visited = signal<ReadonlySet<number>>(new Set([0]));

  protected readonly isFirstStep = computed(() => this.currentStep() === 0);
  protected readonly isLastStep = computed(() => this.currentStep() === this.steps.length - 1);

  /**
   * Llamado por DatosStepComponent cuando la sucursal se crea y devuelve su id.
   * Habilita los steps 2-6 (que requieren branchId) y avanza al paso de horarios.
   */
  onDatosCompleted(branchId: number) {
    this.branchId.set(branchId);
    this.visited.set(new Set([0, 1, 2, 3, 4, 5]));
    this.currentStep.set(1);
  }

  /**
   * Navegación entre steps disparada por el header compartido.
   * El propio shared component solo emite `stepSelected` cuando el paso
   * está visitado, así que el guard de branchId queda cubierto por el set.
   */
  goToStep(step: number) {
    if (step < 0 || step >= this.steps.length) return;
    if (!this.visited().has(step)) return;
    this.currentStep.set(step);
  }

  /** Avanza al siguiente paso (usado por los botones internos de cada step). */
  goNext() {
    const next = Math.min(this.currentStep() + 1, this.steps.length - 1);
    this.visited.update((s) => new Set([...s, next]));
    this.currentStep.set(next);
  }

  /** Retrocede al paso anterior (usado por los botones internos de cada step). */
  goBack() {
    const prev = Math.max(this.currentStep() - 1, 0);
    this.currentStep.set(prev);
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
