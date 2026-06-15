import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { EMPTY } from 'rxjs';
import { WorkspacesStepComponent } from './workspaces-step.component';
import { selectAreas, selectSections, selectWorkspaces } from '../../../../store/sucursal.selectors';
import { addArea, syncWorkspaces } from '../../../../store/sucursal.actions';

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideNoopAnimations(),
      provideMockActions(() => EMPTY),
      provideMockStore({
        selectors: [
          { selector: selectAreas, value: [
            { id: 1, name: 'Química', areaType: 'QUIMICA_CLINICA', externalLabName: null, active: true },
            { id: 2, name: 'Microbiología', areaType: 'MICROBIOLOGIA', externalLabName: null, active: true },
          ] },
          { selector: selectSections, value: [
            { id: 10, name: 'Hematología', areaId: 1, active: true },
            { id: 11, name: 'Coagulación', areaId: 1, active: true },
            { id: 20, name: 'Cultivos', areaId: 2, active: true },
          ] },
          { selector: selectWorkspaces, value: [
            { id: 100, branchId: 5, areaId: 1, sectionId: 10 },
            { id: 101, branchId: 5, areaId: 1, sectionId: 11 },
            { id: 102, branchId: 5, areaId: 2, sectionId: 20 },
          ] },
        ],
      }),
    ],
  });
  const fx = TestBed.createComponent(WorkspacesStepComponent);
  fx.componentRef.setInput('branchId', 5);
  const cmp = fx.componentInstance as WorkspacesStepComponent;
  const store = TestBed.inject(MockStore);
  return { fx, cmp, store };
}

describe('WorkspacesStepComponent (Mockup A)', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('agrupa los workspaces por área (tabla plegable)', () => {
    const { cmp } = setup();
    const groups = (cmp as any).areaGroups();
    expect(groups).toHaveLength(2);
    const quimica = groups.find((g: any) => g.areaId === 1);
    expect(quimica.areaName).toBe('Química');
    expect(quimica.sectionCount).toBe(2);
    expect(quimica.sections.map((s: any) => s.sectionName)).toEqual(['Hematología', 'Coagulación']);
  });

  it('sectionsForArea filtra por el área elegida (checklist)', () => {
    const { cmp } = setup();
    (cmp as any).selectedAreaId.set(1);
    expect((cmp as any).sectionsForArea().map((s: any) => s.id)).toEqual([10, 11]);
  });

  it('add() sincroniza existentes + secciones tildadas nuevas (sin duplicar)', () => {
    const { cmp, store } = setup();
    const spy = vi.spyOn(store, 'dispatch');
    (cmp as any).selectedAreaId.set(2);
    cmp.toggleSection(20, true); // ya existe (area 2 + sección 20) → no se duplica
    // agrego una sección nueva al área 2: simulo otra sección tildada que no está en workspaces
    (cmp as any).selectedSectionIds.set(new Set([20, 99]));
    cmp.add();
    expect(spy).toHaveBeenCalledWith(syncWorkspaces({
      branchId: 5,
      workspaces: [
        { areaId: 1, sectionId: 10 }, { areaId: 1, sectionId: 11 }, { areaId: 2, sectionId: 20 },
        { areaId: 2, sectionId: 99 },
      ],
    }));
  });

  it('saveArea() crea el área con tipo OTRO y sin laboratorio externo (tipo no se pide en el stepper)', () => {
    const { cmp, store } = setup();
    const spy = vi.spyOn(store, 'dispatch');
    (cmp as any).newAreaName = '  Inmunología  ';
    (cmp as any).saveArea();
    expect(spy).toHaveBeenCalledWith(addArea({
      input: { name: 'Inmunología', areaType: 'OTRO', externalLabName: null },
    }));
  });

  it('removeArea() saca todas las secciones de un área', () => {
    const { cmp, store } = setup();
    const spy = vi.spyOn(store, 'dispatch');
    cmp.removeArea(1);
    expect(spy).toHaveBeenCalledWith(syncWorkspaces({
      branchId: 5,
      workspaces: [{ areaId: 2, sectionId: 20 }],
    }));
  });
});
