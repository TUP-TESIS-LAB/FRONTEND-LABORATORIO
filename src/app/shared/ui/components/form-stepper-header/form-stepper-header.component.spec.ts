import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { FormStepperHeaderComponent } from './form-stepper-header.component';
import { FormStep } from './form-step';

describe('FormStepperHeaderComponent', () => {
  let component: FormStepperHeaderComponent;
  let fixture: ComponentFixture<FormStepperHeaderComponent>;

  const sampleSteps: readonly FormStep[] = [
    { key: 'a', title: 'A', subtitle: 'Paso 1', required: true },
    { key: 'b', title: 'B', subtitle: 'Paso 2', required: false },
    { key: 'c', title: 'C', subtitle: 'Paso 3', required: false },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FormStepperHeaderComponent],
    });
    fixture = TestBed.createComponent(FormStepperHeaderComponent);
    component = fixture.componentInstance;
  });

  it('renders all steps', () => {
    fixture.componentRef.setInput('steps', sampleSteps);
    fixture.componentRef.setInput('currentIndex', 0);
    fixture.componentRef.setInput('visited', new Set([0]));
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('.app-stepper__item');
    expect(items.length).toBe(3);
  });

  it('marks step as current', () => {
    fixture.componentRef.setInput('steps', sampleSteps);
    fixture.componentRef.setInput('currentIndex', 1);
    fixture.componentRef.setInput('visited', new Set([0, 1]));
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('.app-stepper__item');
    expect(items[1].classList.contains('is-current')).toBe(true);
  });

  it('marks visited non-current as done', () => {
    fixture.componentRef.setInput('steps', sampleSteps);
    fixture.componentRef.setInput('currentIndex', 2);
    fixture.componentRef.setInput('visited', new Set([0, 1, 2]));
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('.app-stepper__item');
    expect(items[0].classList.contains('is-done')).toBe(true);
    expect(items[1].classList.contains('is-done')).toBe(true);
  });

  it('emits stepSelected on click of visited non-current', () => {
    fixture.componentRef.setInput('steps', sampleSteps);
    fixture.componentRef.setInput('currentIndex', 2);
    fixture.componentRef.setInput('visited', new Set([0, 1, 2]));
    fixture.detectChanges();
    let emitted: number | null = null;
    component.stepSelected.subscribe((i) => (emitted = i));
    const items = fixture.nativeElement.querySelectorAll('.app-stepper__item');
    (items[0] as HTMLElement).click();
    expect(emitted).toBe(0);
  });

  it('does not emit on click of locked step', () => {
    fixture.componentRef.setInput('steps', sampleSteps);
    fixture.componentRef.setInput('currentIndex', 0);
    fixture.componentRef.setInput('visited', new Set([0]));
    fixture.detectChanges();
    let emitted: number | null = null;
    component.stepSelected.subscribe((i) => (emitted = i));
    const items = fixture.nativeElement.querySelectorAll('.app-stepper__item');
    (items[2] as HTMLElement).click();
    expect(emitted).toBeNull();
  });
});
