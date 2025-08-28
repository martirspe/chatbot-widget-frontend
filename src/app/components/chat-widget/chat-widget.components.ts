import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { ChatMessage } from '../../models/chat-message.model';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.css']
})
export class ChatWidgetComponent {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('chatInput') chatInput!: ElementRef<HTMLInputElement>;

  chatForm: FormGroup;
  loading = false;
  isOpen = false;
  maximized = false;
  messages: ChatMessage[] = [];
  draft: string = '';
  sessionId?: string;

  constructor(private fb: FormBuilder, private chat: ChatService) {
    this.chatForm = this.fb.group({
      draft: ['']
    });
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.loading = true;
      this.messages = [];
      setTimeout(() => {
        this.loading = false;
        this.messages = [
          {
            role: 'bot',
            text: '¡Hola! 😊 Soy <b>Lia</b>, tu asistente virtual. Cuéntame, ¿cómo puedo apoyarte hoy?',
            html: true,
            time: formatTime(new Date().toISOString())
          }
        ];
        this.scrollToBottom();
        if (this.chatInput) {
          this.chatInput.nativeElement.focus();
        }
      }, 1200);
    } else {
      this.messages = [];
    }
  }

  async sendMessage() {
    const text = this.chatForm.get('draft')?.value?.trim();
    if (!text || this.loading) return;
    this.messages.push({
      role: 'user',
      text,
      time: formatTime(new Date().toISOString())
    });
    this.chatForm.reset();
    this.scrollToBottom();

    this.loading = true;
    const r = await this.chat.sendMessage(text, this.sessionId);
    this.sessionId = r.sessionId;
    this.loading = false;

    if (r.documents && Array.isArray(r.documents) && r.documents.length > 0) {
      // Filtra documentos únicos por texto y fuente
      const uniqueDocs = Array.from(
        new Map(r.documents.map((doc: any) => [doc.text + doc.source, doc])).values()
      );

      let docsHtml = uniqueDocs.map((doc: any) =>
        `<div style="margin-bottom:8px;">
          <div style="font-weight:600; color:#1d4ed8;">${doc.title || doc.text?.slice(0, 40) || 'Documento'}</div>
          <div style="color:#059669;">${doc.subtitle || ''}</div>
          <a href="${doc.source}" target="_blank" style="color:#2563eb; font-size:14px;">${doc.source}</a>
        </div>`
      ).join('');
      this.messages.push({
        role: 'bot',
        text: docsHtml,
        html: true,
        time: r.createdAt ? formatTime(r.createdAt) : formatTime(new Date().toISOString())
      });
    } else if (r.result && Array.isArray(r.result) && r.result.length > 0) {
      let docsHtml = r.result.map((doc: any) =>
        `<div style="margin-bottom:8px;">
          <div style="font-weight:600; color:#1d4ed8;">${doc.title || doc.text?.slice(0, 40) || 'Documento'}</div>
          <div style="color:#059669;">${doc.subtitle || doc.text?.slice(0, 60) || ''}</div>
          <a href="${doc.source}" target="_blank" style="color:#2563eb; font-size:14px;">${doc.source}</a>
        </div>`
      ).join('');
      this.messages.push({
        role: 'bot',
        text: docsHtml,
        html: true,
        time: r.createdAt ? formatTime(r.createdAt) : formatTime(new Date().toISOString())
      });
    } else {
      this.messages.push({
        role: 'bot',
        text: r.reply || r.message || 'No se encontraron documentos.',
        time: r.createdAt ? formatTime(r.createdAt) : formatTime(new Date().toISOString())
      });
    }
    setTimeout(() => {
      this.scrollToBottom();
      if (this.chatInput) {
        this.chatInput.nativeElement.focus();
      }
    }, 0);
  }

  toggleMaximize() {
    this.maximized = !this.maximized;
  }

  private scrollToBottom() {
    if (this.messagesContainer) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}

// Helper function outside the class
function formatTime(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
