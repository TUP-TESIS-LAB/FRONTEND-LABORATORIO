/**
 * Utilidades de colorimetría compartidas.
 *
 * `hexToHsl`/`hslToHex` vivían como métodos privados de `TenantThemeService`
 * (usados para `desaturate`/`isRedHue`, shell del sidebar) — se extraen acá tal
 * cual, sin cambios de comportamiento.
 *
 * `deriveChartPalette` es nueva: genera la paleta categórica de `ui-metric-chart`
 * en espacio **OKLCH** (no HSL) porque a lightness HSL igual, hues distintos (ej.
 * amarillo vs. azul) se perciben con luminosidad muy distinta — eso rompía la
 * banda de luminosidad perceptual y aplastaba el contraste de algunos colores.
 * La separación entre colores generados se optimiza contra la simulación de
 * daltonismo real (Machado, Oliveira & Fernandes 2009, protanopía/deuteranopía),
 * el mismo modelo que usa el validador `validate_palette.js` de la skill
 * `dataviz` — la fórmula de acá se validó corriendo ese script contra la paleta
 * default y contra varios pares de colores de tenant (incluido el caso patológico
 * de marca roja+verde) hasta pasar los 6 checks.
 */
export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function hexToHsl(hex: string): Hsl {
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

export function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hN = ((h % 360) + 360) % 360 / 360;
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(hue2rgb(p, q, hN + 1 / 3))}${toHex(hue2rgb(p, q, hN))}${toHex(hue2rgb(p, q, hN - 1 / 3))}`;
}

// ── OKLCH ────────────────────────────────────────────────────────────────────
// Conversión estándar sRGB ↔ OKLab/OKLCH (Björn Ottosson). A diferencia de HSL,
// mantener L y C constantes acá sí produce colores de luminosidad/vivacidad
// percibida uniforme sin importar el hue — por eso se usa para generar la
// paleta de gráficos en vez de HSL.
function hexToLinearRgb(hex: string): [number, number, number] {
  const s2lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return [
    s2lin(parseInt(hex.slice(1, 3), 16) / 255),
    s2lin(parseInt(hex.slice(3, 5), 16) / 255),
    s2lin(parseInt(hex.slice(5, 7), 16) / 255),
  ];
}

function linearRgbToHex(r: number, g: number, b: number): string {
  const lin2s = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  const toHex = (c: number) => Math.round(Math.min(1, Math.max(0, lin2s(c))) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = hexToLinearRgb(hex);
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
  const c = Math.hypot(a, bb);
  const h = ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

export function oklchToHex(l: number, c: number, h: number): string {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad), bb = c * Math.sin(hRad);
  const l_ = l + 0.3963377774 * a + 0.2158037573 * bb;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * bb;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * bb;
  const lc = l_ ** 3, mc = m_ ** 3, sc = s_ ** 3;
  const r = 4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc;
  const g = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc;
  const b = -0.0041960863 * lc - 0.7034186147 * mc + 1.7076147010 * sc;
  return linearRgbToHex(r, g, b);
}

// ── Simulación de daltonismo (Machado, Oliveira & Fernandes 2009) ──────────────
// Mismas matrices que `validate_palette.js` de la skill dataviz, para que la
// separación que optimizamos acá sea la misma métrica que el validador chequea.
const MACHADO: Record<'protan' | 'deutan', number[][]> = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
};

function linToLab(r: number, g: number, b: number): [number, number, number] {
  const X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
  const Z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(X / 0.95047), f(Y / 1.0), f(Z / 1.08883)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function simulateCvd(hex: string, kind: 'protan' | 'deutan'): [number, number, number] {
  const [r, g, b] = hexToLinearRgb(hex);
  const m = MACHADO[kind];
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  return [
    clamp(m[0][0] * r + m[0][1] * g + m[0][2] * b),
    clamp(m[1][0] * r + m[1][1] * g + m[1][2] * b),
    clamp(m[2][0] * r + m[2][1] * g + m[2][2] * b),
  ];
}

/** Peor ΔE (CIE76, sobre protanopía y deuteranopía) entre dos colores — cuanto más alto, más distinguibles. */
function worstCvdDeltaE(hexA: string, hexB: string): number {
  let worst = Infinity;
  for (const kind of ['protan', 'deutan'] as const) {
    const a = linToLab(...simulateCvd(hexA, kind));
    const b = linToLab(...simulateCvd(hexB, kind));
    worst = Math.min(worst, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
  }
  return worst;
}

/** Distancia angular entre dos hues (0-180, arco más corto del círculo). */
function hueDelta(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/** Lightness/croma base — banda legible (OKLCH L 0.43–0.77, C ≥ 0.10) sin importar el hue. */
const CHART_L = 0.62;
const CHART_C = 0.135;
/** Paso del grid de búsqueda (grados) al elegir el próximo hue más distinguible. */
const HUE_SEARCH_STEP = 6;
/** Umbral de colisión (ΔE) para correr el `secondary` si choca con el `primary` (ej. marca roja+verde). */
const ANCHOR_COLLISION_THRESHOLD = 12;

/**
 * A lightness/croma iguales, amarillo y naranja se perciben MUCHO más oscuros/sucios
 * ("marrón") que azul o violeta — no es un defecto del cálculo, es cómo funciona la
 * percepción del ojo (el amarillo alcanza su croma máximo a una luminosidad mucho más
 * alta que el resto de los hues). Sin este ajuste, los slots que caían en la franja
 * amarillo/naranja (~hue 30–160) salían "marrón caca" en vez de vívidos. Se sube L y C
 * con un pico gaussiano-triangular centrado en hue 95 (amarillo), decayendo a 0 a ±65°.
 */
function tuneForHue(hue: number): { l: number; c: number } {
  const dist = Math.min(Math.abs(hue - 95), 360 - Math.abs(hue - 95));
  const boost = Math.max(0, 1 - dist / 65);
  return { l: CHART_L + 0.13 * boost, c: CHART_C + 0.04 * boost };
}

/**
 * Bonus (peso bajo) por separación de hue en rueda de color de visión NORMAL, sumado al
 * score de seguridad CVD. Sin esto, el greedy puro-CVD amontonaba varios slots en la
 * franja verde/azul-verde (esa zona es "barata" en términos de ΔE bajo daltonismo) y
 * dejaba huecos de 130°+ sin ningún rojo/magenta/violeta — una paleta técnicamente
 * CVD-segura pero pobre en variedad para visión normal. El peso (0.7) se ajustó
 * corriendo `validate_palette.js` contra 6 pares de colores de tenant (incluido el caso
 * rojo+verde): valores mayores a ~1 empiezan a sacrificar la seguridad CVD por variedad.
 */
const HUE_SPREAD_WEIGHT = 0.7;

/** Entre los hues del grid, el que maximiza (distancia CVD + bonus de variedad de hue) contra los ya elegidos. */
function pickFarthestHue(existingHex: readonly string[], existingHue: readonly number[]): number {
  let bestHue = 0, bestScore = -1;
  for (let h = 0; h < 360; h += HUE_SEARCH_STEP) {
    const { l, c } = tuneForHue(h);
    const hex = oklchToHex(l, c, h);
    const cvdScore = Math.min(...existingHex.map(e => worstCvdDeltaE(e, hex)));
    const spreadScore = Math.min(...existingHue.map(e => hueDelta(e, h)));
    const score = cvdScore + HUE_SPREAD_WEIGHT * spreadScore;
    if (score > bestScore) { bestScore = score; bestHue = h; }
  }
  return bestHue;
}

/**
 * Paleta categórica FIJA de 8 colores derivada por colorimetría de la marca del tenant.
 * Los 2 colores de marca configurables por tenant (`primary`/`secondary`) anclan los
 * primeros 2 slots (normalizados a la misma banda L/C que el resto, para que sean
 * legibles como tinta de gráfico incluso si el hex de marca crudo es muy oscuro/claro/
 * gris); los 6 restantes se eligen greedily maximizando la distancia bajo simulación de
 * daltonismo contra todos los colores ya elegidos. Así un tenant con marca monocromática
 * (o directamente roja+verde) igual obtiene una paleta de serie completa y distinguible,
 * sin pedir prestado colores de estado semántico (`--ds-success/warning/danger/info`,
 * reservados para feedback, nunca para identidad de serie).
 *
 * Se asigna en orden fijo (nunca se re-cicla): la orden es en sí el mecanismo de
 * seguridad CVD. Fórmula validada corriendo `validate_palette.js` (skill `dataviz`)
 * contra el default y varios pares de tenant — ver comentario de archivo.
 */
export function deriveChartPalette(primary: string, secondary: string): string[] {
  const primaryHue = hexToOklch(primary).h;
  const primaryTone = tuneForHue(primaryHue);
  const primaryHex = oklchToHex(primaryTone.l, primaryTone.c, primaryHue);

  let secondaryHue = hexToOklch(secondary).h;
  let secondaryTone = tuneForHue(secondaryHue);
  let secondaryHex = oklchToHex(secondaryTone.l, secondaryTone.c, secondaryHue);

  // Caso patológico: la marca del tenant es literalmente roja+verde (el eje que
  // colapsa la deuteranopía). En vez de mantener el secondary tal cual, lo corremos
  // al hue más distinguible del primary.
  if (worstCvdDeltaE(primaryHex, secondaryHex) < ANCHOR_COLLISION_THRESHOLD) {
    secondaryHue = pickFarthestHue([primaryHex], [primaryHue]);
    secondaryTone = tuneForHue(secondaryHue);
    secondaryHex = oklchToHex(secondaryTone.l, secondaryTone.c, secondaryHue);
  }

  const palette = [primaryHex, secondaryHex];
  const hues = [primaryHue, secondaryHue];
  while (palette.length < 8) {
    const hue = pickFarthestHue(palette, hues);
    const { l, c } = tuneForHue(hue);
    palette.push(oklchToHex(l, c, hue));
    hues.push(hue);
  }
  return palette;
}
