import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SignatureInputComponent } from '@shared/ui/components/signature-input/signature-input.component';

/**
 * Paso "Firma" del alta/edición de empleado. Solo aplica a bioquímicos.
 * Usa el `ui-signature-input` de 3 modos (dibujar / subir imagen / texto), que
 * SIEMPRE produce un base64 PNG dataURL en el control `signature`.
 */
@Component({
  selector: 'emp-firma-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, SignatureInputComponent],
  template: `
    <div [formGroup]="group()" class="max-w-2xl">
      <p class="text-sm text-surface-500 mb-3">
        Firma del bioquímico. Se estampa en los informes que firma. Podés dibujarla,
        subir una imagen (PNG o JPG, hasta 2 MB) o escribir el nombre para convertirlo en firma.
      </p>
      <ui-signature-input formControlName="signature" />
    </div>
  `,
})
export class FirmaStepComponent {
  readonly group = input.required<FormGroup>();
}
