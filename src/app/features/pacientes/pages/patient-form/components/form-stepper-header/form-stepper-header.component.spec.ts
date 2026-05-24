import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { describe, it, expect, vi } from 'vitest';
import { FormStepperHeaderComponent } from './form-stepper-header.component';
import { PATIENT_FORM_STEPS } from '../../patient-form-steps';

@Component({
  standalone: true,
  imports: [FormStepperHeaderComponent],
  template: `
    <pat-form-stepper-header
      [steps]="steps"
      [currentIndex]="current"
      [visited]="visited"
      (stepSelected)="onStep($event)" />
  `,
})
class HostCmp {
  steps = PATIENT_FORM_STEPS;
  current = 1;
  visited = new Set<number>([0, 1]);
  onStep = vi.fn();
}

describe('FormStepperHeaderComponent', () => {
  it('renders one item per step with the step title', () => {
    const fx = TestBed.createComponent(HostCmp);
    fx.detectChanges();
    const html = (fx.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('Datos generales');
    expect(html).toContain('Dirección');
    expect(html).toContain('Coberturas');
    expect(html).toContain('Resumen');
  });

  it('marks the current step with the "current" class', () => {
    const fx = TestBed.createComponent(HostCmp);
    fx.detectChanges();
    const items = (fx.nativeElement as HTMLElement).querySelectorAll('[data-step]');
    expect(items[1].classList.contains('is-current')).toBe(true);
    expect(items[0].classList.contains('is-done')).toBe(true);
    expect(items[2].classList.contains('is-locked')).toBe(true);
  });

  it('emits stepSelected when clicking a done step', () => {
    const fx = TestBed.createComponent(HostCmp);
    fx.detectChanges();
    const done = (fx.nativeElement as HTMLElement).querySelector('[data-step="0"]') as HTMLElement;
    done.click();
    expect(fx.componentInstance.onStep).toHaveBeenCalledWith(0);
  });

  it('does NOT emit stepSelected when clicking a locked step', () => {
    const fx = TestBed.createComponent(HostCmp);
    fx.detectChanges();
    const locked = (fx.nativeElement as HTMLElement).querySelector('[data-step="2"]') as HTMLElement;
    locked.click();
    expect(fx.componentInstance.onStep).not.toHaveBeenCalled();
  });

  it('does NOT emit stepSelected when clicking the current step', () => {
    const fx = TestBed.createComponent(HostCmp);
    fx.detectChanges();
    const current = (fx.nativeElement as HTMLElement).querySelector('[data-step="1"]') as HTMLElement;
    current.click();
    expect(fx.componentInstance.onStep).not.toHaveBeenCalled();
  });
});
