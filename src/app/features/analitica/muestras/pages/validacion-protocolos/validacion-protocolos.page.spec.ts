import { describe, expect, it, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { ValidacionProtocolosPage } from './validacion-protocolos.page';
import { PROTOCOLOS, estadoProt } from '../../data/validacion-protocolos.mock';

const SMOKE_TEMPLATE = `<span class="c">{{ cSin() }}-{{ cParcial() }}-{{ cTotal() }}</span><span class="v">{{ visibles().length }}</span>`;

function setup(): { fx: ComponentFixture<ValidacionProtocolosPage>; navigate: ReturnType<typeof vi.fn> } {
  const navigate = vi.fn();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ValidacionProtocolosPage],
    providers: [
      provideNoopAnimations(),
      { provide: Router, useValue: { navigate } },
    ],
  });
  TestBed.overrideTemplate(ValidacionProtocolosPage, SMOKE_TEMPLATE);
  const fx = TestBed.createComponent(ValidacionProtocolosPage);
  fx.detectChanges();
  return { fx, navigate };
}

describe('ValidacionProtocolosPage (smoke)', () => {
  it('los contadores por estado de firma suman el total de protocolos', () => {
    const c = setup().fx.componentInstance;
    expect(c.cSin() + c.cParcial() + c.cTotal()).toBe(PROTOCOLOS.length);
  });

  it('arranca mostrando todos los protocolos (filtro "todos")', () => {
    expect(setup().fx.componentInstance.visibles().length).toBe(PROTOCOLOS.length);
  });

  it('el filtro "sin" deja solo protocolos sin firma', () => {
    const c = setup().fx.componentInstance;
    c.setFiltro('sin');
    expect(c.visibles().every(p => estadoProt(p) === 'sin')).toBe(true);
    expect(c.visibles().length).toBe(c.cSin());
  });

  it('la búsqueda por paciente filtra el listado', () => {
    const c = setup().fx.componentInstance;
    c.setQ('garcía');
    expect(c.visibles().length).toBe(1);
    expect(c.visibles()[0].paciente).toContain('García');
  });

  it('toggle abre y cierra una fila', () => {
    const c = setup().fx.componentInstance;
    const id = PROTOCOLOS[0].id;
    expect(c.isOpen(id)).toBe(false);
    c.toggle(id);
    expect(c.isOpen(id)).toBe(true);
    c.toggle(id);
    expect(c.isOpen(id)).toBe(false);
  });

  it('validar navega al detalle del protocolo', () => {
    const { fx, navigate } = setup();
    const p = PROTOCOLOS[0];
    fx.componentInstance.validar(p, new Event('click'));
    expect(navigate).toHaveBeenCalledWith(['/analitica/validacion', p.id]);
  });
});
