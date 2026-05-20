import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TenantModulesTabComponent } from './tenant-modules-tab.component';
import { SAAS_ADMIN_FEATURE_KEY, initialSaasAdminState } from '../../../store/saas-admin.state';
import { toggleTenantModule } from '../../../store/saas-admin.actions';

describe('TenantModulesTabComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TenantModulesTabComponent],
      providers: [
        provideMockStore({
          initialState: {
            [SAAS_ADMIN_FEATURE_KEY]: { ...initialSaasAdminState, selectedTenantModules: ['PORTAL'] },
          },
        }),
        provideNoopAnimations(),
      ],
    });
  });

  it('shows the 5 activable modules and reflects the enabled set', () => {
    const fixture = TestBed.createComponent(TenantModulesTabComponent);
    fixture.componentRef.setInput('tenantId', 1);
    fixture.detectChanges();
    expect(fixture.componentInstance.isEnabled('PORTAL')).toBe(true);
    expect(fixture.componentInstance.isEnabled('TURNOS')).toBe(false);
  });

  it('toggle dispatches toggleTenantModule with the requested enable value', () => {
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(TenantModulesTabComponent);
    fixture.componentRef.setInput('tenantId', 1);
    fixture.detectChanges();
    fixture.componentInstance.onToggle('TURNOS', true);
    expect(spy).toHaveBeenCalledWith(toggleTenantModule({ tenantId: 1, code: 'TURNOS', enable: true }));
  });
});
