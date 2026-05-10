import { TestBed } from '@angular/core/testing';
import { TenantThemeService } from './tenant-theme.service';
import { TenantConfig } from '@core/models/tenant.model';

const baseConfig: TenantConfig = {
  id: 'lab1', name: 'Lab', logoUrl: '', modules: [],
  brandPrimary: '#2563eb',
  brandSecondary: '#0ea5a4',
  brandAccent: '#f97316',
};

describe('TenantThemeService', () => {
  let service: TenantThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TenantThemeService);
  });

  it('should set --brand-primary CSS variable', () => {
    service.applyTheme(baseConfig);
    const val = document.documentElement.style.getPropertyValue('--brand-primary');
    expect(val).toBeTruthy();
  });

  it('should NOT modify --ds-danger', () => {
    document.documentElement.style.setProperty('--ds-danger', '#e23a47');
    service.applyTheme({ ...baseConfig, brandPrimary: '#e23a47' });
    expect(document.documentElement.style.getPropertyValue('--ds-danger')).toBe('#e23a47');
  });

  it('isRedHue returns true for hue in danger range', () => {
    expect((service as any).isRedHue('#e23a47')).toBe(true);
    expect((service as any).isRedHue('#2563eb')).toBe(false);
  });
});
