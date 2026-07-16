import { TestBed } from '@angular/core/testing';
import { RefreshIndicatorComponent } from './refresh-indicator.component';

describe('RefreshIndicatorComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('shows "Pausado" when paused=true', () => {
    const fixture = TestBed.createComponent(RefreshIndicatorComponent);
    fixture.componentRef.setInput('paused', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Pausado');
  });

  it('shows "Esperando primer dato..." when no lastRefreshAt yet', () => {
    const fixture = TestBed.createComponent(RefreshIndicatorComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Esperando');
  });

  it('shows seconds elapsed when lastRefreshAt is set', () => {
    const fixture = TestBed.createComponent(RefreshIndicatorComponent);
    const past = new Date(Date.now() - 12_000);
    fixture.componentRef.setInput('lastRefreshAt', past);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toMatch(/Actualizado hace \d+s/);
  });
});
