import { ManualChapter } from '../models/manual.model';
import { contarOcultas, filtrarPorAcceso } from './filtrar-por-acceso';

function seccion(id: string, accessSections: string[]) {
  return {
    id,
    title: id,
    accessSections,
    topics: [{ id: `${id}-t`, title: 't', blocks: [] }],
  };
}

function manual(): ManualChapter[] {
  return [
    {
      id: 'core',
      title: 'Base',
      sections: [
        seccion('ingresar', []),
        seccion('empresa', ['EMPRESA']),
        seccion('muestras', ['PREANALITICA', 'ANALITICA', 'POSTANALITICA']),
      ],
    },
    {
      id: 'financiero',
      title: 'Financiero',
      sections: [seccion('caja', ['FINANCIERO'])],
    },
  ];
}

const con = (...codigos: string[]) => (c: string) => codigos.includes(c);

describe('filtrarPorAcceso', () => {
  it('deja siempre las secciones sin códigos', () => {
    const r = filtrarPorAcceso(manual(), con());
    expect(r).toHaveLength(1);
    expect(r[0].sections.map((s) => s.id)).toEqual(['ingresar']);
  });

  it('deja una sección cuando el usuario tiene su código', () => {
    const r = filtrarPorAcceso(manual(), con('EMPRESA'));
    expect(r[0].sections.map((s) => s.id)).toEqual(['ingresar', 'empresa']);
  });

  it('alcanza con tener uno de varios códigos', () => {
    // El circuito de la muestra cruza tres secciones de acceso: alguien que solo
    // hace recolección (preanalítica) igual necesita leerlo.
    const r = filtrarPorAcceso(manual(), con('PREANALITICA'));
    expect(r[0].sections.map((s) => s.id)).toEqual(['ingresar', 'muestras']);
  });

  it('saca del índice el capítulo que se queda sin secciones', () => {
    const r = filtrarPorAcceso(manual(), con('EMPRESA'));
    expect(r.map((c) => c.id)).toEqual(['core']);
  });

  it('con todos los códigos devuelve el manual entero', () => {
    const todos = manual();
    const r = filtrarPorAcceso(todos, con('EMPRESA', 'PREANALITICA', 'FINANCIERO'));
    expect(r).toHaveLength(2);
    expect(contarOcultas(todos, r)).toBe(0);
  });

  it('no muta el manual original', () => {
    const original = manual();
    filtrarPorAcceso(original, con('EMPRESA'));
    expect(original[0].sections).toHaveLength(3);
    expect(original).toHaveLength(2);
  });
});

describe('contarOcultas', () => {
  it('cuenta las secciones que quedaron afuera', () => {
    const todos = manual();
    expect(contarOcultas(todos, filtrarPorAcceso(todos, con()))).toBe(3);
    expect(contarOcultas(todos, filtrarPorAcceso(todos, con('EMPRESA')))).toBe(2);
  });
});
