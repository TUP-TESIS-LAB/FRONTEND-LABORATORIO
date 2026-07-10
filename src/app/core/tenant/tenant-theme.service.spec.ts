import { TestBed } from '@angular/core/testing';
import { TenantThemeService } from './tenant-theme.service';
import { TenantConfig } from '@core/models/tenant.model';

const baseConfig: TenantConfig = {
  id: 'lab1', name: 'Lab', logoUrl: '', modules: [],
  primaryColor: '#2563eb',
  secondaryColor: '#0ea5a4',
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
    service.applyTheme({ ...baseConfig, primaryColor: '#e23a47' });
    expect(document.documentElement.style.getPropertyValue('--ds-danger')).toBe('#e23a47');
  });

  it('isRedHue returns true for hue in danger range', () => {
    expect((service as any).isRedHue('#e23a47')).toBe(true);
    expect((service as any).isRedHue('#2563eb')).toBe(false);
  });

  describe('favicon por tenant: logo propio si existe, si no círculo + tubo de ensayo', () => {
    function conLinkFavicon(): HTMLLinkElement {
      document.querySelector('link[rel="icon"]')?.remove();
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/x-icon';
      link.href = '/favicon.ico';
      document.head.appendChild(link);
      return link;
    }

    it('sin logoUrl, el favicon es el SVG data-URI con el color del tenant y la silueta neutra', () => {
      const link = conLinkFavicon();
      service.applyTheme(baseConfig);

      expect(link.type).toBe('image/svg+xml');
      expect(link.href.startsWith('data:image/svg+xml')).toBe(true);
      const svg = decodeURIComponent(link.href.split(',')[1]);
      expect(svg).toContain('fill="#2563eb"');
      expect(svg).toContain('data:image/png;base64,');
    });

    it('con logoUrl propio, el favicon usa ese logo y no el default', () => {
      const link = conLinkFavicon();
      service.applyTheme({ ...baseConfig, logoUrl: '/assets/tenants/x/logo.svg' });

      expect(link.href).toContain('/assets/tenants/x/logo.svg');
      expect(link.type).toBe('image/svg+xml');
    });
  });
});
