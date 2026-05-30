import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ObraSocialFormStep } from '../../obra-social-form-steps';

@Component({
  selector: 'os-stepper-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="os-stepper" role="list">
      @for (step of steps(); track step.key; let i = $index) {
        @if (i > 0) {
          <li class="os-stepper__connector" [class.is-done]="isDone(i - 1)" aria-hidden="true"></li>
        }
        <li
          class="os-stepper__item"
          [class.is-current]="i === currentIndex()"
          [class.is-done]="isDone(i)"
          [class.is-locked]="isLocked(i)"
          [class.is-clickable]="isClickable(i)"
          [attr.aria-current]="i === currentIndex() ? 'step' : null"
          [attr.role]="isClickable(i) ? 'button' : null"
          [attr.tabindex]="isClickable(i) ? 0 : null"
          [attr.aria-label]="ariaLabelFor(step, i)"
          (click)="onClick(i)"
          (keydown.enter)="onKey($event, i)"
          (keydown.space)="onKey($event, i)"
        >
          <span class="os-stepper__num" aria-hidden="true">
            @if (isDone(i)) { <i class="pi pi-check" aria-hidden="true"></i> } @else { {{ i + 1 }} }
          </span>
          <span class="os-stepper__lbl">
            <span class="os-stepper__title">{{ step.title }}</span>
            <span class="os-stepper__sub">{{ step.subtitle }}</span>
          </span>
        </li>
      }
    </ol>
  `,
  styles: [`
    :host { --os-line:#e2e8f0; --os-muted:#64748b; --os-mute2:#94a3b8; --os-hover:#f1f5f9; --os-text:var(--ds-text,#1a1a2e); --os-primary:var(--brand-primary,#2563eb); --os-success:var(--ds-success,#22c55e); }
    .os-stepper { display:flex; align-items:center; gap:10px; list-style:none; margin:0; padding:16px 28px; border-bottom:1px solid var(--os-line); background:#fff; }
    .os-stepper__item { display:flex; align-items:center; gap:10px; color:var(--os-muted); cursor:default; padding:6px 10px; border-radius:8px; transition:background 120ms ease; }
    .os-stepper__item.is-clickable { cursor:pointer; }
    .os-stepper__item.is-clickable:hover { background:var(--os-hover); }
    .os-stepper__num { width:28px; height:28px; flex:0 0 28px; border-radius:50%; border:1.5px solid var(--os-line); display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; background:#fff; color:var(--os-muted); }
    .os-stepper__item.is-done .os-stepper__num { background:var(--os-success); border-color:var(--os-success); color:#fff; }
    .os-stepper__item.is-done { color:var(--os-text); }
    .os-stepper__item.is-current .os-stepper__num { background:var(--os-primary); border-color:var(--os-primary); color:#fff; box-shadow:0 0 0 4px color-mix(in srgb, var(--os-primary) 18%, transparent); }
    .os-stepper__item.is-current { color:var(--os-primary); font-weight:600; }
    .os-stepper__item.is-locked { color:var(--os-mute2); }
    .os-stepper__lbl { display:inline-flex; flex-direction:column; line-height:1.2; }
    .os-stepper__title { font-size:13px; font-weight:600; }
    .os-stepper__sub { font-size:11px; font-weight:400; color:var(--os-muted); }
    .os-stepper__connector { flex:1; height:2px; background:var(--os-line); margin:0 2px; border-radius:2px; transition:background 200ms ease; }
    .os-stepper__connector.is-done { background:var(--os-success); }
  `],
})
export class ObraSocialStepperHeaderComponent {
  readonly steps = input.required<readonly ObraSocialFormStep[]>();
  readonly currentIndex = input.required<number>();
  readonly visited = input.required<ReadonlySet<number>>();
  readonly stepSelected = output<number>();

  readonly isDone = (i: number) => this.visited().has(i) && i !== this.currentIndex();
  readonly isLocked = (i: number) => !this.visited().has(i) && i !== this.currentIndex();
  readonly isClickable = (i: number) => i !== this.currentIndex() && this.visited().has(i);

  onClick(i: number): void { if (this.isClickable(i)) this.stepSelected.emit(i); }
  onKey(event: Event, i: number): void {
    if (!this.isClickable(i)) return;
    event.preventDefault();
    this.stepSelected.emit(i);
  }
  ariaLabelFor(step: ObraSocialFormStep, i: number): string {
    const total = this.steps().length;
    const status = i === this.currentIndex() ? 'actual' : this.isDone(i) ? 'completado' : 'bloqueado';
    return `Paso ${i + 1} de ${total}: ${step.title} (${status})`;
  }
}
