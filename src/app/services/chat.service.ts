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

  sendMessage(text: string, sessionId?: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.base}/api/chat/message`, { text, sessionId })
      .pipe(
        catchError(() => of({ reply: 'Error de conexión con el servidor.' }))
      );
  }

  transferToAgent(sessionId?: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.base}/api/chat/transfer`, { sessionId })
      .pipe(
        catchError(() => of({ message: 'No se pudo contactar al agente humano.' }))
      );
  }

  getPromotions(): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(`${this.base}/api/chat/promotions`)
      .pipe(
        catchError(() => of([]))
      );
  }

  rateChat(rating: ChatRating): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.base}/api/chat/rate`, rating)
      .pipe(
        catchError(() => of({ success: false }))
      );
  }
}
