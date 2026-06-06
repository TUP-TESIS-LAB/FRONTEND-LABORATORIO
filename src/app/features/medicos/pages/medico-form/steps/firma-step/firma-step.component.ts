import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SignaturePadComponent } from '@shared/ui/components/signature-pad/signature-pad.component';

@Component({
  selector: 'med-firma-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, SignaturePadComponent],
  template: `
    <div [formGroup]="group()" class="max-w-2xl">
      <p class="text-sm text-surface-500 mb-3">
        Firma del médico (opcional). Se usa para estampar en informes y rótulos.
      </p>
      <ui-signature-pad formControlName="signature" />
    </div>
  `,
})
export class FirmaStepComponent {
  readonly group = input.required<FormGroup>();
}
