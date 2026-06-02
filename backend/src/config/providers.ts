import { PrismaClient } from '@prisma/client';
import path from 'path';
import { StorageProvider } from '../providers/interfaces/StorageProvider';
import { NotificationProvider } from '../providers/interfaces/NotificationProvider';
import { EventProvider } from '../providers/interfaces/EventProvider';
import { QueueProvider } from '../providers/interfaces/QueueProvider';
import { LocalStorageProvider } from '../providers/implementations/LocalStorageProvider';
import { DatabaseNotificationProvider } from '../providers/implementations/DatabaseNotificationProvider';
import { ConsoleEventProvider } from '../providers/implementations/ConsoleEventProvider';
import { LocalQueueProvider } from '../providers/implementations/LocalQueueProvider';

/**
 * Provider Registry — AWS Migration Point
 *
 * To migrate to AWS:
 * 1. Create the AWS provider implementation (e.g., S3StorageProvider)
 * 2. Change the return value below to use the new implementation
 * 3. Zero changes to business logic, services, or controllers required
 */

export function createStorageProvider(): StorageProvider {
  const uploadsDir = path.resolve(process.env.UPLOADS_DIR ?? './uploads');
  const baseUrl = `http://localhost:${process.env.PORT ?? 3000}`;
  return new LocalStorageProvider(uploadsDir, baseUrl);
  // Future: return new S3StorageProvider(process.env.S3_BUCKET_NAME!, process.env.AWS_REGION!);
}

export function createNotificationProvider(prisma: PrismaClient): NotificationProvider {
  return new DatabaseNotificationProvider(prisma);
  // Future: return new SNSNotificationProvider(process.env.SNS_TOPIC_ARN!);
}

export function createEventProvider(): EventProvider {
  return new ConsoleEventProvider();
  // Future: return new EventBridgeProvider(process.env.EVENTBRIDGE_BUS_NAME!);
}

export function createQueueProvider(): QueueProvider {
  return new LocalQueueProvider();
  // Future: return new SQSQueueProvider(process.env.SQS_QUEUE_URL!);
}
