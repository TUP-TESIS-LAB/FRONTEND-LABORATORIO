import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { describe, it, expect } from 'vitest';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { GeneralStepComponent } from './general-step.component';

@Component({
  standalone: true,
  imports: [GeneralStepComponent],
  template: `
    <pat-general-step [group]="group" [dniDuplicate]="dup()" [editMode]="edit" />
  `,
})
class HostCmp {
  private readonly fb = new FormBuilder();
  group = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    dni: ['', [Validators.required]],
    birthDate: [null],
    gender: [null],
    sexAtBirth: [null],
  });
  dup = signal(false);
  edit = false;
}

describe('GeneralStepComponent', () => {
  function setup(edit = false) {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fx = TestBed.createComponent(HostCmp);
    fx.componentInstance.edit = edit;
    fx.detectChanges();
    return fx;
  }

  it('renders the 6 general fields', () => {
    const fx = setup();
    const html = (fx.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('Apellido');
    expect(html).toContain('Nombre');
    expect(html).toContain('DNI');
    expect(html).toContain('Fecha de nacimiento');
    expect(html).toContain('Género');
    expect(html).toContain('Sexo registral');
  });

  it('shows the duplicate-DNI error when dniDuplicate is true', () => {
    const fx = setup();
    fx.componentInstance.dup.set(true);
    fx.detectChanges();
    const html = (fx.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('Ya existe un paciente con ese DNI');
  });

  it('does not show the duplicate-DNI error when dniDuplicate is false', () => {
    const fx = setup();
    const html = (fx.nativeElement as HTMLElement).textContent ?? '';
    expect(html).not.toContain('Ya existe un paciente con ese DNI');
  });

  it('disables the dni input when editMode is true', () => {
    const fx = setup(true);
    const dniInput = (fx.nativeElement as HTMLElement).querySelector('input[formcontrolname="dni"]') as HTMLInputElement;
    expect(dniInput.disabled).toBe(true);
  });
});
