import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { WizardShellComponent } from './wizard-shell.component';
import { FormStep } from '@shared/ui/models/form-step';

const STEPS: FormStep[] = [
  { key: 'a', title: 'A' },
  { key: 'b', title: 'B' },
];

@Component({
  standalone: true,
  imports: [WizardShellComponent],
  template: `
    <ui-wizard-shell
      [steps]="steps"
      [currentIndex]="0"
      [visited]="visited()"
      [customFooter]="true">
      <div wizardFooterLeft data-testid="footer-left">acciones</div>
      <span wizardFooterCenter data-testid="footer-center">URGENTE</span>
      <div wizardBanner data-testid="banner">banner</div>
      <p>contenido del paso</p>
      <div wizardFooter data-testid="footer">botones</div>
    </ui-wizard-shell>
  `,
})
class HostWithSlots {
  steps = STEPS;
  visited = signal<ReadonlySet<number>>(new Set([0]));
}

@Component({
  standalone: true,
  imports: [WizardShellComponent],
  template: `
    <ui-wizard-shell
      [steps]="steps"
      [currentIndex]="0"
      [visited]="visited()">
      <p>contenido</p>
    </ui-wizard-shell>
  `,
})
class HostPlain {
  steps = STEPS;
  visited = signal<ReadonlySet<number>>(new Set([0]));
}

describe('WizardShellComponent', () => {
  it('no renderiza ningún <header> ni <h1> — el shell arranca directo en la tira de pasos', () => {
    const fixture = TestBed.createComponent(HostPlain);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('header')).toBeNull();
    expect(el.querySelector('h1')).toBeNull();
  });

  it('proyecta los slots wizardFooterLeft, wizardFooterCenter y wizardBanner', () => {
    const fixture = TestBed.createComponent(HostWithSlots);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('[data-testid="footer-left"]')?.textContent).toContain('acciones');
    expect(el.querySelector('[data-testid="footer-center"]')?.textContent).toContain('URGENTE');
    expect(el.querySelector('[data-testid="banner"]')?.textContent).toContain('banner');
    expect(el.textContent).toContain('contenido del paso');
  });

  it('wizardFooterLeft y wizardFooterCenter proyectan cada uno dentro de SU PROPIA zona del <footer>', () => {
    const fixture = TestBed.createComponent(HostWithSlots);
    fixture.detectChanges();
    const footer: HTMLElement = fixture.nativeElement.querySelector('footer');
    const zoneLeft = footer.querySelector('[data-testid="wizard-footer-left"]');
    const zoneCenter = footer.querySelector('[data-testid="wizard-footer-center"]');
    expect(zoneLeft).toBeTruthy();
    expect(zoneCenter).toBeTruthy();
    // El contenido proyectado debe caer específicamente dentro de SU zona, no de la otra
    // ni de "algún lugar del footer" — así una regresión que mande wizardFooterLeft a la
    // zona centro (o viceversa) hace fallar el test.
    expect(zoneLeft!.querySelector('[data-testid="footer-left"]')).toBeTruthy();
    expect(zoneLeft!.querySelector('[data-testid="footer-center"]')).toBeFalsy();
    expect(zoneCenter!.querySelector('[data-testid="footer-center"]')).toBeTruthy();
    expect(zoneCenter!.querySelector('[data-testid="footer-left"]')).toBeFalsy();
  });

  it('sin usar los slots nuevos, las zonas del footer existen pero quedan vacías', () => {
    const fixture = TestBed.createComponent(HostPlain);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const zoneLeft = el.querySelector('[data-testid="wizard-footer-left"]');
    const zoneCenter = el.querySelector('[data-testid="wizard-footer-center"]');
    // Las zonas del shell SIEMPRE se renderizan (son parte fija del footer) — lo que
    // debe faltar es contenido proyectado adentro, no la zona en sí.
    expect(zoneLeft).toBeTruthy();
    expect(zoneCenter).toBeTruthy();
    expect(zoneLeft!.children.length).toBe(0);
    expect(zoneCenter!.children.length).toBe(0);
    expect(zoneLeft!.textContent?.trim()).toBe('');
    expect(zoneCenter!.textContent?.trim()).toBe('');
  });
});
