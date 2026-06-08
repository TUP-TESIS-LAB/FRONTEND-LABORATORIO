import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { AddressFieldsComponent } from '../../../../components/address-fields/address-fields.component';

@Component({
  selector: 'pat-address-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AddressFieldsComponent],
  template: `
    <div class="pat-step">
      <p class="pat-step__hint">Domicilio del paciente. Podés saltarlo y registrarlo igual.</p>
      <pat-address-fields [group]="group()" />
    </div>
  `,
})
export class AddressStepComponent {
  readonly group = input.required<FormGroup>();
}
