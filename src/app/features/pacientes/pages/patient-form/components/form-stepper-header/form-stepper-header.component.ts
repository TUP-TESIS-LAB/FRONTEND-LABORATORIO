import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PatientFormStep } from '../../patient-form-steps';

@Component({
  selector: 'pat-form-stepper-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="pat-stepper">
      @for (step of steps(); track step.key; let i = $index) {
        @if (i > 0) { <li class="pat-stepper__connector" [class.is-done]="isDone(i - 1)"></li> }
        <li
          class="pat-stepper__item"
          [class.is-current]="i === currentIndex()"
          [class.is-done]="isDone(i)"
          [class.is-locked]="isLocked(i)"
          [class.is-clickable]="isClickable(i)"
          [attr.data-step]="i"
          (click)="onClick(i)"
        >
          <span class="pat-stepper__num">
            @if (isDone(i)) { ✓ } @else { {{ i + 1 }} }
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
    :host { --pat-step-line: #e2e8f0; --pat-step-muted: #64748b; --pat-step-mute2: #94a3b8; --pat-step-hover: #f1f5f9; --pat-step-text: var(--ds-text, #1a1a2e); --pat-step-primary: var(--brand-primary, #2563eb); --pat-step-success: var(--ds-success, #22c55e); }
    .pat-stepper { display:flex; align-items:center; gap:10px; list-style:none; margin:0; padding:16px 28px; border-bottom:1px solid var(--pat-step-line); background:#fff; }
    .pat-stepper__item { display:flex; align-items:center; gap:10px; color:var(--pat-step-muted); cursor:default; padding:6px 10px; border-radius:8px; transition:background 120ms ease; }
    .pat-stepper__item.is-clickable { cursor:pointer; }
    .pat-stepper__item.is-clickable:hover { background:var(--pat-step-hover); }
    .pat-stepper__num { width:28px; height:28px; flex:0 0 28px; border-radius:50%; border:1.5px solid var(--pat-step-line); display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; background:#fff; color:var(--pat-step-muted); }
    .pat-stepper__item.is-done .pat-stepper__num { background:var(--pat-step-success); border-color:var(--pat-step-success); color:#fff; }
    .pat-stepper__item.is-done { color:var(--pat-step-text); }
    .pat-stepper__item.is-current .pat-stepper__num { background:var(--pat-step-primary); border-color:var(--pat-step-primary); color:#fff; box-shadow:0 0 0 4px color-mix(in srgb, var(--pat-step-primary) 18%, transparent); }
    .pat-stepper__item.is-current { color:var(--pat-step-primary); font-weight:600; }
    .pat-stepper__item.is-locked { color:var(--pat-step-mute2); }
    .pat-stepper__item.is-locked .pat-stepper__num { color:var(--pat-step-mute2); }
    .pat-stepper__lbl { display:inline-flex; flex-direction:column; line-height:1.2; }
    .pat-stepper__title { font-size:13px; font-weight:600; }
    .pat-stepper__sub { font-size:11px; font-weight:400; color:var(--pat-step-muted); }
    .pat-stepper__item.is-locked .pat-stepper__sub { color:var(--pat-step-mute2); }
    .pat-stepper__connector { flex:1; height:2px; background:var(--pat-step-line); margin:0 2px; border-radius:2px; transition:background 200ms ease; }
    .pat-stepper__connector.is-done { background:var(--pat-step-success); }
  `],
})
export class FormStepperHeaderComponent {
  readonly steps = input.required<readonly PatientFormStep[]>();
  readonly currentIndex = input.required<number>();
  readonly visited = input.required<ReadonlySet<number>>();
  readonly stepSelected = output<number>();

  readonly isDone = (i: number) => this.visited().has(i) && i !== this.currentIndex();
  readonly isLocked = (i: number) => !this.visited().has(i) && i !== this.currentIndex();
  readonly isClickable = (i: number) => i !== this.currentIndex() && this.visited().has(i);

  onClick(i: number): void {
    if (this.isClickable(i)) this.stepSelected.emit(i);
  }
}
