import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { AtencionDashboardComponent } from './atencion-dashboard.component';
import { ATENCION_FEATURE_KEY, initialAtencionState } from '../../../store/atencion/atencion.state';
import { downloadProtocolLabels } from '../../../store/atencion/atencion.actions';

describe('AtencionDashboardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AtencionDashboardComponent],
      providers: [
        provideMockStore({ initialState: { [ATENCION_FEATURE_KEY]: initialAtencionState } }),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    });
  });

  it('downloadLabels despacha downloadProtocolLabels', () => {
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(AtencionDashboardComponent);
    fixture.componentInstance.downloadLabels({ id: 1, protocolId: 9 } as any);
    expect(spy).toHaveBeenCalledWith(downloadProtocolLabels({ protocolId: 9, protocolNumber: 'P-9' }));
  });

  it('embedded=true oculta el header (título + Nueva atención) y las KPI cards', () => {
    const fixture = TestBed.createComponent(AtencionDashboardComponent);
    fixture.componentRef.setInput('embedded', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Nueva atención');
    expect(fixture.nativeElement.querySelector('ui-stat-card')).toBeNull();
  });

  it('embedded=false (default) muestra header y KPIs', () => {
    const fixture = TestBed.createComponent(AtencionDashboardComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nueva atención');
  });
});
