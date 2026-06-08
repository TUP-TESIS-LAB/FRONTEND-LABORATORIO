// src/app/features/saas-admin/pages/tenant-wizard/tenant-wizard.page.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ActionsSubject, ScannedActionsSubject } from '@ngrx/store';
import { vi } from 'vitest';
import { TenantWizardPage } from './tenant-wizard.page';
import { createTenantSuccess } from '../../store/saas-admin.actions';
import { CreateTenantResponse } from '../../models/tenant.model';
import { SAAS_ADMIN_FEATURE_KEY, initialSaasAdminState } from '../../store/saas-admin.state';

const MOCK_TENANT: CreateTenantResponse = {
  id: 1, code: 'lab-x', name: 'Lab X',
  status: 'ACTIVE', active: true, deletedAt: null,
  ownerFirstLoginToken: 'tok-abc123',
};

describe('TenantWizardPage', () => {
  let fixture: ComponentFixture<TenantWizardPage>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantWizardPage],
      providers: [
        provideMockStore({
          initialState: { [SAAS_ADMIN_FEATURE_KEY]: initialSaasAdminState },
        }),
        { provide: ScannedActionsSubject, useExisting: ActionsSubject },
        provideRouter([]),
      ],
    }).compileComponents();
    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(TenantWizardPage);
  });

  describe('create mode (sin id)', () => {
    it('Step 1 muestra el bloque de administrador inicial', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.wizard-owner-section')).toBeTruthy();
    });

    it('muestra el modal de token tras createTenantSuccess', () => {
      fixture.detectChanges();
      store.dispatch(createTenantSuccess({ tenant: MOCK_TENANT }));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.token-modal')).toBeTruthy();
    });

    it('el modal contiene el token en el texto del link', () => {
      fixture.detectChanges();
      store.dispatch(createTenantSuccess({ tenant: MOCK_TENANT }));
      fixture.detectChanges();
      const modal = fixture.nativeElement.querySelector('.token-modal') as HTMLElement;
      expect(modal.textContent).toContain('tok-abc123');
    });

    it('botón copiar link escribe el link correcto al portapapeles', () => {
      const writeTextSpy = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextSpy },
        configurable: true,
      });
      fixture.detectChanges();
      store.dispatch(createTenantSuccess({ tenant: MOCK_TENANT }));
      fixture.detectChanges();

      const copyLinkWrapper = fixture.nativeElement.querySelector('[data-testid="copy-link-btn"]') as HTMLElement;
      copyLinkWrapper.querySelector<HTMLButtonElement>('button')!.click();

      expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('tok-abc123'));
      expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('/first-login?token='));
    });

    it('botón continuar cierra el modal y muestra el paso 2', () => {
      fixture.detectChanges();
      store.dispatch(createTenantSuccess({ tenant: MOCK_TENANT }));
      fixture.detectChanges();

      const continueWrapper = fixture.nativeElement.querySelector('[data-testid="continue-btn"]') as HTMLElement;
      continueWrapper.querySelector<HTMLButtonElement>('button')!.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.token-modal')).toBeNull();
      expect(fixture.nativeElement.querySelector('.wizard-modules')).toBeTruthy();
    });
  });

  describe('edit mode (con id)', () => {
    it('Step 1 no muestra el bloque de administrador inicial', () => {
      fixture.componentRef.setInput('id', '5');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.wizard-owner-section')).toBeNull();
    });
  });
});
