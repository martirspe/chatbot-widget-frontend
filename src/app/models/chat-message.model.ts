export interface ChatMessage {
  role: 'user' | 'bot';
  message: string;
  html?: boolean;
  type?: 'promo' | 'info' | 'error' | 'default';
  time: string;
}

export interface ChatResponse {
  sessionId?: string;
  response?: string;
  documents?: any[];
}
