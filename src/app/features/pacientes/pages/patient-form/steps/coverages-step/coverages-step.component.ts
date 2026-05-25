import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { CoverageSectionComponent } from '../../../../components/coverage-section/coverage-section.component';

@Component({
  selector: 'pat-coverages-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CoverageSectionComponent],
  template: `
    <div class="pat-step">
      <h2 class="pat-step__title">Coberturas <span class="pat-step__opt">· opcional</span></h2>
      <p class="pat-step__hint">Si no agregás ninguna, el paciente queda como particular. Podés sumarlas más tarde.</p>
      <pat-coverage-section [array]="array()" />
    </div>
  `,
})
export class CoveragesStepComponent {
  readonly array = input.required<FormArray<FormGroup>>();
}
