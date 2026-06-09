import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StepAutofocusDirective } from './step-autofocus.directive';

@Component({
  standalone: true,
  imports: [StepAutofocusDirective],
  // Reproduce el layout real de un stepper: header (con la directiva) → contenido
  // del paso → footer. El botón "Volver" va ANTES del header a propósito.
  template: `
    <div class="shell">
      <button type="button" id="volver">Volver</button>
      <span uiStepAutofocus class="header">header</span>
      <div class="content">
        @switch (step()) {
          @case (0) { <input id="s0a" /><input id="s0b" /> }
          @case (1) { <input id="s1a" /><input id="s1b" /> }
          @case (2) { <span>Sólo lectura</span> }
        }
      </div>
      <footer><button id="continuar">Continuar</button></footer>
    </div>
  `,
})
class HostComponent {
  readonly step = signal(0);
  readonly dir = viewChild.required(StepAutofocusDirective);
}

describe('StepAutofocusDirective', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    // Adjuntar al document para que focus() y document.activeElement funcionen.
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    document.querySelectorAll('.shell').forEach((n) => n.remove());
  });

  it('enfoca el primer control del paso actual', () => {
    const fixture = setup();
    fixture.componentInstance.dir().focusFirstControl();
    expect(document.activeElement?.id).toBe('s0a');
  });

  it('al cambiar de paso enfoca el primer control del paso nuevo', () => {
    const fixture = setup();
    fixture.componentInstance.step.set(1);
    fixture.detectChanges();
    fixture.componentInstance.dir().focusFirstControl();
    expect(document.activeElement?.id).toBe('s1a');
  });

  it('ignora los controles previos al header (botón Volver)', () => {
    const fixture = setup();
    fixture.componentInstance.dir().focusFirstControl();
    expect(document.activeElement?.id).not.toBe('volver');
  });

  it('no roba el foco hacia la botonera de pie cuando el paso no tiene controles', () => {
    const fixture = setup();
    fixture.componentInstance.step.set(2); // paso sólo-lectura, sin inputs
    fixture.detectChanges();
    const before = document.activeElement;
    fixture.componentInstance.dir().focusFirstControl();
    expect(document.activeElement?.id).not.toBe('continuar');
    expect(document.activeElement).toBe(before);
  });
});
