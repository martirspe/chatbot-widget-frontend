import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ChatResponse } from 'app/models/chat-message.model';
import { Promotion } from 'app/models/promotion.model';
import { ChatRating } from 'app/models/chat-rating.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  startSession(): Observable<{ sessionId: string }> {
    return this.http.post<{ sessionId: string }>(`${this.base}/api/chat/start-session`, {});
  }

  sendMessage(message: string, sessionId?: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.base}/api/chat/message`, { message, sessionId })
      .pipe(
        catchError(() => of({ response: 'Error de conexión con el servidor.' }))
      );
  }

  transferToAgent(sessionId?: string, message?: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.base}/api/chat/transfer`, { sessionId, message })
      .pipe(
        catchError(() => of({ response: 'No se pudo contactar al agente humano.' }))
      );
  }

  getTransferStatus(sessionId: string): Observable<{ sessionId?: string; status: 'none' | 'requested' | 'assigned' | 'completed' }>{
    // GET con body no es estándar; usamos query param por compatibilidad
    return this.http.get<{ sessionId?: string; status: 'none' | 'requested' | 'assigned' | 'completed' }>(`${this.base}/api/chat/transfer-status`, { params: { sessionId } })
      .pipe(
        catchError(() => of<{ sessionId?: string; status: 'none' | 'requested' | 'assigned' | 'completed' }>({ sessionId, status: 'none' }))
      );
  }

  openTransferStream(sessionId: string): EventSource | null {
    try {
      if (!('EventSource' in window)) return null;
      const url = `${this.base}/api/chat/transfer-stream?sessionId=${encodeURIComponent(sessionId)}`;
      return new EventSource(url, { withCredentials: false } as any);
    } catch {
      return null;
    }
  }

  getPromotions(): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(`${this.base}/api/chat/promotions`)
      .pipe(
        catchError(() => of([]))
      );
  }

  rateChat(rating: ChatRating): Observable<{ status: string; response: string }> {
    return this.http.post<{ status: string; response: string }>(`${this.base}/api/chat/rate`, rating)
      .pipe(
        catchError(() => of({ status: 'error', response: 'No se pudo guardar la calificación.' }))
      );
  }

  endSession(sessionId?: string): Observable<{ status: string }>{
    return this.http.post<{ status: string }>(`${this.base}/api/chat/end-session`, { sessionId })
      .pipe(
        catchError(() => of({ status: 'error' }))
      );
  }

  // Uso recomendado durante beforeunload para aumentar probabilidad de envío
  endSessionBeacon(sessionId?: string): void {
    try {
      if (!sessionId || !('navigator' in window) || typeof navigator.sendBeacon !== 'function') return;
      const url = `${this.base}/api/chat/end-session`;
      const blob = new Blob([JSON.stringify({ sessionId })], { type: 'application/json' });
      const sent = navigator.sendBeacon(url, blob);
      // Fallback: algunos navegadores pueden fallar; usar fetch keepalive
      if (!sent && 'fetch' in window) {
        try {
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
            keepalive: true,
            mode: 'cors',
            credentials: 'omit'
          });
        } catch { /* noop */ }
      }
    } catch {
      // Silencioso: no bloquear descarga de página
    }
  }
}
