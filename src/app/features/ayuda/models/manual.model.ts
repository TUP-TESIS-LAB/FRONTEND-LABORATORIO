/**
 * Manual de uso del sistema, tal como lo sirve el backend.
 *
 * Viene ya interpretado (no markdown): el backend parsea el corpus de ayuda y
 * devuelve bloques tipados, así que acá no hay que renderizar markdown ni
 * inyectar HTML. La única marca que sobrevive en el texto es `**negrita**`,
 * que resuelve el pipe `negrita` porque señala nombres de botones y estados.
 */

export type ManualBlockType = 'paragraph' | 'steps' | 'list';

export interface ManualBlock {
  type: ManualBlockType;
  /** Presente solo en `paragraph`. */
  text: string | null;
  /** Presente en `steps` y `list`. */
  items: string[];
}

/** Un flujo concreto: "Cómo saco un turno". */
export interface ManualTopic {
  id: string;
  title: string;
  blocks: ManualBlock[];
}

/** Un área de trabajo dentro de un módulo: "Caja", "Cobros". */
export interface ManualSection {
  id: string;
  title: string;
  topics: ManualTopic[];
}

/** Un módulo del sistema: "Base", "Turnos", "Financiero". */
export interface ManualChapter {
  id: string;
  title: string;
  sections: ManualSection[];
}

export interface Manual {
  chapters: ManualChapter[];
}
