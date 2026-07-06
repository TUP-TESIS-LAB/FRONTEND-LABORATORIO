import { createReducer, on } from '@ngrx/store';
import { initialValidacionDetalleState, ValidacionDetalleState } from './validacion-detalle.state';
import { loadDetalle, loadDetalleSuccess, loadDetalleFailure, validarTodo, mutarOk, mutarFail, firmarResultado, firmarEstudio, verPdf, verPdfSuccess, verPdfFailure } from './validacion-detalle.actions';

export const validacionDetalleReducer = createReducer(
  initialValidacionDetalleState,
  on(loadDetalle, (s): ValidacionDetalleState => ({ ...s, loading: true, error: null })),
  on(loadDetalleSuccess, (s, { detalle }): ValidacionDetalleState => ({ ...s, detalle, loading: false, error: null })),
  on(loadDetalleFailure, (s, { error }): ValidacionDetalleState => ({ ...s, loading: false, error })),
  on(validarTodo, firmarResultado, firmarEstudio, (s): ValidacionDetalleState => ({ ...s, saving: true, error: null })),
  on(mutarOk, (s): ValidacionDetalleState => ({ ...s, saving: false })),
  on(mutarFail, (s, { error }): ValidacionDetalleState => ({ ...s, saving: false, error })),
  // Ver PDF: solo controla el flag de descarga (deshabilita el botón). El error se notifica
  // por toast desde el effect, no se vuelca en `error` para no disparar el toast genérico de la página.
  on(verPdf, (s): ValidacionDetalleState => ({ ...s, pdfLoading: true })),
  on(verPdfSuccess, (s): ValidacionDetalleState => ({ ...s, pdfLoading: false })),
  on(verPdfFailure, (s): ValidacionDetalleState => ({ ...s, pdfLoading: false })),
);
