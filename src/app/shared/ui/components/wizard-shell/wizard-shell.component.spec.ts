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
      heading="Mi wizard"
      [steps]="steps"
      [currentIndex]="0"
      [visited]="visited()"
      [customFooter]="true">
      <span headingBadge data-testid="badge">URGENTE</span>
      <div headerActions data-testid="actions">acciones</div>
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
      heading="Sin slots"
      breadcrumb="Inicio / Algo"
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
  it('proyecta los slots headingBadge, headerActions y wizardBanner', () => {
    const fixture = TestBed.createComponent(HostWithSlots);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('[data-testid="badge"]')?.textContent).toContain('URGENTE');
    expect(el.querySelector('[data-testid="actions"]')?.textContent).toContain('acciones');
    expect(el.querySelector('[data-testid="banner"]')?.textContent).toContain('banner');
    expect(el.querySelector('h1')?.textContent).toContain('Mi wizard');
    expect(el.textContent).toContain('contenido del paso');
  });

  it('el badge queda inline dentro del header (al lado del h1)', () => {
    const fixture = TestBed.createComponent(HostWithSlots);
    fixture.detectChanges();
    const header = fixture.nativeElement.querySelector('header');
    expect(header.querySelector('[data-testid="badge"]')).toBeTruthy();
  });

  it('sin usar los slots, sigue mostrando heading + breadcrumb (no rompe wizards existentes)', () => {
    const fixture = TestBed.createComponent(HostPlain);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toContain('Sin slots');
    expect(el.textContent).toContain('Inicio / Algo');
    expect(el.querySelector('[data-testid="badge"]')).toBeFalsy();
  });
});
