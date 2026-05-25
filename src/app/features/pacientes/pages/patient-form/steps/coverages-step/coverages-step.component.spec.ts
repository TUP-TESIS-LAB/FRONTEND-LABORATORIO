import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { describe, it, expect } from 'vitest';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { CoveragesStepComponent } from './coverages-step.component';

@Component({
  standalone: true,
  imports: [CoveragesStepComponent],
  template: `<pat-coverages-step [array]="array" />`,
})
class HostCmp {
  array: FormArray<FormGroup> = new FormBuilder().array<FormGroup>([]);
}

describe('CoveragesStepComponent', () => {
  it('renders the optional copy', () => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fx = TestBed.createComponent(HostCmp);
    fx.detectChanges();
    const html = (fx.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('opcional');
    expect(html).toContain('particular');
  });

  it('renders the underlying CoverageSectionComponent', () => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fx = TestBed.createComponent(HostCmp);
    fx.detectChanges();
    const el = (fx.nativeElement as HTMLElement).querySelector('pat-coverage-section');
    expect(el).not.toBeNull();
  });
});
