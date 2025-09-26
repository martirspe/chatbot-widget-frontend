import { Component, ViewChild, ElementRef, ViewEncapsulation, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatService } from 'app/services/chat.service';
import { ChatMessage } from 'app/models/chat-message.model';
import { formatTime } from 'app/common/utils/time.utils';
import { TimerManager } from 'app/common/utils/timer-manager';
import { Promotion } from 'app/models/promotion.model';

@Component({
  selector: 'chat-widget',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.css'],
  encapsulation: ViewEncapsulation.ShadowDom
})
export class ChatWidgetComponent implements OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('chatInput') chatInput!: ElementRef<HTMLInputElement>;

  chatForm: FormGroup;
  loading = false;
  isOpen = false;
  maximized = false;
  messages: ChatMessage[] = [];
  promotions: Promotion[] = [];
  sessionId?: string;
  failedCount = 0;
  awaitingAgentKeyword = false;
  agentTransferCompleted = false;
  showRating = false;
  userRating = 0;
  userComment = '';
  stars = [1, 2, 3, 4, 5];
  hasInteracted = false;
  ratingSubmitted = false;
  private timerManager = new TimerManager();
  readonly MAX_MESSAGES = 100; // Límite de mensajes en el historial

  constructor(private fb: FormBuilder, private chat: ChatService) {
    // Inicializa el formulario de chat con validación
    this.chatForm = this.fb.group({
      draft: ['', [Validators.required, Validators.pattern(/\S+/)]],
      comment: ['']
    });
  }

  // Abre o cierra el chat y muestra el mensaje de bienvenida
  toggleChat(): void {
    this.isOpen = !this.isOpen;
    this.messages = [];
    this.agentTransferCompleted = false;
    this.showRating = false;
    this.ratingSubmitted = false;
    this.chatForm.get('draft')?.enable();

    if (this.isOpen) {
      this.loading = true;
      this.chat.startSession().subscribe({
        next: r => {
          this.sessionId = r.sessionId;
          this.loading = false;
          this.addBotMessage('¡Hola! 😊 Soy <b>Lia</b>, experta en ventas con IA de MARRSO. ¿En qué puedo ayudarte?', true);
          this.focusInput();
        },
        error: err => {
          this.loading = false;
          this.addBotMessage('No se pudo iniciar la sesión. Intenta de nuevo.');
        }
      });
    }
  }

  // Alterna entre maximizar y minimizar el chat
  toggleMaximize(): void {
    this.maximized = !this.maximized;
  }

  // Envía el mensaje del usuario y gestiona la respuesta del bot
  sendMessage(): void {
    const control = this.chatForm.get('draft');
    const message = control?.value?.trim();
    if (!control?.valid || this.loading) return;

    if (this.showRating) {
      this.showRating = false;
      this.resetInactivityTimer();
    }

    this.addUserMessage(message);
    this.chatForm.reset();
    this.scrollToBottom();

    if (/promociones|novedades/i.test(message)) {
      this.showPromotions();
      return;
    }

    if (this.awaitingAgentKeyword && message.toLowerCase().includes('agente')) {
      this.handleTransfer();
      return;
    }

    this.loading = true;
    this.chat.sendMessage(message, this.sessionId).subscribe({
      next: r => {
        this.sessionId = r.sessionId;
        this.loading = false;

        if (this.isFailedResponse(r.response)) {
          this.failedCount++;
        } else {
          this.failedCount = 0;
        }

        if (this.failedCount >= 3) {
          this.awaitingAgentKeyword = true;
          this.addBotMessage('¿Deseas hablar con un agente humano? Escribe "agente" para transferirte.');
          this.failedCount = 0;
          this.scrollToBottom();
          return;
        }
        if (r.response) {
          const isHtml = /<\/?[a-z][\s\S]*>/i.test(r.response ?? '');
          this.addBotMessage(r.response ?? 'No tengo información relevante para tu consulta.', isHtml);
        }
        this.focusInput();
        this.scrollToBottom();
      },
      error: err => {
        this.loading = false;
        this.addBotMessage('Ocurrió un error al enviar tu mensaje. Por favor, intenta de nuevo.');
        this.scrollToBottom();
      }
    });
    this.hasInteracted = true;
    this.resetInactivityTimer();
  }

  // Solicita y muestra las promociones disponibles
  showPromotions(): void {
    this.loading = true;
    this.chat.getPromotions().subscribe({
      next: promos => {
        this.loading = false;
        this.promotions = promos;
        if (promos.length === 0) {
          this.addBotMessage('No hay promociones disponibles en este momento.');
        } else {
          this.addPromoMessage('Estas son las promociones disponibles:');
        }
        this.scrollToBottom();
      },
      error: err => {
        this.loading = false;
        this.addBotMessage('No se pudieron cargar las promociones. Intenta más tarde.');
        this.scrollToBottom();
      }
    });
  }

  // Realiza la transferencia a un agente humano
  private handleTransfer(): void {
    this.loading = true;
    this.chat.transferToAgent(this.sessionId).subscribe({
      next: r => {
        this.loading = false;
        this.addBotMessage(r.response || 'Un agente humano se pondrá en contacto contigo en breve.');
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
      },
      error: err => {
        this.loading = false;
        this.addBotMessage('No se pudo transferir a un agente humano. Intenta más tarde.');
        this.scrollToBottom();
      }
    });
  }

  // Envía la calificación del usuario sobre la atención recibida
  submitRating(): void {
    if (!this.sessionId || this.userRating < 1) return;
    this.chat.rateChat({
      sessionId: this.sessionId,
      rating: this.userRating,
      comment: this.userComment
    }).subscribe({
      next: res => {
        if (res.success) {
          this.addBotMessage('¡Gracias por calificarme! 👍');
          this.showRating = false;
          this.userRating = 0;
          this.userComment = '';
          this.ratingSubmitted = true;
        } else {
          this.addBotMessage('No se pudo registrar tu calificación. Intenta de nuevo.');
        }
        this.scrollToBottom();
      },
      error: err => {
        this.addBotMessage('Ocurrió un error al enviar tu calificación. Por favor, intenta de nuevo.');
        this.scrollToBottom();
      }
    });
  }

  // Limpia los temporizadores al destruir el componente
  ngOnDestroy(): void {
    this.timerManager.clearAll();
  }

  // Reinicia el temporizador de inactividad para mostrar la encuesta de satisfacción
  private resetInactivityTimer(): void {
    this.timerManager.clear('inactivity');
    if (this.hasInteracted && !this.ratingSubmitted) {
      this.timerManager.set('inactivity', () => {
        if (!this.ratingSubmitted) {
          this.showRating = true;
          this.scrollToBottom();
        }
      }, 60000);
    }
  }

  // Agrega el mensaje del usuario al historial y reinicia el temporizador de inactividad
  private addUserMessage(message: string): void {
    this.messages.push({
      role: 'user',
      message,
      time: formatTime(new Date().toISOString())
    });
    this.trimMessages();
    this.resetInactivityTimer();
  }

  // Agrega el mensaje del bot al historial y reinicia el temporizador de inactividad
  private addBotMessage(message: string, html = false): void {
    this.messages.push({
      role: 'bot',
      message,
      html,
      time: formatTime(new Date().toISOString())
    });
    this.trimMessages();
    this.resetInactivityTimer();
  }

  // Agrega un mensaje promocional al historial y reinicia el temporizador de inactividad
  private addPromoMessage(message: string): void {
    this.messages.push({
      role: 'bot',
      message,
      type: 'promo',
      time: formatTime(new Date().toISOString())
    });
    this.trimMessages();
    this.resetInactivityTimer();
  }

  // Limita la cantidad de mensajes en el historial
  private trimMessages(): void {
    if (this.messages.length > this.MAX_MESSAGES) {
      this.messages = this.messages.slice(-this.MAX_MESSAGES);
    }
  }

  // Determina si la respuesta del bot es fallida por frases conocidas
  private isFailedResponse(response?: string): boolean {
    if (!response) return false;
    const failedPhrases = [
      'no tengo información',
      'no tenemos información',
      'no contamos con información',
      'no tengo una respuesta',
      'no he podido resolver',
      'error de conexión'
    ];
    return failedPhrases.some(phrase => response.toLowerCase().includes(phrase));
  }

  // Desplaza la vista al final del contenedor de mensajes
  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        const el = this.messagesContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    }, 0);
  }

  // Enfoca el campo de entrada de texto del chat
  private focusInput(): void {
    setTimeout(() => {
      if (this.chatInput) {
        this.chatInput.nativeElement.focus();
      }
    }, 0);
  }
}

