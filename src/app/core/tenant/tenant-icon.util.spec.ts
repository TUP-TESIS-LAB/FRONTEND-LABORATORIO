import { resolveTenantIcon, buildDefaultTenantIcon, mimeTypeForIcon } from './tenant-icon.util';

describe('resolveTenantIcon', () => {
  it('usa el logoUrl del tenant si existe', () => {
    expect(resolveTenantIcon('/assets/tenants/x/logo.svg', '#2563EB'))
      .toBe('/assets/tenants/x/logo.svg');
  });

  it('sin logoUrl (null, undefined o vacío), cae al default (círculo + silueta) con el color dado', () => {
    const result = resolveTenantIcon(null, '#F97316');
    expect(result).toBe(buildDefaultTenantIcon('#F97316'));
    expect(decodeURIComponent(result.split(',')[1])).toContain('fill="#F97316"');

    expect(resolveTenantIcon(undefined, '#F97316')).toBe(buildDefaultTenantIcon('#F97316'));
    expect(resolveTenantIcon('', '#F97316')).toBe(buildDefaultTenantIcon('#F97316'));
  });
});

describe('buildDefaultTenantIcon', () => {
  it('genera un SVG data-URI autocontenido (sin referencias externas)', () => {
    const uri = buildDefaultTenantIcon('#123456');
    expect(uri.startsWith('data:image/svg+xml')).toBe(true);
    const svg = decodeURIComponent(uri.split(',')[1]);
    expect(svg).toContain('fill="#123456"');
    expect(svg).toContain('data:image/png;base64,');
  });
});

describe('mimeTypeForIcon', () => {
  it('detecta el SVG data-URI generado por buildDefaultTenantIcon', () => {
    expect(mimeTypeForIcon(buildDefaultTenantIcon('#2563EB'))).toBe('image/svg+xml');
  });

  it('detecta un PNG en data-URI', () => {
    expect(mimeTypeForIcon('data:image/png;base64,AAAA')).toBe('image/png');
  });

  it('detecta por extensión .svg', () => {
    expect(mimeTypeForIcon('/assets/tenants/x/logo.svg')).toBe('image/svg+xml');
  });

  it('cualquier otra extensión se asume png', () => {
    expect(mimeTypeForIcon('/assets/tenants/x/logo.png')).toBe('image/png');
  });
});
