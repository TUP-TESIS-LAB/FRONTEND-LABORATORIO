import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { describe, it, expect } from 'vitest';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FormControl } from '@angular/forms';
import { GeneralStepComponent, notFutureDateValidator } from './general-step.component';

function daysFromToday(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

@Component({
  standalone: true,
  imports: [GeneralStepComponent],
  template: `
    <pat-general-step [group]="group" [addressGroup]="address" [dniDuplicate]="dup()" [editMode]="edit" />
  `,
})
class HostCmp {
  private readonly fb = new FormBuilder();
  group = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    dni: ['', [Validators.required]],
    birthDate: [null as Date | null],
    gender: [null],
    sexAtBirth: [null],
    mobile: [''],
    email: [''],
  });
  address = this.fb.group({
    street: [''], streetNumber: [''], neighborhood: [''], city: [''], province: [''],
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

  it('renders the 6 identity fields + celular + email', () => {
    const fx = setup();
    const html = (fx.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('Apellido');
    expect(html).toContain('Nombre');
    expect(html).toContain('DNI');
    expect(html).toContain('Fecha de nacimiento');
    expect(html).toContain('Género');
    expect(html).toContain('Sexo registral');
    expect(html).toContain('Celular');
    expect(html).toContain('Email');
  });

  it('renders the address fields (5) inside Datos generales, sin contactos adicionales', () => {
    const fx = setup();
    const html = (fx.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('Domicilio');
    expect(html).toContain('Calle');
    expect(html).toContain('Barrio');
    expect(html).toContain('Provincia');
    // Ya no hay UI de contactos adicionales.
    expect(html).not.toContain('Otros contactos');
    expect((fx.nativeElement as HTMLElement).querySelector('pat-contact-section')).toBeNull();
    // Y no quedan Código postal / Depto (5 campos exactos).
    expect(html).not.toContain('Código postal');
    expect(html).not.toContain('Depto');
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

  it('shows the future-birthDate error and invalidates the control when a future date is picked', () => {
    const fx = setup();
    fx.componentInstance.group.get('birthDate')!.setValue(daysFromToday(1));
    fx.detectChanges();
    const html = (fx.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('La fecha de nacimiento no puede ser futura.');
    expect(fx.componentInstance.group.get('birthDate')!.hasError('futureDate')).toBe(true);
  });

  it('does not show the future-birthDate error for today or a past date', () => {
    const fx = setup();
    fx.componentInstance.group.get('birthDate')!.setValue(daysFromToday(0));
    fx.detectChanges();
    let html = (fx.nativeElement as HTMLElement).textContent ?? '';
    expect(html).not.toContain('La fecha de nacimiento no puede ser futura.');

    fx.componentInstance.group.get('birthDate')!.setValue(daysFromToday(-3650));
    fx.detectChanges();
    html = (fx.nativeElement as HTMLElement).textContent ?? '';
    expect(html).not.toContain('La fecha de nacimiento no puede ser futura.');
  });
});

describe('notFutureDateValidator', () => {
  it('rejects a future date with the futureDate error', () => {
    expect(notFutureDateValidator(new FormControl(daysFromToday(1)))).toEqual({ futureDate: true });
  });

  it('accepts today', () => {
    expect(notFutureDateValidator(new FormControl(daysFromToday(0)))).toBeNull();
  });

  it('accepts a past date', () => {
    expect(notFutureDateValidator(new FormControl(daysFromToday(-1)))).toBeNull();
  });

  it('accepts an ISO string in the past (hydrate path)', () => {
    expect(notFutureDateValidator(new FormControl('1990-05-20'))).toBeNull();
  });

  it('rejects a future ISO string', () => {
    const future = daysFromToday(5).toISOString().slice(0, 10);
    expect(notFutureDateValidator(new FormControl(future))).toEqual({ futureDate: true });
  });

  it('treats empty/invalid values as valid (required covers emptiness)', () => {
    expect(notFutureDateValidator(new FormControl(null))).toBeNull();
    expect(notFutureDateValidator(new FormControl(''))).toBeNull();
    expect(notFutureDateValidator(new FormControl('not-a-date'))).toBeNull();
  });
});
