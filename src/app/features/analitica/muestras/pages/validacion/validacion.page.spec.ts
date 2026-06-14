import { describe, expect, it } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MessageService } from 'primeng/api';
import { ValidacionPage } from './validacion.page';
import { selectValidationView, selectPostanaliticaLoading, selectPostanaliticaError } from '../../store/postanalitica/postanalitica.selectors';
import type { ValidationView } from '../../models/postanalitica.model';

const SMOKE_TEMPLATE = `<section><h1>Validación</h1><span>{{ studyStatusLabel() }}</span></section>`;
const view: ValidationView = { protocolId: 9, studyStatus: 'PENDING', results: [] };

function setup(): { fx: ComponentFixture<ValidacionPage>; store: MockStore } {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ValidacionPage],
    providers: [
      provideNoopAnimations(),
      MessageService,
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: (k: string) => (k === 'protocolId' ? '9' : null) } } } },
      provideMockStore({ selectors: [
        { selector: selectValidationView, value: view },
        { selector: selectPostanaliticaLoading, value: false },
        { selector: selectPostanaliticaError, value: null },
      ] }),
    ],
  });
  TestBed.overrideTemplate(ValidacionPage, SMOKE_TEMPLATE);
  const fx = TestBed.createComponent(ValidacionPage);
  const store = TestBed.inject(MockStore);
  fx.detectChanges();
  return { fx, store };
}

describe('ValidacionPage (smoke)', () => {
  it('expone protocolId de la ruta', () => {
    expect(setup().fx.componentInstance.protocolId).toBe(9);
  });
  it('studyStatusLabel refleja la vista', () => {
    expect(setup().fx.componentInstance.studyStatusLabel()).toContain('PENDING');
  });
  it('canSignStudy false si el estudio no está READY_FOR_SIGNATURE', () => {
    expect(setup().fx.componentInstance.canSignStudy()).toBe(false);
  });
});
