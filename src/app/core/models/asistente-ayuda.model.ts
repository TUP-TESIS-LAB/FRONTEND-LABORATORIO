/** Rol de cada turno de la conversación con el asistente de ayuda. */
export type ChatRole = 'user' | 'assistant';

/** Un mensaje de la conversación (usado tanto en UI como en el request al back). */
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** Cuerpo del POST /api/v1/asistente/preguntas. */
export interface AskQuestionRequest {
  history: ChatMessage[];
  question: string;
}

/** Respuesta del asistente. */
export interface AskQuestionResponse {
  answer: string;
}

/** Forma persistida en localStorage: conversación + marca de tiempo para el TTL. */
export interface StoredConversation {
  messages: ChatMessage[];
  updatedAt: number; // epoch ms
}
