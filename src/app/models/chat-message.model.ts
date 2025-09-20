export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  html?: boolean;
  type?: 'promo' | 'info' | 'error' | 'default';
  time: string;
}

export interface ChatResponse {
  sessionId?: string;
  reply?: string;
  message?: string;
  documents?: any[];
  result?: any[];
}
