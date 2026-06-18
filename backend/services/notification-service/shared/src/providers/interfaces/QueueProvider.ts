export interface QueueMessage {
  id: string;
  body: Record<string, unknown>;
  attributes?: Record<string, string>;
  sentAt: Date;
}

export interface QueueProvider {
  enqueue(queueName: string, message: Record<string, unknown>): Promise<string>;

  dequeue(queueName: string, maxMessages?: number): Promise<QueueMessage[]>;

  deleteMessage(queueName: string, messageId: string): Promise<void>;

  purge(queueName: string): Promise<void>;

  getQueueLength(queueName: string): Promise<number>;
}
