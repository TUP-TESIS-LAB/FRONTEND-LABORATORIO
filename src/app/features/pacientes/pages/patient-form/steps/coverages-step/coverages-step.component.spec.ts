import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { describe, it, expect } from 'vitest';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { CoveragesStepComponent } from './coverages-step.component';
import { CoveragePlansService } from '../../../../services/coverage-plans.service';

const mockPlansService = {
  getActivePlans: () => of([{ planId: 1, label: 'Particular', particular: true }]),
};

@Component({
  standalone: true,
  imports: [CoveragesStepComponent],
  template: `<pat-coverages-step [array]="array" />`,
})
class HostCmp {
  array: FormArray<FormGroup> = new FormBuilder().array<FormGroup>([]);
}

describe('CoveragesStepComponent', () => {
  it('renders the contextual hint without a redundant title (el título vive en el header del stepper)', () => {
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        { provide: CoveragePlansService, useValue: mockPlansService },
      ],
    });
    const fx = TestBed.createComponent(HostCmp);
    fx.detectChanges();
    const html = (fx.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('particular'); // el hint contextual se mantiene
    expect(html).not.toContain('Coberturas'); // sin título redundante en el contenido del paso
  });

  it('renders the underlying CoverageSectionComponent', () => {
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        { provide: CoveragePlansService, useValue: mockPlansService },
      ],
    });
    const fx = TestBed.createComponent(HostCmp);
    fx.detectChanges();
    const el = (fx.nativeElement as HTMLElement).querySelector('pat-coverage-section');
    expect(el).not.toBeNull();
  });
});
