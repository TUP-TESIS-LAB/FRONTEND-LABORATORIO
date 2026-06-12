import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { describe, it, expect } from 'vitest';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { CoverageSectionComponent } from './coverage-section.component';
import { CoverageCatalogService } from '../../services/coverage-catalog.service';
import { CoverageCatalog } from '../../models/coverage-catalog.model';

const CATALOG: CoverageCatalog = {
  insurers: [
    { id: 1, name: 'Particular', insurerType: 'SELF_PAY' },
    { id: 2, name: 'OSDE', insurerType: 'PRIVATE' },
  ],
  plans: [
    { planId: 10, insurerId: 1, name: 'Particular', particular: true },
    { planId: 20, insurerId: 2, name: '210', particular: false },
  ],
};

const mockCatalogService = { getCatalog: () => of(CATALOG) };

@Component({
  standalone: true,
  imports: [CoverageSectionComponent],
  template: `<pat-coverage-section [array]="array" />`,
})
class HostCmp {
  array: FormArray<FormGroup> = new FormBuilder().array<FormGroup>([]);
}

function setup() {
  TestBed.configureTestingModule({
    providers: [provideNoopAnimations(), { provide: CoverageCatalogService, useValue: mockCatalogService }],
  });
  const fx = TestBed.createComponent(HostCmp);
  fx.detectChanges();
  const section = fx.debugElement.children[0].componentInstance as CoverageSectionComponent;
  return { fx, section };
}

describe('CoverageSectionComponent (Diseño B)', () => {
  it('muestra la fila fija "Particular" y la barra de alta', () => {
    const { fx } = setup();
    const html = (fx.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('Particular');
    expect(html).toContain('Obra social');
    expect(html).toContain('Agregar');
  });

  it('osOptions excluye Particular (SELF_PAY) y planOptions cascadea por obra social', () => {
    const { section } = setup();
    expect(section.osOptions().map((o) => o.name)).toEqual(['OSDE']);
    expect(section.planOptions()).toEqual([]); // sin OS elegida
    section.selInsurer.set(2);
    expect(section.planOptions().map((p) => p.name)).toEqual(['210']);
  });

  it('canAdd requiere OS + plan + N° afiliado; add() empuja la cobertura y resetea la barra', () => {
    const { fx, section } = setup();
    expect(section.canAdd()).toBe(false);
    section.selInsurer.set(2);
    section.selPlan.set(20);
    section.selMember.set('6012345');
    expect(section.canAdd()).toBe(true);

    section.add();
    expect(section.array().length).toBe(1);
    expect(section.array().at(0).value).toMatchObject({ planId: 20, memberNumber: '6012345', isPrimary: false, active: true });
    // La barra se resetea.
    expect(section.selInsurer()).toBeNull();
    expect(section.selPlan()).toBeNull();
    expect(section.selMember()).toBe('');
    fx.detectChanges();
  });

  it('Particular es principal por defecto; selectPrimary marca la OS y vuelve a Particular', () => {
    const { section } = setup();
    section.selInsurer.set(2); section.selPlan.set(20); section.selMember.set('1');
    section.add();
    expect(section.primarySelection()).toBe('particular'); // ninguna OS principal

    section.selectPrimary(0);
    expect(section.array().at(0).value.isPrimary).toBe(true);
    expect(section.primarySelection()).toBe(0);

    section.selectPrimary('particular');
    expect(section.array().at(0).value.isPrimary).toBe(false);
    expect(section.primarySelection()).toBe('particular');
  });
});
