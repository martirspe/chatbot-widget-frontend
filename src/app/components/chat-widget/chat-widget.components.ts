import { Component, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatService } from 'app/services/chat.service';
import { ChatMessage } from 'app/models/chat-message.model';
import { generateDocsHtml } from 'app/common/utils/chat-html.utils';
import { formatTime } from 'app/common/utils/time.utils';

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
  sessionId?: string;
  failedCount = 0;
  awaitingAgentKeyword = false;
  agentTransferCompleted = false;
  showRating = false;
  userRating = 0;
  userComment = '';
  stars = [1, 2, 3, 4, 5];
  private inactivityTimer: any;
  hasInteracted = false;

  constructor(private fb: FormBuilder, private chat: ChatService) {
    this.chatForm = this.fb.group({ draft: [''], comment: [''] });
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    this.messages = [];
    this.agentTransferCompleted = false;
    this.chatForm.get('draft')?.enable();
    if (this.isOpen) {
      this.loading = true;
      setTimeout(() => {
        this.loading = false;
        this.addBotMessage('¡Hola! 😊 Soy <b>Lia</b>, tu asistente virtual. Cuéntame, ¿cómo puedo apoyarte hoy?', true);
        this.focusInput();
      }, 1200);
    }
  }

  sendMessage(): void {
    const text = this.chatForm.get('draft')?.value?.trim();
    if (!text || this.loading) return;

    this.addUserMessage(text);
    this.chatForm.reset();
    this.scrollToBottom();

    // Si el usuario pide promociones
    if (/promociones|novedades/i.test(text)) {
      this.showPromotions();
      return;
    }

    // Transferencia por palabra clave
    if (this.awaitingAgentKeyword && text.toLowerCase().includes('agente')) {
      this.handleTransfer();
      return;
    }

    this.loading = true;
    this.chat.sendMessage(text, this.sessionId).subscribe(r => {
      this.sessionId = r.sessionId;
      this.loading = false;

      if (this.isFailedResponse(r.reply)) {
        this.failedCount++;
      } else {
        this.failedCount = 0;
      }

      // Si hay 3 fallidas, vuelve a preguntar por agente humano
      if (this.failedCount >= 3) {
        this.awaitingAgentKeyword = true;
        this.addBotMessage('¿Deseas hablar con un agente humano? Escribe "agente" para transferirte.');
        this.failedCount = 0;
        this.scrollToBottom();
        return;
      }

      if (r.reply || r.message) {
        this.addBotMessage(r.reply ?? r.message ?? 'No se encontraron documentos.');
      }

      if (r.documents && Array.isArray(r.documents) && r.documents.length > 0) {
        this.addBotMessage(generateDocsHtml(r.documents), true);
        this.awaitingAgentKeyword = false;
      } else if (r.result && Array.isArray(r.result) && r.result.length > 0) {
        this.addBotMessage(generateDocsHtml(r.result), true);
        this.awaitingAgentKeyword = false;
      }
      this.focusInput();
      this.scrollToBottom();
    });
    this.hasInteracted = true;
    this.resetInactivityTimer();
  }

  toggleMaximize(): void {
    this.maximized = !this.maximized;
  }

  // Obtener y mostrar promociones
  showPromotions(): void {
    this.loading = true;
    this.chat.getPromotions().subscribe(promos => {
      this.loading = false;
      if (promos.length === 0) {
        this.addBotMessage('No hay promociones disponibles en este momento.');
        this.scrollToBottom();
        return;
      }
      const promosHtml = promos.map(p =>
        `<div style="margin-bottom:12px;">
        <div style="font-weight:600; color:#1d4ed8;">${p.title}</div>
        <div>${p.description}</div>
        ${p.validUntil ? `<div style="font-size:12px; color:#666;">Válido hasta: ${p.validUntil}</div>` : ''}
        ${p.url ? `<a href="${p.url}" target="_blank" style="color:#2563eb;">Ver promoción</a>` : ''}
      </div>`
      ).join('');
      this.addBotMessage(promosHtml, true);
      this.scrollToBottom();
    });
  }

  private handleTransfer(): void {
    this.loading = true;
    this.chat.transferToAgent(this.sessionId).subscribe(r => {
      this.loading = false;
      this.addBotMessage(r.message || 'Un agente humano se pondrá en contacto contigo en breve.');
      this.failedCount = 0;
      this.awaitingAgentKeyword = false;
      this.agentTransferCompleted = true;
      this.chatForm.get('draft')?.disable();
      this.focusInput();
      this.scrollToBottom();
      this.showRating = true;
    });
  }

  submitRating(): void {
    if (this.userRating < 1) return;
    this.chat.rateChat({
      sessionId: this.sessionId!,
      rating: this.userRating,
      comment: this.userComment
    }).subscribe(res => {
      if (res.success) {
        this.addBotMessage('¡Gracias por tu calificación! 😊');
        this.showRating = false;
        this.userRating = 0;
        this.userComment = '';
      } else {
        this.addBotMessage('No se pudo registrar tu calificación. Intenta de nuevo.');
      }
      this.scrollToBottom();
    });
  }

  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    if (this.hasInteracted) {
      this.inactivityTimer = setTimeout(() => {
        this.showRating = true;
        this.scrollToBottom();
      }, 60000); // 60 segundos
    }
  }

  // Llama a resetInactivityTimer() cada vez que agregues un mensaje
  private addUserMessage(text: string): void {
    this.messages.push({
      role: 'user',
      text,
      time: formatTime(new Date().toISOString())
    });
    this.resetInactivityTimer();
  }

  private addBotMessage(text: string, html = false): void {
    this.messages.push({
      role: 'bot',
      text,
      html,
      time: formatTime(new Date().toISOString())
    });
    this.resetInactivityTimer();
  }

  private isFailedResponse(reply?: string): boolean {
    if (!reply) return false;
    const failedPhrases = [
      'no se encontraron documentos',
      'no se encontró información',
      'no tengo una respuesta',
      'no he podido resolver',
      'error de conexión'
    ];
    return failedPhrases.some(phrase => reply.toLowerCase().includes(phrase));
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        const el = this.messagesContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    }, 0);
  }

  private focusInput(): void {
    setTimeout(() => {
      if (this.chatInput) {
        this.chatInput.nativeElement.focus();
      }
    }, 0);
  }
}

