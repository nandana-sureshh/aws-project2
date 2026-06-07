/**
 * S3 Storage Provider
 *
 * Implements StorageProvider using AWS S3 with SSE-KMS encryption.
 * Drop-in replacement for LocalStorageProvider.
 *
 * Upload flow:
 *   1. Writes buffer to S3 with KMS encryption
 *   2. Returns the S3 object key + stable API download URL
 *      (NOT a pre-signed URL — pre-signed URLs expire in 1 hour and
 *       must not be stored. The returned `url` points to the backend
 *       download endpoint /api/documents/:id/download which is always valid.)
 *
 * Download flow:
 *   1. downloadFile(key) fetches object from S3 and returns Buffer
 *   2. getFileUrl(key) generates a fresh pre-signed URL (1 hour expiry)
 *      — used only when the caller explicitly requests a direct S3 link
 *
 * Authentication: EC2 Instance Profile credentials — no access keys stored.
 */

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
        // SSE-KMS enforced at bucket level — no need to specify per-object
      })
    );

    // Return the API download path as `url`, NOT a pre-signed S3 URL.
    // Pre-signed URLs expire (default 1 hour) and must not be stored in the DB
    // or returned as permanent links. The document service stores only
    // `storageKey` in the DB. The `url` field appears in the upload response
    // body to give the client an immediately usable path.
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

    // Stream the S3 object into a Buffer
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

  /**
   * Generate a pre-signed S3 URL for direct browser download.
   * Valid for 1 hour. Call this only when the caller explicitly needs
   * a direct S3 link — do NOT store the result in the database.
   */
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
}
