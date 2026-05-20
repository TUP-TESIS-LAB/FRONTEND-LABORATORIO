import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TenantWhiteLabelTabComponent } from './tenant-white-label-tab.component';
import { SAAS_ADMIN_FEATURE_KEY, initialSaasAdminState } from '../../../store/saas-admin.state';
import { upsertTenantWhiteLabel } from '../../../store/saas-admin.actions';

describe('TenantWhiteLabelTabComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TenantWhiteLabelTabComponent],
      providers: [
        provideMockStore({
          initialState: {
            [SAAS_ADMIN_FEATURE_KEY]: {
              ...initialSaasAdminState,
              selectedTenantWhiteLabel: {
                id: 1, targetTenantId: 1, systemName: 'Demo',
                primaryColor: '#1976D2', secondaryColor: '#424242',
                lightLogoUrl: null, darkLogoUrl: null, active: true,
              },
            },
          },
        }),
        provideNoopAnimations(),
      ],
    });
  });

  it('hydrates the form from the loaded white-label', () => {
    const fixture = TestBed.createComponent(TenantWhiteLabelTabComponent);
    fixture.componentRef.setInput('tenantId', 1);
    fixture.detectChanges();
    expect(fixture.componentInstance.form.get('systemName')!.value).toBe('Demo');
    expect(fixture.componentInstance.form.get('primaryColor')!.value).toBe('#1976D2');
  });

  it('save dispatches upsertTenantWhiteLabel with the form value', () => {
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(TenantWhiteLabelTabComponent);
    fixture.componentRef.setInput('tenantId', 1);
    fixture.detectChanges();
    fixture.componentInstance.form.patchValue({ systemName: 'New' });
    fixture.componentInstance.form.markAsDirty();
    fixture.componentInstance.save();
    expect(spy).toHaveBeenCalledWith(upsertTenantWhiteLabel({
      tenantId: 1,
      req: {
        systemName: 'New',
        primaryColor: '#1976D2',
        secondaryColor: '#424242',
        lightLogoUrl: null,
        darkLogoUrl: null,
      },
    }));
  });
});
