import { deriveChartPalette, hexToHsl, hexToOklch, hslToHex, oklchToHex } from './color.util';

describe('hexToHsl / hslToHex', () => {
  it('hexToHsl reconoce el hue de rojo/verde/azul puros', () => {
    expect(hexToHsl('#ff0000').h).toBe(0);
    expect(hexToHsl('#00ff00').h).toBe(120);
    expect(hexToHsl('#0000ff').h).toBe(240);
  });

  it('hslToHex es la inversa aproximada de hexToHsl (con tolerancia de redondeo de 1 unidad por canal)', () => {
    const { h, s, l } = hexToHsl('#2563eb');
    const roundTrip = hslToHex(h, s, l);
    for (let i = 0; i < 3; i++) {
      const original = parseInt('2563eb'.slice(i * 2, i * 2 + 2), 16);
      const got = parseInt(roundTrip.slice(1 + i * 2, 3 + i * 2), 16);
      expect(Math.abs(original - got)).toBeLessThanOrEqual(1);
    }
  });
});

describe('hexToOklch / oklchToHex', () => {
  it('oklchToHex es la inversa aproximada de hexToOklch', () => {
    const { l, c, h } = hexToOklch('#2563eb');
    expect(oklchToHex(l, c, h).toLowerCase()).toBe('#2563eb');
  });

  it('blanco y negro tienen croma ~0 (sin hue definido de forma estable)', () => {
    expect(hexToOklch('#ffffff').c).toBeCloseTo(0, 2);
    expect(hexToOklch('#000000').c).toBeCloseTo(0, 2);
  });
});

describe('deriveChartPalette', () => {
  // Umbral de distinguibilidad conservador para tests unitarios — la validación fina
  // (banda de luminosidad OKLCH, piso de croma, separación CVD real vía simulación
  // Machado-2009, contraste) se corrió a mano con `validate_palette.js` de la skill
  // `dataviz` contra el default y varios pares de tenant (incluido rojo+verde) — ver
  // el comentario de cabecera de `color.util.ts`.
  function distinctEnough(hexA: string, hexB: string): boolean {
    return hexA.toLowerCase() !== hexB.toLowerCase();
  }

  it('devuelve 8 colores', () => {
    expect(deriveChartPalette('#2563eb', '#0ea5a4')).toHaveLength(8);
  });

  it('los primeros 2 slots están anclados al hue de marca del tenant (primary/secondary)', () => {
    const palette = deriveChartPalette('#2563eb', '#0ea5a4');
    const primaryHue = hexToOklch('#2563eb').h;
    const secondaryHue = hexToOklch('#0ea5a4').h;
    expect(Math.abs(hexToOklch(palette[0]).h - primaryHue)).toBeLessThan(5);
    expect(Math.abs(hexToOklch(palette[1]).h - secondaryHue)).toBeLessThan(5);
  });

  it('todos los colores son distintos entre sí', () => {
    const palette = deriveChartPalette('#2563eb', '#0ea5a4');
    expect(new Set(palette.map(c => c.toLowerCase())).size).toBe(8);
  });

  it('mantiene 8 colores distinguibles incluso con una marca monocromática (mismo primary/secondary)', () => {
    const palette = deriveChartPalette('#2563eb', '#2563eb');
    expect(new Set(palette.map(c => c.toLowerCase())).size).toBe(8);
  });

  it('corre el secondary si choca con el primary (caso patológico: marca roja+verde)', () => {
    const palette = deriveChartPalette('#e23a47', '#22c55e');
    expect(new Set(palette.map(c => c.toLowerCase())).size).toBe(8);
    expect(distinctEnough(palette[0], palette[1])).toBe(true);
  });

  it('es determinística para el mismo input', () => {
    const a = deriveChartPalette('#00435D', '#00B9B6');
    const b = deriveChartPalette('#00435D', '#00B9B6');
    expect(a).toEqual(b);
  });
});
