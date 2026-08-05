import { Injectable } from '@angular/core';
import { TenantConfig } from '@core/models/tenant.model';
import { hexToHsl, hslToHex } from '@shared/utils/color.util';
import { resolveTenantIcon, mimeTypeForIcon } from './tenant-icon.util';

@Injectable({ providedIn: 'root' })
export class TenantThemeService {
  applyTheme(config: TenantConfig): void {
    const root = document.documentElement;
    const primary = this.safeColor(config.primaryColor);
    root.style.setProperty('--brand-primary',   primary);
    root.style.setProperty('--brand-secondary', config.secondaryColor);
    root.style.setProperty('--p-primary-color', primary);

    // La paleta categórica de los gráficos (--chart-1..8) NO se sobreescribe acá — es fija
    // y validada (`tokens.scss`), independiente de la marca del tenant. Ver `deriveChartPalette`
    // en `color.util.ts`: queda viva para el resto del chrome, pero sin este side-effect.

    // Favicon por tenant: su logo propio si subió uno, si no el default
    // (círculo con su color + tubo de ensayo). Misma regla que el sidebar.
    const iconUrl = resolveTenantIcon(config.logoUrl, config.primaryColor);
    const faviconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (faviconLink) {
      faviconLink.href = iconUrl;
      faviconLink.type = mimeTypeForIcon(iconUrl);
    }
  }

  private safeColor(hex: string): string {
    return this.isRedHue(hex) ? this.desaturate(hex, 0.4) : hex;
  }

  protected isRedHue(hex: string): boolean {
    const hue = hexToHsl(hex).h;
    return hue <= 20 || hue >= 340;
  }

  private desaturate(hex: string, amount: number): string {
    const { h, s, l } = hexToHsl(hex);
    return hslToHex(h, Math.max(0, s - amount), l);
  }
}
