import { NegritaPipe } from './negrita.pipe';

describe('NegritaPipe', () => {
  const pipe = new NegritaPipe();

  it('devuelve un solo tramo plano cuando no hay marcadores', () => {
    expect(pipe.transform('Ingresá con tu correo.')).toEqual([
      { texto: 'Ingresá con tu correo.', fuerte: false },
    ]);
  });

  it('marca como fuerte lo que está entre dobles asteriscos', () => {
    expect(pipe.transform('Tocá **Guardar** para confirmar.')).toEqual([
      { texto: 'Tocá ', fuerte: false },
      { texto: 'Guardar', fuerte: true },
      { texto: ' para confirmar.', fuerte: false },
    ]);
  });

  it('soporta varios tramos en negrita en la misma línea', () => {
    const tramos = pipe.transform('Elegí **Empresa** y después **Usuarios**.');
    expect(tramos.filter((t) => t.fuerte).map((t) => t.texto)).toEqual(['Empresa', 'Usuarios']);
  });

  it('no emite tramos vacíos cuando la negrita abre el texto', () => {
    expect(pipe.transform('**Recepción:** Sacar turno.')).toEqual([
      { texto: 'Recepción:', fuerte: true },
      { texto: ' Sacar turno.', fuerte: false },
    ]);
  });

  it('devuelve vacío para null, undefined y string vacío', () => {
    expect(pipe.transform(null)).toEqual([]);
    expect(pipe.transform(undefined)).toEqual([]);
    expect(pipe.transform('')).toEqual([]);
  });

  it('no interpreta HTML: el texto viaja tal cual', () => {
    // El pipe nunca produce markup; si el corpus trajera etiquetas, quedan como texto.
    expect(pipe.transform('<b>hola</b>')).toEqual([{ texto: '<b>hola</b>', fuerte: false }]);
  });
});
