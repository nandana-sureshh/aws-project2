import { v4 as uuidv4 } from 'uuid';
import { QueueProvider, QueueMessage } from '../interfaces/QueueProvider';

export class LocalQueueProvider implements QueueProvider {
  private readonly queues = new Map<string, QueueMessage[]>();

  private getQueue(queueName: string): QueueMessage[] {
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
    }
    return this.queues.get(queueName)!;
  }

  async enqueue(queueName: string, message: Record<string, unknown>): Promise<string> {
    const id = uuidv4();
    const queueMessage: QueueMessage = {
      id,
      body: message,
      sentAt: new Date(),
    };
    this.getQueue(queueName).push(queueMessage);
    return id;
  }

  async dequeue(queueName: string, maxMessages = 1): Promise<QueueMessage[]> {
    const queue = this.getQueue(queueName);
    return queue.splice(0, maxMessages);
  }

  async deleteMessage(queueName: string, messageId: string): Promise<void> {
    const queue = this.getQueue(queueName);
    const index = queue.findIndex((m) => m.id === messageId);
    if (index !== -1) {
      queue.splice(index, 1);
    }
  }

  async purge(queueName: string): Promise<void> {
    this.queues.set(queueName, []);
  }

  async getQueueLength(queueName: string): Promise<number> {
    return this.getQueue(queueName).length;
  }
}
