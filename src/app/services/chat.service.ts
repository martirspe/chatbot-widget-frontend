import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private base = environment.apiBaseUrl;

  async sendMessage(text: string, sessionId?: string) {
    const r = await fetch(`${this.base}/api/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sessionId })
    });
    return r.json();
  }
}
