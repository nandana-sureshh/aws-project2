import { QueueProvider, QueueMessage } from '../interfaces/QueueProvider';

export class HttpMockQueueProvider implements QueueProvider {
  constructor(private readonly serviceUrlMap: Record<string, string>) {}

  async enqueue(queueName: string, message: Record<string, unknown>): Promise<string> {
    const url = this.serviceUrlMap[queueName];
    if (!url) {
      console.warn(`[HttpMockQueueProvider] No target URL for queue "${queueName}"`);
      return 'mock-id';
    }

    console.log(`[HttpMockQueueProvider] Dispatching message to queue "${queueName}" at ${url}:`, message);

    // Fire-and-forget background HTTP call to simulate queue dispatch
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    }).catch((err) => {
      console.error(`[HttpMockQueueProvider] Failed to dispatch to ${url}:`, err);
    });

    return 'mock-id';
  }

  async dequeue(queueName: string, maxMessages = 1): Promise<QueueMessage[]> {
    return [];
  }

  async deleteMessage(queueName: string, messageId: string): Promise<void> {}

  async purge(queueName: string): Promise<void> {}

  async getQueueLength(queueName: string): Promise<number> {
    return 0;
  }
}
