/**
 * Rasteriza un texto (la firma que el empleado escribe él mismo) a un canvas con
 * fuente tipo firma y devuelve un PNG dataURL. Lo usa el modo "texto" del
 * `SignatureInputComponent`; extraído a un util reutilizable.
 *
 * NO se usa para generar una firma automática: la firma es un acto que el empleado
 * debe realizar (dibujarla, subirla o escribirla). Sin firma cargada, el back rechaza
 * el intento de firmar un estudio.
 *
 * Devuelve `null` si no se puede obtener el contexto 2D del canvas.
 */
export function rasterizeSignatureText(text: string): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#1f2937';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = "italic 48px 'Brush Script MT', 'Segoe Script', cursive";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 20);
  return canvas.toDataURL('image/png');
}
