import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { ContactSectionComponent } from '../../../../components/contact-section/contact-section.component';
import { AddressSectionComponent } from '../../../../components/address-section/address-section.component';

@Component({
  selector: 'pat-contact-address-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ContactSectionComponent, AddressSectionComponent],
  template: `
    <div class="pat-step">
      <h2 class="pat-step__title">Contacto y dirección <span class="pat-step__opt">· opcional</span></h2>
      <p class="pat-step__hint">Cómo ubicar al paciente. Podés saltarlo y registrarlo igual.</p>

      <section class="pat-step__subsec">
        <h3 class="pat-step__subtitle">Contactos</h3>
        <pat-contact-section [array]="contacts()" />
      </section>

      <section class="pat-step__subsec">
        <h3 class="pat-step__subtitle">Direcciones</h3>
        <pat-address-section [array]="addresses()" />
      </section>
    </div>
  `,
})
export class ContactAddressStepComponent {
  readonly contacts = input.required<FormArray<FormGroup>>();
  readonly addresses = input.required<FormArray<FormGroup>>();
}
