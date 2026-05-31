import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormStep } from './form-step';

@Component({
  selector: 'app-form-stepper-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="app-stepper" role="list">
      @for (step of steps(); track step.key; let i = $index) {
        @if (i > 0) {
          <li class="app-stepper__connector" [class.is-done]="isDone(i - 1)" aria-hidden="true"></li>
        }
        <li
          class="app-stepper__item"
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
          <span class="app-stepper__num" aria-hidden="true">
            @if (isDone(i)) { ✓ } @else { {{ i + 1 }} }
          </span>
          <span class="app-stepper__lbl">
            <span class="app-stepper__title">{{ step.title }}</span>
            <span class="app-stepper__sub">{{ step.subtitle }}</span>
          </span>
        </li>
      }
    </ol>
  `,
  styles: [`
    :host { --app-step-line: #e2e8f0; --app-step-muted: #64748b; --app-step-mute2: #94a3b8; --app-step-hover: #f1f5f9; --app-step-text: var(--ds-text, #1a1a2e); --app-step-primary: var(--brand-primary, #2563eb); --app-step-success: var(--ds-success, #22c55e); }
    .app-stepper { display:flex; align-items:center; gap:10px; list-style:none; margin:0; padding:16px 28px; border-bottom:1px solid var(--app-step-line); background:#fff; }
    .app-stepper__item { display:flex; align-items:center; gap:10px; color:var(--app-step-muted); cursor:default; padding:6px 10px; border-radius:8px; transition:background 120ms ease; }
    .app-stepper__item.is-clickable { cursor:pointer; }
    .app-stepper__item.is-clickable:hover { background:var(--app-step-hover); }
    .app-stepper__num { width:28px; height:28px; flex:0 0 28px; border-radius:50%; border:1.5px solid var(--app-step-line); display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; background:#fff; color:var(--app-step-muted); }
    .app-stepper__item.is-done .app-stepper__num { background:var(--app-step-success); border-color:var(--app-step-success); color:#fff; }
    .app-stepper__item.is-done { color:var(--app-step-text); }
    .app-stepper__item.is-current .app-stepper__num { background:var(--app-step-primary); border-color:var(--app-step-primary); color:#fff; box-shadow:0 0 0 4px color-mix(in srgb, var(--app-step-primary) 18%, transparent); }
    .app-stepper__item.is-current { color:var(--app-step-primary); font-weight:600; }
    .app-stepper__item.is-locked { color:var(--app-step-mute2); }
    .app-stepper__item.is-locked .app-stepper__num { color:var(--app-step-mute2); }
    .app-stepper__lbl { display:inline-flex; flex-direction:column; line-height:1.2; }
    .app-stepper__title { font-size:13px; font-weight:600; }
    .app-stepper__sub { font-size:11px; font-weight:400; color:var(--app-step-muted); }
    .app-stepper__item.is-locked .app-stepper__sub { color:var(--app-step-mute2); }
    .app-stepper__connector { flex:1; height:2px; background:var(--app-step-line); margin:0 2px; border-radius:2px; transition:background 200ms ease; }
    .app-stepper__connector.is-done { background:var(--app-step-success); }
  `],
})
export class FormStepperHeaderComponent {
  readonly steps = input.required<readonly FormStep[]>();
  readonly currentIndex = input.required<number>();
  readonly visited = input.required<ReadonlySet<number>>();
  readonly stepSelected = output<number>();

  readonly isDone = (i: number) => this.visited().has(i) && i !== this.currentIndex();
  readonly isLocked = (i: number) => !this.visited().has(i) && i !== this.currentIndex();
  readonly isClickable = (i: number) => i !== this.currentIndex() && this.visited().has(i);

  onClick(i: number): void {
    if (this.isClickable(i)) this.stepSelected.emit(i);
  }

  onKey(event: Event, i: number): void {
    if (!this.isClickable(i)) return;
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
