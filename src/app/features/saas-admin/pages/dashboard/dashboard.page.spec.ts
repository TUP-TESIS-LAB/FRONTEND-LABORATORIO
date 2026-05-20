import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { DashboardPage } from './dashboard.page';
import { SAAS_ADMIN_FEATURE_KEY, initialSaasAdminState } from '../../store/saas-admin.state';
import { loadTenants } from '../../store/saas-admin.actions';

describe('DashboardPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideMockStore({ initialState: { [SAAS_ADMIN_FEATURE_KEY]: initialSaasAdminState } }),
        provideNoopAnimations(),
        provideRouter([]),
      ],
    });
  });

  it('dispatches loadTenants on init', () => {
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(loadTenants());
  });

  it('renders the four counts', () => {
    const store = TestBed.inject(MockStore);
    store.setState({
      [SAAS_ADMIN_FEATURE_KEY]: {
        ...initialSaasAdminState,
        tenants: [
          { id: 1, code: 'a', name: 'A', status: 'ACTIVE',   active: true,  deletedAt: null },
          { id: 2, code: 'b', name: 'B', status: 'INACTIVE', active: true,  deletedAt: null },
          { id: 3, code: 'c', name: 'C', status: 'ACTIVE',   active: false, deletedAt: '2026-01-01' },
        ],
      },
    });
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Total');
    expect(text).toMatch(/Total[\s\S]*3/);
  });
});
