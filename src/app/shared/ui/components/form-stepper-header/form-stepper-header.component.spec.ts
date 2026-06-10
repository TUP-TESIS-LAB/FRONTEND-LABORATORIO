import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { FormStepperHeaderComponent } from './form-stepper-header.component';
import { FormStep } from '@shared/ui/models/form-step';

const STEPS: FormStep[] = [
  { key: 'datos', title: 'Datos', subtitle: 'Nombre y matrícula' },
  { key: 'resumen', title: 'Resumen', subtitle: 'Revisá y confirmá' },
];

@Component({
  standalone: true,
  imports: [FormStepperHeaderComponent],
  template: `<ui-form-stepper-header
    [steps]="steps" [currentIndex]="current()" [visited]="visited()"
    [canLeaveStep]="guard()" (stepSelected)="onSelect($event)" />`,
})
class HostComponent {
  steps = STEPS;
  current = signal(1);
  visited = signal<ReadonlySet<number>>(new Set([0, 1]));
  guard = signal<(i: number) => boolean>(() => true);
  selected: number | null = null;
  onSelect(i: number): void { this.selected = i; }
}

// Host que reproduce el layout real de un stepper (header → contenido → footer)
// para verificar que el autofoco aterriza en el primer control del paso nuevo.
@Component({
  standalone: true,
  imports: [FormStepperHeaderComponent],
  template: `
    <form>
      <button type="button" id="volver">Volver</button>
      <ui-form-stepper-header
        [steps]="steps" [currentIndex]="current()" [visited]="visited()" />
      <div class="content">
        @switch (current()) {
          @case (0) { <input id="s0a" /><input id="s0b" /> }
          @case (1) { <input id="s1a" /><input id="s1b" /> }
        }
      </div>
      <footer><button id="continuar">Continuar</button></footer>
    </form>
  `,
})
class WizardHostComponent {
  steps = STEPS;
  current = signal(0);
  visited = signal<ReadonlySet<number>>(new Set([0, 1]));
}

describe('FormStepperHeaderComponent', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders one item per step with its title', () => {
    const html = (setup().nativeElement as HTMLElement).innerHTML;
    expect(html).toContain('Datos');
    expect(html).toContain('Resumen');
  });

  it('marks the current step with is-current', () => {
    const el = setup().nativeElement as HTMLElement;
    const current = el.querySelector('.pat-stepper__item.is-current');
    expect(current?.textContent).toContain('Resumen');
  });

  it('emits stepSelected when a visited, non-current step is clicked', () => {
    const fixture = setup();
    const host = fixture.componentInstance;
    const first = (fixture.nativeElement as HTMLElement)
      .querySelector('.pat-stepper__item[data-step="0"]') as HTMLElement;
    first.click();
    expect(host.selected).toBe(0);
  });

  it('bloquea el avance cuando el guard de validación devuelve false', () => {
    const fixture = setup();
    const host = fixture.componentInstance;
    host.guard.set(() => false); // paso actual inválido
    fixture.detectChanges();
    const first = (fixture.nativeElement as HTMLElement)
      .querySelector('.pat-stepper__item[data-step="0"]') as HTMLElement;
    first.click();
    expect(host.selected).toBeNull();
  });

  describe('autofoco al cambiar de paso', () => {
    const flush = () => new Promise<void>((r) => setTimeout(r, 0));

    function wizardSetup() {
      TestBed.configureTestingModule({ imports: [WizardHostComponent] });
      const fixture = TestBed.createComponent(WizardHostComponent);
      document.body.appendChild(fixture.nativeElement);
      fixture.detectChanges();
      return fixture;
    }

    afterEach(() => {
      document.querySelectorAll('form').forEach((n) => n.remove());
    });

    it('no roba el foco en el montaje inicial', async () => {
      wizardSetup();
      await flush();
      expect(document.activeElement?.id).not.toBe('s0a');
    });

    it('lleva el foco al primer control del paso nuevo al avanzar', async () => {
      const fixture = wizardSetup();
      fixture.componentInstance.current.set(1);
      fixture.detectChanges();
      await flush();
      expect(document.activeElement?.id).toBe('s1a');
    });
  });
});
