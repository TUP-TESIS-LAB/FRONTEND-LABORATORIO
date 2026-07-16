import {
  ChangeDetectionStrategy, Component, OnInit, ViewChild,
  computed, inject, signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { WizardShellComponent } from '@shared/ui/components/wizard-shell/wizard-shell.component';
import { DatosStepComponent } from './steps/datos-step.component';
import { DatosTabComponent } from '../sucursal-detalle/tabs/datos-tab.component';
import { HorariosStepComponent } from './steps/horarios-step.component';
import { ContactosStepComponent } from './steps/contactos-step.component';
import { WorkspacesStepComponent } from './steps/workspaces-step.component';
import { TotemStepComponent } from './steps/totem-step.component';
import { ConfirmarStepComponent } from './steps/confirmar-step.component';
import { SUCURSAL_FORM_STEPS } from './sucursal-alta-stepper.steps';
import { loadDetail } from '../../../store/sucursal.actions';

/** Índice del paso "Tótem" — es donde viven los boxes, que se guardan al
 *  abandonar el paso (Continuar) o al finalizar (en modo edición es el último). */
const TOTEM_STEP_INDEX = 4;

@Component({
  selector: 'app-sucursal-alta-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ToastModule,
    WizardShellComponent,
    DatosStepComponent,
    DatosTabComponent,
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
export class SucursalAltaStepperPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private store = inject(Store);
  private messageService = inject(MessageService);

  /**
   * Modo edición: el stepper se abre sobre una sucursal existente (ruta
   * `/configuracion/:id/editar`). En edición el branchId se conoce desde el
   * arranque, todos los pasos están desbloqueados, el paso 0 usa el form de
   * edición (datos-tab) y NO se muestra el paso "Confirmar" final.
   */
  protected readonly editMode = signal(false);

  /**
   * En edición ocultamos el último paso ("Confirmar"), que solo tiene sentido
   * en el alta. El resto de los pasos se reusan tal cual (son CRUD sobre
   * sub-recursos del branch).
   */
  protected readonly steps = computed(() =>
    this.editMode() ? SUCURSAL_FORM_STEPS.slice(0, TOTEM_STEP_INDEX + 1) : SUCURSAL_FORM_STEPS,
  );

  protected readonly heading = computed(() =>
    this.editMode() ? 'Editar sucursal' : 'Nueva sucursal',
  );
  protected readonly breadcrumb = computed(() =>
    this.editMode() ? 'Sucursales › Editar' : 'Sucursales › Nueva',
  );

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

  /**
   * Set de pasos efectivamente COMPLETADOS (los que muestran el tilde verde).
   * Es distinto de `visited`: tras crear la sucursal se desbloquean todos los
   * pasos para navegación libre, pero solo se marca como hecho el que el usuario
   * realmente dejó atrás. Sin esto, al dar "Continuar" en datos se tildaban los
   * 5 pasos siguientes de golpe.
   */
  protected readonly completed = signal<ReadonlySet<number>>(new Set());

  protected readonly isFirstStep = computed(() => this.currentStep() === 0);
  protected readonly isLastStep = computed(() => this.currentStep() === this.steps().length - 1);

  /**
   * Estado del botón "Continuar" del footer (lo consume `ui-wizard-shell`).
   * Solo el paso 0 (datos) tiene gating EN ALTA: requiere form válido y muestra
   * loading mientras crea la sucursal. En edición y en el resto de los pasos
   * se avanza libre.
   */
  protected readonly continueDisabled = computed(
    () => !this.editMode() && this.isFirstStep() && !this.step0Valid(),
  );
  protected readonly continueLoading = computed(
    () => !this.editMode() && this.isFirstStep() && this.creatingBranch(),
  );

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
  @ViewChild('totemStep') totemStep?: TotemStepComponent;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam == null) return; // alta: flujo create-first sin cambios

    const id = Number(idParam);
    if (isNaN(id) || id <= 0) {
      this.router.navigate(['/sucursales/configuracion']);
      return;
    }

    // Modo edición: branch conocido, todos los pasos desbloqueados + precarga.
    this.editMode.set(true);
    this.branchId.set(id);
    const all = new Set([0, 1, 2, 3, TOTEM_STEP_INDEX]);
    this.visited.set(all);
    this.completed.set(all);
    this.store.dispatch(loadDetail({ branchId: id }));
  }

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
    // Datos quedó completado; se desbloquean todos los pasos para navegación
    // libre (visited), pero solo datos está "hecho" (completed) — los demás
    // se irán tildando a medida que el usuario los deje atrás con "Continuar".
    this.completed.set(new Set([0]));
    this.visited.set(new Set([0, 1, 2, 3, 4, 5]));
    this.currentStep.set(1);
  }

  /**
   * Llamado por DatosStepComponent cuando el submit fallo (p.ej. 409 codigo
   * duplicado). Resetea el loading del boton "Continuar →" para que el usuario
   * pueda corregir y reintentar sin tener que recargar la pagina.
   */
  onDatosFailed() {
    this.creatingBranch.set(false);
  }

  /**
   * Navegación entre steps disparada por el header compartido.
   * El propio shared component solo emite `stepSelected` cuando el paso
   * está visitado, así que el guard de branchId queda cubierto por el set.
   */
  goToStep(step: number) {
    if (step < 0 || step >= this.steps().length) return;
    if (!this.visited().has(step)) return;
    // Persistimos los boxes si nos vamos del paso tótem por el header.
    if (this.currentStep() === TOTEM_STEP_INDEX && step !== TOTEM_STEP_INDEX) {
      this.totemStep?.saveBoxes();
    }
    this.currentStep.set(step);
  }

  /**
   * Footer "Continuar" (output `next` del shell). En alta + paso 0 dispara el
   * alta de la sucursal; en el resto, avanza al siguiente paso.
   */
  onNext() {
    // Al abandonar el paso tótem, persistimos los boxes (ya no hay botón propio).
    if (this.currentStep() === TOTEM_STEP_INDEX) this.totemStep?.saveBoxes();

    if (!this.editMode() && this.isFirstStep()) this.onContinueFromDatos();
    else this.goNext();
  }

  /** Avanza al siguiente paso (usado por el footer en steps >= 1). */
  goNext() {
    // El paso que se deja atrás queda marcado como completado (tilde verde).
    this.completed.update((s) => new Set(s).add(this.currentStep()));
    const next = Math.min(this.currentStep() + 1, this.steps().length - 1);
    this.visited.update((s) => new Set([...s, next]));
    this.currentStep.set(next);
  }

  /** Retrocede al paso anterior (usado por el footer). */
  goBack() {
    const prev = Math.max(this.currentStep() - 1, 0);
    this.currentStep.set(prev);
  }

  /** Llamado por el footer en el paso final. Persiste los boxes (si estamos en
   *  el paso tótem), muestra toast y navega de vuelta. */
  finish() {
    // En edición el último paso ES el tótem; persistimos sus boxes al finalizar.
    if (this.currentStep() === TOTEM_STEP_INDEX) this.totemStep?.saveBoxes();

    if (this.editMode()) {
      this.messageService.add({
        severity: 'success',
        summary: 'Sucursal actualizada',
        detail: 'Los cambios se guardaron correctamente.',
      });
      this.router.navigate(['/sucursales/configuracion']);
      return;
    }

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
