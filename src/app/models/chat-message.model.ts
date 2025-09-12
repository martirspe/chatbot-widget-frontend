export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  html?: boolean;
  time?: string;
}

export interface ChatResponse {
  sessionId?: string;
  reply?: string;
  message?: string;
  documents?: any[];
  result?: any[];
}
