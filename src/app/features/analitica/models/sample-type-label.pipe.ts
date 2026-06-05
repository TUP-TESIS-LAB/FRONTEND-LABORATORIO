import { Pipe, PipeTransform } from '@angular/core';

/**
 * Traduce el enum `SampleType` del backend (BLOOD, URINE, …) a su etiqueta en
 * español para la UI. El API devuelve el enum crudo (contrato estable); la
 * traducción es responsabilidad de la capa de presentación (Regla #4: nada en
 * inglés en la UI).
 *
 * Valores del enum backend: BLOOD, URINE, STOOL, SPUTUM, SALIVA, SWAB, TISSUE, OTHER.
 */
const SAMPLE_TYPE_LABELS: Record<string, string> = {
  BLOOD: 'Sangre',
  URINE: 'Orina',
  STOOL: 'Materia fecal',
  SPUTUM: 'Esputo',
  SALIVA: 'Saliva',
  SWAB: 'Hisopado',
  TISSUE: 'Tejido',
  OTHER: 'Otro',
};

@Pipe({ name: 'sampleTypeLabel', standalone: true })
export class SampleTypeLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '—';
    // Normalizamos a mayúsculas para tolerar variantes; si no es un valor
    // conocido del enum lo devolvemos tal cual (ya podría venir traducido).
    return SAMPLE_TYPE_LABELS[value.toUpperCase()] ?? value;
  }
}
