import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

import {
  AskQuestionRequest,
  AskQuestionResponse,
  ChatMessage,
  StoredConversation,
} from '@core/models/asistente-ayuda.model';

/**
 * Estado y transporte del asistente de ayuda.
 *
 * - Mantiene la conversación en signals y la persiste en `localStorage` con un
 *   TTL de 24h (se limpia sola al vencer).
 * - El backend es stateless: en cada consulta se envía el historial recortado
 *   (últimos {@link MAX_HISTORY}) + la pregunta nueva.
 * - El token JWT lo adjunta el `authTokenInterceptor`; no lo maneja este servicio.
 */
@Injectable({ providedIn: 'root' })
export class AsistenteAyudaService {
  private static readonly STORAGE_KEY = 'asistente-conv';
  private static readonly TTL_MS = 24 * 60 * 60 * 1000;
  private static readonly MAX_HISTORY = 20;
  private static readonly ENDPOINT = '/api/v1/asistente/preguntas';

  private readonly http = inject(HttpClient);

  private readonly _messages = signal<ChatMessage[]>(this.restore());
  readonly messages = this._messages.asReadonly();
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * Apertura del panel de ayuda. Es estado de UI compartido: lo dispara el botón
   * del topbar y lo consume el widget (que se monta una vez en el `admin-shell`).
   */
  readonly open = signal(false);

  /** Abre o cierra el panel de ayuda (lo usa el botón del topbar). */
  toggle(): void {
    this.open.update((v) => !v);
  }

  /** Envía la pregunta; agrega el turno del usuario y, al responder, el del asistente. */
  send(question: string): void {
    const q = question.trim();
    if (!q || this.loading()) {
      return;
    }
    this.error.set(null);

    // El historial son los turnos previos (sin la pregunta nueva, que va aparte).
    const history = this.trimmedHistory();
    this.appendMessage({ role: 'user', content: q });
    this.loading.set(true);

    const body: AskQuestionRequest = { history, question: q };
    this.http.post<AskQuestionResponse>(AsistenteAyudaService.ENDPOINT, body).subscribe({
      next: (res) => {
        this.appendMessage({ role: 'assistant', content: res.answer ?? '' });
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(this.toSpanishError(err));
      },
    });
  }

  /** Vacía la conversación (y su copia persistida). */
  clear(): void {
    this._messages.set([]);
    this.error.set(null);
    this.persist();
  }

  private appendMessage(message: ChatMessage): void {
    this._messages.update((prev) => [...prev, message]);
    this.persist();
  }

  private trimmedHistory(): ChatMessage[] {
    const all = this._messages();
    return all.length <= AsistenteAyudaService.MAX_HISTORY
      ? all
      : all.slice(all.length - AsistenteAyudaService.MAX_HISTORY);
  }

  private restore(): ChatMessage[] {
    try {
      const raw = localStorage.getItem(AsistenteAyudaService.STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const stored = JSON.parse(raw) as StoredConversation;
      if (!Array.isArray(stored?.messages) || typeof stored.updatedAt !== 'number') {
        return [];
      }
      if (Date.now() - stored.updatedAt > AsistenteAyudaService.TTL_MS) {
        localStorage.removeItem(AsistenteAyudaService.STORAGE_KEY);
        return [];
      }
      return stored.messages;
    } catch {
      return [];
    }
  }

  private persist(): void {
    try {
      const payload: StoredConversation = {
        messages: this._messages(),
        updatedAt: Date.now(),
      };
      localStorage.setItem(AsistenteAyudaService.STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Modo privado / sin cuota: la conversación sigue viva en memoria.
    }
  }

  /**
   * Traduce el error HTTP a un mensaje en español, sin filtrar internals
   * (regla del proyecto). No se muestra el body crudo del backend.
   */
  private toSpanishError(err: HttpErrorResponse): string {
    switch (err.status) {
      case 400:
        return 'No pude entender la pregunta. Revisá el texto e intentá de nuevo.';
      case 429:
        return 'Hiciste muchas consultas seguidas. Esperá un momento e intentá de nuevo.';
      case 503:
        return 'El asistente no está disponible en este momento. Intentá más tarde.';
      case 0:
        return 'No hay conexión con el servidor. Verificá tu red e intentá de nuevo.';
      default:
        return 'No se pudo obtener una respuesta. Intentá de nuevo en unos minutos.';
    }
  }
}
