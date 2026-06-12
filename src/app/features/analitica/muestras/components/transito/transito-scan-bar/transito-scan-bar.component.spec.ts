import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { TransitoScanBarComponent } from './transito-scan-bar.component';

describe('TransitoScanBarComponent', () => {
  let fixture: ComponentFixture<TransitoScanBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransitoScanBarComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
    fixture = TestBed.createComponent(TransitoScanBarComponent);
  });

  it('placeholder menciona el Lote N cuando hay activo', () => {
    fixture.componentRef.setInput('activeLoteNumber', 2);
    fixture.componentRef.setInput('groupsCount', 1);
    fixture.detectChanges();
    const input = fixture.debugElement.query(By.css('input'));
    expect(input.nativeElement.placeholder).toContain('Lote 2');
  });

  it('placeholder menciona "crear un lote" sin lote activo', () => {
    fixture.componentRef.setInput('activeLoteNumber', null);
    fixture.componentRef.setInput('groupsCount', 1);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('input')).nativeElement.placeholder).toContain('crear');
  });

  it('emite enter con el código al apretar Enter', () => {
    fixture.componentRef.setInput('activeLoteNumber', null);
    fixture.componentRef.setInput('groupsCount', 1);
    let captured = '';
    fixture.componentInstance.enter.subscribe(code => captured = code);
    fixture.detectChanges();
    const input = fixture.debugElement.query(By.css('input'));
    input.nativeElement.value = 'MX-2606-12345';
    input.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(captured).toBe('MX-2606-12345');
  });

  it('botón "Enviar todo" disabled si groupsCount=0', () => {
    fixture.componentRef.setInput('activeLoteNumber', null);
    fixture.componentRef.setInput('groupsCount', 0);
    fixture.detectChanges();
    const btn = fixture.debugElement.query(By.css('button.send-all'));
    expect(btn.nativeElement.disabled).toBe(true);
  });
});
