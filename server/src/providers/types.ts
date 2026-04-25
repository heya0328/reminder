export interface SendMessageInput {
  userId: string;
  reminderId: string;
  title: string;
}

export interface SendMessageResult {
  ok: boolean;
  providerMessageId?: string;
  errorReason?: string;
}

export interface ReminderProvider {
  send(input: SendMessageInput): Promise<SendMessageResult>;
}
