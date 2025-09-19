import { Component, ViewChild, ElementRef, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatService } from 'app/services/chat.service';
import { ChatMessage } from 'app/models/chat-message.model';
import { formatTime } from 'app/common/utils/time.utils';

@Component({
  selector: 'chat-widget',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.css'],
  encapsulation: ViewEncapsulation.ShadowDom
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
  ratingSubmitted = false;

  constructor(private fb: FormBuilder, private chat: ChatService) {
    this.chatForm = this.fb.group({ draft: [''], comment: [''] });
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    this.messages = [];
    this.agentTransferCompleted = false;
    this.showRating = false;
    this.chatForm.get('draft')?.enable();
    if (this.isOpen) {
      this.loading = true;
      setTimeout(() => {
        this.loading = false;
        this.addBotMessage('¡Hola! 😊 Soy <b>Lia</b>, tu asistente. ¿Cómo puedo ayudarte?', true);
        this.focusInput();
      }, 1200);
    }
  }

  sendMessage(): void {
    const text = this.chatForm.get('draft')?.value?.trim();
    if (!text || this.loading) return;

    if (this.showRating) {
      this.showRating = false;
      this.resetInactivityTimer();
    }

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
        const isHtml = /<\/?[a-z][\s\S]*>/i.test(r.reply ?? r.message ?? '');
        this.addBotMessage(r.reply ?? r.message ?? 'No tengo información relevante para tu consulta.', isHtml);
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
        `<div class="cw-promo">
          <div class="cw-promo-title">${p.title}</div>
          <div class="cw-promo-subtitle">${p.description}</div>
          ${p.validUntil ? `<div class="cw-promo-valid">Válido hasta: ${p.validUntil}</div>` : ''}
          ${p.url ? `<a class="cw-promo-link" href="${p.url}" target="_blank">Ver promoción</a>` : ''}
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
      if (!this.ratingSubmitted) {
        setTimeout(() => {
          this.showRating = true;
          this.scrollToBottom();
        }, 15000);
      }
    });
  }

  submitRating(): void {
    if (!this.sessionId || this.userRating < 1) return;
    this.chat.rateChat({
      sessionId: this.sessionId,
      rating: this.userRating,
      comment: this.userComment
    }).subscribe(res => {
      if (res.success) {
        this.addBotMessage('¡Gracias por tu calificación! 😊');
        this.showRating = false;
        this.userRating = 0;
        this.userComment = '';
        this.ratingSubmitted = true;
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
    if (this.hasInteracted && !this.ratingSubmitted) {
      this.inactivityTimer = setTimeout(() => {
        this.showRating = true;
        this.scrollToBottom();
      }, 90000); // 90 segundos
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
      'no tengo información',
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

