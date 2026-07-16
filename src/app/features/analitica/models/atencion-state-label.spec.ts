import { AttentionState } from './atencion.model';
import {
  attentionGroupLabel,
  attentionGroupSeverity,
  buildAttentionStateGroups,
  ATTENTION_STATE_GROUPS,
} from './atencion-state-label';

describe('atencion-state-label — grupos', () => {
  describe('attentionGroupLabel', () => {
    it('colapsa las fases previas a extracción en "En espera"', () => {
      const waiting = [
        AttentionState.REGISTERING_GENERAL_DATA,
        AttentionState.REGISTERING_ANALYSES,
        AttentionState.AWAITING_CONFIRMATION,
        AttentionState.ON_COLLECTION_PROCESS,
        AttentionState.ON_BILLING_PROCESS,
      ];
      for (const s of waiting) {
        expect(attentionGroupLabel(s)).toBe('En espera');
      }
    });

    it('mapea los estados de extracción y terminales a su etiqueta', () => {
      expect(attentionGroupLabel(AttentionState.AWAITING_EXTRACTION)).toBe('Esperando extracción');
      expect(attentionGroupLabel(AttentionState.IN_EXTRACTION)).toBe('En extracción');
      expect(attentionGroupLabel(AttentionState.FINISHED)).toBe('Finalizada');
      expect(attentionGroupLabel(AttentionState.CANCELED)).toBe('Cancelada');
      expect(attentionGroupLabel(AttentionState.FAILED)).toBe('Fallida');
    });

    it('devuelve "—" para null/undefined', () => {
      expect(attentionGroupLabel(null)).toBe('—');
      expect(attentionGroupLabel(undefined)).toBe('—');
    });
  });

  describe('attentionGroupSeverity', () => {
    it('asigna la severidad correcta por grupo', () => {
      expect(attentionGroupSeverity(AttentionState.REGISTERING_GENERAL_DATA)).toBe('warn');
      expect(attentionGroupSeverity(AttentionState.AWAITING_EXTRACTION)).toBe('info');
      expect(attentionGroupSeverity(AttentionState.IN_EXTRACTION)).toBe('info');
      expect(attentionGroupSeverity(AttentionState.FINISHED)).toBe('success');
      expect(attentionGroupSeverity(AttentionState.CANCELED)).toBe('danger');
      expect(attentionGroupSeverity(AttentionState.FAILED)).toBe('danger');
    });

    it('devuelve "secondary" para null/undefined', () => {
      expect(attentionGroupSeverity(null)).toBe('secondary');
      expect(attentionGroupSeverity(undefined)).toBe('secondary');
    });
  });

  describe('buildAttentionStateGroups', () => {
    it('con FINANCIERO activo incluye cobro/facturación en "En espera"', () => {
      const groups = buildAttentionStateGroups(true);
      const espera = groups.find(g => g.label === 'En espera');
      expect(espera).toBeDefined();
      expect(espera!.states).toContain(AttentionState.ON_COLLECTION_PROCESS);
      expect(espera!.states).toContain(AttentionState.ON_BILLING_PROCESS);
    });

    it('con FINANCIERO apagado excluye cobro/facturación de "En espera"', () => {
      const groups = buildAttentionStateGroups(false);
      const espera = groups.find(g => g.label === 'En espera');
      expect(espera).toBeDefined();
      expect(espera!.states).not.toContain(AttentionState.ON_COLLECTION_PROCESS);
      expect(espera!.states).not.toContain(AttentionState.ON_BILLING_PROCESS);
      // Las fases no financieras siguen presentes.
      expect(espera!.states).toContain(AttentionState.REGISTERING_GENERAL_DATA);
    });

    it('ofrece un grupo único por etiqueta visible (5 grupos, sin "Fallida")', () => {
      const groups = buildAttentionStateGroups(true);
      expect(groups.map(g => g.label)).toEqual([
        'En espera',
        'Esperando extracción',
        'En extracción',
        'Finalizada',
        'Cancelada',
      ]);
    });

    it('NO ofrece el grupo "Fallida" (FAILED no se alcanza por flujo natural)', () => {
      const groups = buildAttentionStateGroups(true);
      expect(groups.map(g => g.label)).not.toContain('Fallida');
      expect(groups.some(g => g.states.includes(AttentionState.FAILED))).toBe(false);
    });
  });

  it('ATTENTION_STATE_GROUPS es el set con FINANCIERO activo', () => {
    const espera = ATTENTION_STATE_GROUPS.find(g => g.label === 'En espera');
    expect(espera!.states).toContain(AttentionState.ON_COLLECTION_PROCESS);
  });
});
