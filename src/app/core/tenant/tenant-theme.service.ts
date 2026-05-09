import { Injectable } from '@angular/core';
import { TenantConfig } from '@core/models/tenant.model';

@Injectable({ providedIn: 'root' })
export class TenantThemeService {
  applyTheme(config: TenantConfig): void {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary',   this.safeColor(config.brandPrimary));
    root.style.setProperty('--brand-secondary', config.brandSecondary);
    root.style.setProperty('--brand-accent',    config.brandAccent);
    root.style.setProperty('--p-primary-color', this.safeColor(config.brandPrimary));
  }

  private safeColor(hex: string): string {
    return this.isRedHue(hex) ? this.desaturate(hex, 0.4) : hex;
  }

  protected isRedHue(hex: string): boolean {
    const hue = this.hexToHsl(hex).h;
    return hue <= 20 || hue >= 340;
  }

  private hexToHsl(hex: string): { h: number; s: number; l: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
    return { h: Math.round(h * 360), s, l };
  }

  private desaturate(hex: string, amount: number): string {
    const { h, s, l } = this.hexToHsl(hex);
    return this.hslToHex(h, Math.max(0, s - amount), l);
  }

  private hslToHex(h: number, s: number, l: number): string {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hN = h / 360;
    const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(hue2rgb(p, q, hN + 1/3))}${toHex(hue2rgb(p, q, hN))}${toHex(hue2rgb(p, q, hN - 1/3))}`;
  }
}
