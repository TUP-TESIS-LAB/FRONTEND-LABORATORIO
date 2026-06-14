import { describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { ValidarProtocoloPage } from './validar-protocolo.page';

const SMOKE_TEMPLATE = `<span>{{ firma() }}</span>`;

// P-2606-0040 (García): 2 análisis, ninguno firmado → firma 'no', nada validado al entrar.
function setup(protocolId = 'P-2606-0040'): ComponentFixture<ValidarProtocoloPage> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ValidarProtocoloPage],
    providers: [
      provideNoopAnimations(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: (k: string) => (k === 'protocolId' ? protocolId : null) } } } },
    ],
  });
  TestBed.overrideTemplate(ValidarProtocoloPage, SMOKE_TEMPLATE);
  const fx = TestBed.createComponent(ValidarProtocoloPage);
  fx.detectChanges();
  return fx;
}

describe('ValidarProtocoloPage (smoke)', () => {
  it('carga el protocolo de la ruta', () => {
    expect(setup().componentInstance.p.id).toBe('P-2606-0040');
  });

  it('un protocolo sin firmas arranca en firma "no" y sin análisis validados', () => {
    const c = setup().componentInstance;
    expect(c.firma()).toBe('no');
    expect(c.someVal()).toBe(false);
    expect(c.allVal()).toBe(false);
  });

  it('validar marca el análisis y habilita firma parcial', () => {
    const c = setup().componentInstance;
    c.validar(c.p.analisis[0]);
    expect(c.isVal(c.p.analisis[0].id)).toBe(true);
    expect(c.someVal()).toBe(true);
    expect(c.allVal()).toBe(false);
  });

  it('validarTodo habilita firma total', () => {
    const c = setup().componentInstance;
    c.validarTodo();
    expect(c.allVal()).toBe(true);
  });

  it('firmarParcial con algunos validados deja firma "parcial"; firmarTotal requiere todos', () => {
    const c = setup().componentInstance;
    c.validar(c.p.analisis[0]);
    c.firmarTotal();
    expect(c.firma()).toBe('no'); // no-op: falta validar el resto
    c.firmarParcial();
    expect(c.firma()).toBe('parcial');
    c.validarTodo();
    c.firmarTotal();
    expect(c.firma()).toBe('total');
  });

  it('validación automática: en rango Validado, fuera de rango No validado', () => {
    const c = setup().componentInstance;
    const hemo = c.p.analisis[0]; // tiene determinaciones con flag H
    const enRango = hemo.dets.find(x => !x.flag)!;
    const fueraRango = hemo.dets.find(x => x.flag)!;
    expect(c.autoOf(enRango)).toBe(true);
    expect(c.autoOf(fueraRango)).toBe(false);
  });

  it('un protocolo totalmente firmado arranca en firma "total"', () => {
    // P-2606-0041 (Fernández): ambos análisis firmados.
    expect(setup('P-2606-0041').componentInstance.firma()).toBe('total');
  });
});
