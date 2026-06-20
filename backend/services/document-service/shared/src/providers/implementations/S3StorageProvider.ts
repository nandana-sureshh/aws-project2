import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider, UploadedFile } from '../interfaces/StorageProvider';

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucketName: string;

  constructor(bucketName: string, region: string) {
    this.bucketName = bucketName;
    this.client = new S3Client({ region });
  }

  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder = 'uploads'
  ): Promise<UploadedFile> {
    const ext = path.extname(originalName);
    const filename = `${uuidv4()}${ext}`;
    const key = `${folder}/${filename}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ContentDisposition: `attachment; filename="${originalName}"`,
      })
    );

    const url = `/api/documents/${filename}/download`;

    return {
      key,
      filename,
      originalName,
      mimeType,
      size: buffer.length,
      url,
    };
  }

  async downloadFile(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );

    if (!response.Body) {
      throw new Error(`S3 object body is empty for key: ${key}`);
    }

    const chunks: Uint8Array[] = [];
    const stream = response.Body as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );
  }

  async getFileUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  async getUploadUrl(
    originalName: string,
    mimeType: string,
    folder = 'uploads'
  ): Promise<{ url: string; key: string; filename: string }> {
    const ext = path.extname(originalName);
    const filename = `${uuidv4()}${ext}`;
    const key = `${folder}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: mimeType,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn: 900 }); // 15 mins

    return { url, key, filename };
  }
}
