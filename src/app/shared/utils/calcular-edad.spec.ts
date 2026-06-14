import { describe, it, expect } from 'vitest';
import { calcularEdad } from './calcular-edad';

describe('calcularEdad', () => {
  it('devuelve null si birthDate es null o vacío', () => {
    expect(calcularEdad(null)).toBeNull();
    expect(calcularEdad('')).toBeNull();
  });

  it('calcula la edad respecto a una fecha de referencia', () => {
    const hoy = new Date(2026, 5, 14); // 14 jun local
    expect(calcularEdad('1972-03-01', hoy)).toBe(54);
  });

  it('resta un año si todavía no cumplió este año', () => {
    const hoy = new Date(2026, 5, 14); // 14 jun local
    expect(calcularEdad('1972-12-31', hoy)).toBe(53);
  });

  it('no suma un año si el cumpleaños es mañana (TZ-safe)', () => {
    const hoy = new Date(2026, 5, 14); // 14 jun local
    expect(calcularEdad('1990-06-15', hoy)).toBe(35);
  });

  it('cuenta el año si el cumpleaños es hoy', () => {
    const hoy = new Date(2026, 5, 14);
    expect(calcularEdad('1990-06-14', hoy)).toBe(36);
  });
});
