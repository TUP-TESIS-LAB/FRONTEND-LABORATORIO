import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'ui-password-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div class="auth-field">
      <label [attr.for]="inputId()">{{ label() }}</label>
      <div class="auth-input-wrap">
        <input
          [id]="inputId()"
          [type]="visible() ? 'text' : 'password'"
          [formControl]="control()"
          [attr.autocomplete]="autocomplete()"
          [attr.placeholder]="placeholder()"
          class="auth-input" />
        <button
          type="button"
          class="auth-eye"
          (click)="toggle()"
          [attr.aria-label]="visible() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
          <i [class]="visible() ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
        </button>
      </div>
    </div>
  `,
})
export class UiPasswordFieldComponent {
  readonly control = input.required<FormControl<string>>();
  readonly label = input.required<string>();
  readonly inputId = input.required<string>();
  readonly autocomplete = input<string>('new-password');
  readonly placeholder = input<string>('••••••••');

  protected readonly visible = signal(false);

  protected toggle(): void {
    this.visible.update(v => !v);
  }
}
