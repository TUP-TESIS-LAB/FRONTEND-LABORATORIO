import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { describe, it, expect } from 'vitest';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { CoveragesStepComponent } from './coverages-step.component';
import { CoverageCatalogService } from '../../../../services/coverage-catalog.service';
import { EMPTY_CATALOG } from '../../../../models/coverage-catalog.model';

const mockCatalogService = {
  getCatalog: () => of(EMPTY_CATALOG),
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
  it('no muestra título ni aclaraciones en el cuerpo del paso (solo la carga de coberturas)', () => {
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        { provide: CoverageCatalogService, useValue: mockCatalogService },
      ],
    });
    const fx = TestBed.createComponent(HostCmp);
    fx.detectChanges();
    const html = (fx.nativeElement as HTMLElement).textContent ?? '';
    // El hint "Si no agregás ninguna… particular" fue removido.
    expect(html).not.toContain('Si no agregás');
    expect(html).not.toContain('Coberturas'); // sin título redundante en el cuerpo del paso
  });

  it('renders the underlying CoverageSectionComponent', () => {
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        { provide: CoverageCatalogService, useValue: mockCatalogService },
      ],
    });
    const fx = TestBed.createComponent(HostCmp);
    fx.detectChanges();
    const el = (fx.nativeElement as HTMLElement).querySelector('pat-coverage-section');
    expect(el).not.toBeNull();
  });
});
