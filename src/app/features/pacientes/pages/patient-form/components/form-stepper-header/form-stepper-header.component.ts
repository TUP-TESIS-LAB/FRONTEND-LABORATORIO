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
    .pat-stepper { display:flex; align-items:center; gap:6px; list-style:none; margin:0; padding:14px 24px; border-bottom:1px solid var(--surface-300); background:var(--surface-0); }
    .pat-stepper__item { display:flex; align-items:center; gap:8px; color:var(--surface-500); cursor:default; padding:4px 6px; border-radius:6px; }
    .pat-stepper__item.is-clickable { cursor:pointer; }
    .pat-stepper__item.is-clickable:hover { background:var(--surface-100); }
    .pat-stepper__num { width:22px; height:22px; border-radius:50%; border:1.5px solid var(--surface-300); display:inline-flex; align-items:center; justify-content:center; font-size:11px; font-weight:600; background:var(--surface-0); }
    .pat-stepper__item.is-done .pat-stepper__num { background:var(--ds-success, #10b981); border-color:var(--ds-success, #10b981); color:#fff; }
    .pat-stepper__item.is-done { color:var(--text-color); }
    .pat-stepper__item.is-current .pat-stepper__num { background:var(--primary-color); border-color:var(--primary-color); color:var(--primary-contrast-color); }
    .pat-stepper__item.is-current { color:var(--primary-color); font-weight:600; }
    .pat-stepper__item.is-locked { color:var(--surface-400); }
    .pat-stepper__lbl { display:inline-flex; flex-direction:column; line-height:1.15; }
    .pat-stepper__title { font-size:12px; }
    .pat-stepper__sub { font-size:10px; color:var(--surface-500); }
    .pat-stepper__connector { flex:1; height:2px; background:var(--surface-300); margin:0 2px; }
    .pat-stepper__connector.is-done { background:var(--ds-success, #10b981); }
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
