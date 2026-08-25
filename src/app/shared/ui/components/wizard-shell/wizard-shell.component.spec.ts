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

  it('wizardFooterLeft y wizardFooterCenter viven dentro del <footer>', () => {
    const fixture = TestBed.createComponent(HostWithSlots);
    fixture.detectChanges();
    const footer = fixture.nativeElement.querySelector('footer');
    expect(footer.querySelector('[data-testid="footer-left"]')).toBeTruthy();
    expect(footer.querySelector('[data-testid="footer-center"]')).toBeTruthy();
  });

  it('sin usar los slots nuevos, no rompe (quedan vacíos, sin agregar texto)', () => {
    const fixture = TestBed.createComponent(HostPlain);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="footer-left"]')).toBeFalsy();
    expect(el.querySelector('[data-testid="footer-center"]')).toBeFalsy();
  });
});
