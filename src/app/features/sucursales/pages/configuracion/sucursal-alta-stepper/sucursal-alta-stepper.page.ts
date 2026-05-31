import {
  ChangeDetectionStrategy, Component, ViewChild,
  computed, inject, signal,
} from '@angular/core';
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
   * componente compartido `ui-form-stepper-header`. Antes era 1-indexed
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
   * Loading flag mientras DatosStepComponent dispatch addSucursal y espera
   * la respuesta del back. Se refleja en el [loading] del boton "Continuar"
   * del footer en el paso 0.
   */
  protected readonly creatingBranch = signal(false);

  /** Loading flag para el boton "Finalizar" del paso final. */
  protected readonly finishing = signal(false);

  /**
   * Estado de validez del form del paso 0 (datos). Se sincroniza desde el
   * output `(validChange)` del DatosStepComponent — el step emite en cada
   * cambio de status del FormGroup, y la pagina solo refleja el valor.
   * Esto habilita reactivamente el boton "Continuar" del footer sin acoplar
   * la pagina al FormGroup interno del step ni depender de @ViewChild + CD.
   */
  protected readonly step0Valid = signal(false);

  @ViewChild('step0') step0?: DatosStepComponent;

  /**
   * Disparado por el boton "Continuar →" del footer en el paso 0.
   * Llama a DatosStep.submit() que dispatcha addSucursal y, en exito,
   * emite (completed) → onDatosCompleted avanza al paso 1.
   */
  onContinueFromDatos(): void {
    const ref = this.step0;
    if (!ref) return;
    this.creatingBranch.set(true);
    ref.submit();
  }

  /**
   * Llamado por DatosStepComponent cuando la sucursal se crea y devuelve su id.
   * Habilita los steps 2-6 (que requieren branchId) y avanza al paso de horarios.
   */
  onDatosCompleted(branchId: number) {
    this.creatingBranch.set(false);
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

  /** Avanza al siguiente paso (usado por el footer en steps >= 1). */
  goNext() {
    const next = Math.min(this.currentStep() + 1, this.steps.length - 1);
    this.visited.update((s) => new Set([...s, next]));
    this.currentStep.set(next);
  }

  /** Retrocede al paso anterior (usado por el footer). */
  goBack() {
    const prev = Math.max(this.currentStep() - 1, 0);
    this.currentStep.set(prev);
  }

  /** Llamado por el footer en el paso final. Muestra toast y navega al detalle. */
  finish() {
    const id = this.branchId();
    if (id == null) return;
    this.finishing.set(true);
    this.messageService.add({
      severity: 'success',
      summary: 'Sucursal creada',
      detail: 'La configuración se guardó correctamente.',
    });
    this.router.navigate(['/sucursales/configuracion', id]);
  }

  /** Cancel-and-bail (boton Volver del header + Cancelar del footer). */
  cancel() {
    this.router.navigate(['/sucursales/configuracion']);
  }
}
