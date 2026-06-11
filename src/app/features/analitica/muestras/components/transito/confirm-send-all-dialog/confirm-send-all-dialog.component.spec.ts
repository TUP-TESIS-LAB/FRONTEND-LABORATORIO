import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { ConfirmSendAllDialogComponent } from './confirm-send-all-dialog.component';

describe('ConfirmSendAllDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmSendAllDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmSendAllDialogComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
    fixture = TestBed.createComponent(ConfirmSendAllDialogComponent);
  });

  it('muestra breakdown con totales', () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('breakdown', { enProceso: 3, enTransito: 2, groupsCount: 2 });
    fixture.detectChanges();
    const text = document.body.textContent ?? '';
    expect(text).toContain('5'); // total
    expect(text).toContain('3'); // en-proceso
    expect(text).toContain('2'); // en-transito
  });

  it('emite confirm al clickear Enviar', () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('breakdown', { enProceso: 1, enTransito: 1, groupsCount: 1 });
    fixture.detectChanges();
    let confirmed = 0;
    fixture.componentInstance.confirm.subscribe(() => confirmed++);
    const btn = document.body.querySelector('button.confirm') as HTMLButtonElement;
    btn.click();
    expect(confirmed).toBe(1);
  });
});
