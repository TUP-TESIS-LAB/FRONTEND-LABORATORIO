import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { TenantDetailPage } from './tenant-detail.page';
import { SAAS_ADMIN_FEATURE_KEY, initialSaasAdminState } from '../../store/saas-admin.state';
import { loadTenant, loadTenantModules, loadTenantWhiteLabel, clearSelectedTenant } from '../../store/saas-admin.actions';

describe('TenantDetailPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TenantDetailPage],
      providers: [
        provideMockStore({ initialState: { [SAAS_ADMIN_FEATURE_KEY]: initialSaasAdminState } }),
        provideNoopAnimations(),
        provideRouter([]),
      ],
    });
  });

  it('dispatches load for tenant, modules and white-label on init', () => {
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(TenantDetailPage);
    fixture.componentRef.setInput('id', '5');
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(loadTenant({ id: 5 }));
    expect(spy).toHaveBeenCalledWith(loadTenantModules({ tenantId: 5 }));
    expect(spy).toHaveBeenCalledWith(loadTenantWhiteLabel({ tenantId: 5 }));
  });

  it('dispatches clearSelectedTenant on destroy', () => {
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(TenantDetailPage);
    fixture.componentRef.setInput('id', '5');
    fixture.detectChanges();
    fixture.destroy();
    expect(spy).toHaveBeenCalledWith(clearSelectedTenant());
  });
});
