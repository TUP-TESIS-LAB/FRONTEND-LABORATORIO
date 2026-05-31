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
    (stepSelected)="onSelect($event)" />`,
})
class HostComponent {
  steps = STEPS;
  current = signal(1);
  visited = signal<ReadonlySet<number>>(new Set([0, 1]));
  selected: number | null = null;
  onSelect(i: number): void { this.selected = i; }
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
});
