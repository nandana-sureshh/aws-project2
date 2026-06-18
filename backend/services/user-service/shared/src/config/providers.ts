import { PrismaClient } from '@prisma/client';
import path from 'path';
import { StorageProvider } from '../providers/interfaces/StorageProvider';
import { NotificationProvider } from '../providers/interfaces/NotificationProvider';
import { EventProvider } from '../providers/interfaces/EventProvider';
import { QueueProvider } from '../providers/interfaces/QueueProvider';
import { LocalStorageProvider } from '../providers/implementations/LocalStorageProvider';
import { S3StorageProvider } from '../providers/implementations/S3StorageProvider';
import { DatabaseNotificationProvider } from '../providers/implementations/DatabaseNotificationProvider';
import { ConsoleEventProvider } from '../providers/implementations/ConsoleEventProvider';
import { LocalQueueProvider } from '../providers/implementations/LocalQueueProvider';
import { HttpMockQueueProvider } from '../providers/implementations/HttpMockQueueProvider';

/**
 * Provider Registry — AWS Migration Point
 *
 * Storage routing:
 *   STORAGE_PROVIDER=local  → LocalStorageProvider (default for dev)
 *   STORAGE_PROVIDER=s3     → S3StorageProvider (AWS production)
 *
 * On AWS: set STORAGE_PROVIDER=s3, S3_BUCKET_NAME, AWS_REGION via .env.aws
 */

export function createStorageProvider(): StorageProvider {
  const storageProvider = process.env.STORAGE_PROVIDER ?? 'local';

  if (storageProvider === 's3') {
    const bucketName = process.env.S3_BUCKET_NAME;
    const region = process.env.AWS_REGION ?? 'us-east-1';

    if (!bucketName) {
      throw new Error(
        'S3_BUCKET_NAME environment variable is required when STORAGE_PROVIDER=s3'
      );
    }

    console.log(`📦 Storage: S3 (bucket: ${bucketName}, region: ${region})`);
    return new S3StorageProvider(bucketName, region);
  }

  // Default: local filesystem storage
  const uploadsDir = path.resolve(process.env.UPLOADS_DIR ?? './uploads');
  const baseUrl = `http://localhost:${process.env.PORT ?? 3000}`;
  console.log(`📂 Storage: Local (dir: ${uploadsDir})`);
  return new LocalStorageProvider(uploadsDir, baseUrl);
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
  const provider = process.env.QUEUE_PROVIDER ?? 'local';
  if (provider === 'http') {
    const aiServiceUrl = process.env.AI_SERVICE_URL ?? 'http://ai-service:3006/internal/summarize';
    return new HttpMockQueueProvider({
      'ai-summary': aiServiceUrl,
    });
  }
  return new LocalQueueProvider();
  // Future: return new SQSQueueProvider(process.env.SQS_QUEUE_URL!);
}
