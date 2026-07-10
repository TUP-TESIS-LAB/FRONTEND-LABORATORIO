import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { provideMockStore } from '@ngrx/store/testing';

import { ConfirmarStepComponent } from './confirmar-step.component';
import {
  selectCurrentSucursal, selectSchedules, selectContacts,
  selectWorkspaces, selectAreas, selectSections, selectTotemConfig,
} from '../../../../store/sucursal.selectors';
import { GeographyService } from '../../../../services/geography.service';

const geographyMock = {
  listProvinces: () => of([{ id: 5, name: 'Córdoba' }]),
  listCitiesByProvince: (id: number) =>
    id === 5 ? of([{ id: 100, name: 'Córdoba', provinceId: 5 }]) : of([]),
};

function configure(overrides: {
  current?: unknown; schedules?: unknown; contacts?: unknown;
  workspaces?: unknown; areas?: unknown; sections?: unknown; totem?: unknown;
}) {
  TestBed.configureTestingModule({
    imports: [ConfirmarStepComponent],
    providers: [
      { provide: GeographyService, useValue: geographyMock },
      provideMockStore({
        selectors: [
          { selector: selectCurrentSucursal, value: overrides.current ?? null },
          { selector: selectSchedules, value: overrides.schedules ?? [] },
          { selector: selectContacts, value: overrides.contacts ?? [] },
          { selector: selectWorkspaces, value: overrides.workspaces ?? [] },
          { selector: selectAreas, value: overrides.areas ?? [] },
          { selector: selectSections, value: overrides.sections ?? [] },
          { selector: selectTotemConfig, value: overrides.totem ?? null },
        ],
      }),
    ],
  });
  const fx = TestBed.createComponent(ConfirmarStepComponent);
  fx.detectChanges();
  return fx.nativeElement.textContent as string;
}

describe('ConfirmarStepComponent — resumen real', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('renderiza el resumen legible (sin IDs) de todos los pasos', () => {
    const text = configure({
      current: {
        id: 1, code: 'Lab Centro', description: 'Lab Centro', status: 'ACTIVE',
        address: { street: 'Calle', streetNumber: '123', cityId: 100 },
        responsibleUserId: null, active: true, atencionBoxesCount: 2, extraccionBoxesCount: 1,
      },
      schedules: [{ id: 1, branchId: 1, dayFrom: 'MONDAY', dayTo: 'MONDAY', fromTime: '09:00', toTime: '17:00', scheduleType: 'FULL_DAY', active: true }],
      contacts: [{ id: 1, branchId: 1, contactType: 'EMAIL', value: 'info@lab.com', active: true }],
      workspaces: [
        { id: 1, branchId: 1, areaId: 1, sectionId: 10 },
        { id: 2, branchId: 1, areaId: 1, sectionId: 11 },
      ],
      areas: [{ id: 1, name: 'Hematología', areaType: 'OTRO', externalLabName: null, active: true }],
      sections: [
        { id: 10, name: 'Sección A', active: true },
        { id: 11, name: 'Sección B', active: true },
      ],
      totem: { branchId: 1, enabled: true, active: true, atencionDisplayEnabled: true, extraccionDisplayEnabled: false },
    });

    expect(text).toContain('Lab Centro');
    expect(text).toContain('Calle 123, Córdoba, Córdoba');
    expect(text).toContain('Lun · 09:00–17:00 · Día completo');
    expect(text).toContain('Email: info@lab.com');
    expect(text).toContain('Hematología: Sección A, Sección B');
    expect(text).toContain('Habilitado');
    expect(text).toContain('Boxes atención: 2');
    expect(text).toContain('Boxes extracción: 1');
    expect(text).toContain('Sala de espera: Sí · Extracción: No');
  });

  it('muestra los fallbacks "Sin ..." y "Sin dirección" cuando todo está vacío', () => {
    const text = configure({
      current: {
        id: 1, code: 'Lab Vacío', description: 'Lab Vacío', status: 'ACTIVE',
        address: null, responsibleUserId: null, active: true,
        atencionBoxesCount: 1, extraccionBoxesCount: 1,
      },
      totem: { branchId: 1, enabled: false, active: true, atencionDisplayEnabled: false, extraccionDisplayEnabled: false },
    });

    expect(text).toContain('Sin dirección');
    expect(text).toContain('Sin horarios');
    expect(text).toContain('Sin contactos');
    expect(text).toContain('Sin áreas asociadas');
    expect(text).toContain('Deshabilitado');
    expect(text).toContain('Sala de espera: No · Extracción: No');
  });
});
