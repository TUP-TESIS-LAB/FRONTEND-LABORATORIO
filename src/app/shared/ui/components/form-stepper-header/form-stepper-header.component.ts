import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormStep } from '@shared/ui/models/form-step';
import { StepAutofocusDirective } from '@shared/ui/directives/step-autofocus.directive';

@Component({
  selector: 'ui-form-stepper-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // El autofoco se aplica acá, en la shell compartida, para que TODOS los
  // steppers (atención, pacientes, sucursal, empleados, médicos) lo hereden
  // sin tocar cada page.
  hostDirectives: [StepAutofocusDirective],
  template: `
    <ol class="pat-stepper" role="list">
      @for (step of steps(); track step.key; let i = $index) {
        @if (i > 0) {
          <li class="pat-stepper__connector" [class.is-done]="isDone(i - 1)" aria-hidden="true"></li>
        }
        <li
          class="pat-stepper__item"
          [class.is-current]="i === currentIndex()"
          [class.is-done]="isDone(i)"
          [class.is-locked]="isLocked(i)"
          [class.is-clickable]="isClickable(i)"
          [attr.data-step]="i"
          [attr.aria-current]="i === currentIndex() ? 'step' : null"
          [attr.role]="isClickable(i) ? 'button' : null"
          [attr.tabindex]="isClickable(i) ? 0 : null"
          [attr.aria-label]="ariaLabelFor(step, i)"
          (click)="onClick(i)"
          (keydown.enter)="onKey($event, i)"
          (keydown.space)="onKey($event, i)"
        >
          <span class="pat-stepper__num" aria-hidden="true">
            @if (isDone(i)) { &check; } @else { {{ i + 1 }} }
          </span>
          <span class="pat-stepper__lbl">
            <span class="pat-stepper__title">{{ step.title }}</span>
            <span class="pat-stepper__sub">{{ step.subtitle }}</span>
          </span>
        </li>
      }
    </ol>
  `,
  styles: [`
    :host {
      --pat-step-line: var(--ds-border, #e8e9f0);
      --pat-step-soft: #eef0f5;
      --pat-step-muted: var(--ds-text-muted, #7c8092);
      --pat-step-mute2: #aeb2c0;
      --pat-step-hover: #f5f6f9;
      --pat-step-text: var(--ds-text, #22243a);
      --pat-step-primary: var(--brand-primary, #2563eb);
      --pat-step-success: var(--ds-success, #22c55e);
    }
    .pat-stepper { display:flex; align-items:center; gap:8px; list-style:none; margin:0; padding:18px 28px; border-bottom:1px solid var(--pat-step-soft); background:#fff; }
    .pat-stepper__item { display:flex; align-items:center; gap:11px; color:var(--pat-step-muted); cursor:default; padding:8px 14px; border-radius:12px; transition:background 140ms ease, color 140ms ease; }
    .pat-stepper__item.is-clickable { cursor:pointer; }
    .pat-stepper__item.is-clickable:hover { background:var(--pat-step-hover); }
    .pat-stepper__num { width:32px; height:32px; flex:0 0 32px; border-radius:50%; border:1.5px solid var(--pat-step-line); display:inline-flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; background:#fff; color:var(--pat-step-mute2); transition:background 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease; }
    .pat-stepper__item.is-done .pat-stepper__num { background:var(--pat-step-success); border-color:var(--pat-step-success); color:#fff; }
    .pat-stepper__item.is-done { color:var(--pat-step-text); }
    .pat-stepper__item.is-current { color:var(--pat-step-primary); font-weight:700; background:color-mix(in srgb, var(--pat-step-primary) 8%, #fff); }
    .pat-stepper__item.is-current .pat-stepper__num { background:var(--pat-step-primary); border-color:var(--pat-step-primary); color:#fff; box-shadow:0 0 0 4px color-mix(in srgb, var(--pat-step-primary) 16%, transparent); }
    .pat-stepper__item.is-locked { color:var(--pat-step-mute2); }
    .pat-stepper__item.is-locked .pat-stepper__num { color:var(--pat-step-mute2); }
    .pat-stepper__lbl { display:inline-flex; flex-direction:column; line-height:1.25; }
    .pat-stepper__title { font-size:13.5px; font-weight:600; }
    .pat-stepper__sub { font-size:11px; font-weight:400; color:var(--pat-step-muted); }
    .pat-stepper__item.is-locked .pat-stepper__sub { color:var(--pat-step-mute2); }
    .pat-stepper__connector { flex:1; height:2px; background:var(--pat-step-line); margin:0 2px; border-radius:999px; transition:background 200ms ease; }
    .pat-stepper__connector.is-done { background:var(--pat-step-success); }
  `],
})
export class FormStepperHeaderComponent {
  readonly steps = input.required<readonly FormStep[]>();
  readonly currentIndex = input.required<number>();
  readonly visited = input.required<ReadonlySet<number>>();
  /**
   * Cuando es `false`, el header funciona como indicador de progreso de solo
   * lectura: los pasos visitados se muestran como completados pero no son
   * navegables (sin cursor/role/tabindex ni `stepSelected`). Útil para wizards
   * dirigidos por una máquina de estados, donde el avance no es libre.
   */
  readonly clickable = input<boolean>(true);
  /**
   * Guard opcional de validación: se consulta ANTES de dejar el paso actual al
   * navegar desde el header. Si devuelve `false`, no se emite `stepSelected` (no
   * se avanza). Por defecto permite navegar — los steppers existentes ya validan
   * el avance en su botón "Continuar", así que su comportamiento no cambia.
   */
  readonly canLeaveStep = input<(currentIndex: number) => boolean>(() => true);
  readonly stepSelected = output<number>();

  private readonly autofocus = inject(StepAutofocusDirective);

  constructor() {
    let isInitial = true;
    effect(() => {
      this.currentIndex(); // track
      // No robamos el foco en el montaje inicial; sólo al cambiar de paso.
      if (isInitial) { isInitial = false; return; }
      this.autofocus.onStepChanged();
    });
  }

  readonly isDone = (i: number) => this.visited().has(i) && i !== this.currentIndex();
  readonly isLocked = (i: number) => !this.visited().has(i) && i !== this.currentIndex();
  readonly isClickable = (i: number) => this.clickable() && i !== this.currentIndex() && this.visited().has(i);

  onClick(i: number): void {
    if (!this.isClickable(i)) return;
    if (!this.canLeaveStep()(this.currentIndex())) return;
    this.stepSelected.emit(i);
  }

  onKey(event: Event, i: number): void {
    if (!this.isClickable(i)) return;
    if (!this.canLeaveStep()(this.currentIndex())) return;
    event.preventDefault();
    this.stepSelected.emit(i);
  }

  ariaLabelFor(step: FormStep, i: number): string {
    const total = this.steps().length;
    const status = i === this.currentIndex() ? 'actual'
      : this.isDone(i) ? 'completado'
      : 'bloqueado';
    return `Paso ${i + 1} de ${total}: ${step.title} (${status})`;
  }
}
