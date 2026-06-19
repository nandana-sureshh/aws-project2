import { createQueueProvider } from '@caresync/shared';
import { processDocumentSummary } from '../services/ai.service';

export async function startSqsWorker() {
  if (process.env.QUEUE_PROVIDER !== 'sqs') {
    console.log('[ai-service] SQS Worker not started because QUEUE_PROVIDER is not "sqs".');
    return;
  }

  const queueProvider = createQueueProvider();
  console.log('[ai-service] Starting SQS Worker loop for "ai-summary" queue...');

  const poll = async () => {
    try {
      // Dequeue up to 10 messages with long polling (20s)
      const messages = await queueProvider.dequeue('ai-summary', 10);
      
      for (const msg of messages) {
        try {
          const documentId = msg.data.documentId as string;
          if (documentId) {
            await processDocumentSummary(documentId);
          }
          // Delete message after successful processing
          await queueProvider.deleteMessage('ai-summary', msg.id);
        } catch (err) {
          console.error('[ai-service] Error processing message:', err);
          // Do not delete message on error; let visibility timeout expire for retry
        }
      }
    } catch (err) {
      console.error('[ai-service] Error polling SQS queue:', err);
    }

    // Loop continuously
    setImmediate(poll);
  };

  poll();
}
