import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand, GetQueueAttributesCommand, Message } from '@aws-sdk/client-sqs';
import { QueueProvider, QueueMessage } from '../interfaces/QueueProvider';

export class SQSQueueProvider implements QueueProvider {
  private client: SQSClient;

  constructor(private readonly queueUrlMap: Record<string, string>, region: string) {
    this.client = new SQSClient({ region });
  }

  async enqueue(queueName: string, message: Record<string, unknown>): Promise<string> {
    const queueUrl = this.queueUrlMap[queueName];
    if (!queueUrl) {
      throw new Error(`Queue URL not found for queue: ${queueName}`);
    }

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message),
    });

    const response = await this.client.send(command);
    return response.MessageId!;
  }

  async dequeue(queueName: string, maxMessages = 1): Promise<QueueMessage[]> {
    const queueUrl = this.queueUrlMap[queueName];
    if (!queueUrl) {
      throw new Error(`Queue URL not found for queue: ${queueName}`);
    }

    const command = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: 20, // Enable long polling
    });

    const response = await this.client.send(command);
    if (!response.Messages) {
      return [];
    }

    return response.Messages.map((msg: Message) => ({
      id: msg.ReceiptHandle!,
      body: JSON.parse(msg.Body!) as Record<string, unknown>,
      sentAt: new Date(),
    }));
  }

  async deleteMessage(queueName: string, messageId: string): Promise<void> {
    const queueUrl = this.queueUrlMap[queueName];
    if (!queueUrl) {
      throw new Error(`Queue URL not found for queue: ${queueName}`);
    }

    const command = new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: messageId,
    });

    await this.client.send(command);
  }

  async purge(queueName: string): Promise<void> {
    throw new Error('Purge not implemented for SQS to prevent accidental data loss in prod.');
  }

  async getQueueLength(queueName: string): Promise<number> {
    const queueUrl = this.queueUrlMap[queueName];
    if (!queueUrl) {
      throw new Error(`Queue URL not found for queue: ${queueName}`);
    }

    const command = new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
      AttributeNames: ['ApproximateNumberOfMessages'],
    });

    const response = await this.client.send(command);
    return parseInt(response.Attributes?.ApproximateNumberOfMessages || '0', 10);
  }
}
