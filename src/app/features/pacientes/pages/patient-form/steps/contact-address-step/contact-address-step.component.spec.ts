import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { describe, it, expect } from 'vitest';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ContactAddressStepComponent } from './contact-address-step.component';

@Component({
  standalone: true,
  imports: [ContactAddressStepComponent],
  template: `<pat-contact-address-step [contacts]="contacts" [addresses]="addresses" />`,
})
class HostCmp {
  private readonly fb = new FormBuilder();
  contacts: FormArray<FormGroup> = this.fb.array<FormGroup>([]);
  addresses: FormArray<FormGroup> = this.fb.array<FormGroup>([]);
}

describe('ContactAddressStepComponent', () => {
  it('renders both subsection titles', () => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fx = TestBed.createComponent(HostCmp);
    fx.detectChanges();
    const html = (fx.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('Contactos');
    expect(html).toContain('Direcciones');
  });

  it('renders the underlying contact and address sections', () => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fx = TestBed.createComponent(HostCmp);
    fx.detectChanges();
    const root = fx.nativeElement as HTMLElement;
    expect(root.querySelector('pat-contact-section')).not.toBeNull();
    expect(root.querySelector('pat-address-section')).not.toBeNull();
  });
});
