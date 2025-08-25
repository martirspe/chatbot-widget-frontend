export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  html?: boolean;
  time?: string;
}
