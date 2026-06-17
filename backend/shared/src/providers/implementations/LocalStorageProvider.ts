import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StorageProvider, UploadedFile } from '../interfaces/StorageProvider';

export class LocalStorageProvider implements StorageProvider {
  private readonly uploadsDir: string;
  private readonly baseUrl: string;

  constructor(uploadsDir: string, baseUrl: string) {
    this.uploadsDir = uploadsDir;
    this.baseUrl = baseUrl;
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
    const fullPath = path.join(this.uploadsDir, folder, filename);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);

    return {
      key,
      filename,
      originalName,
      mimeType,
      size: buffer.length,
      url: `${this.baseUrl}/files/${key}`,
    };
  }

  async downloadFile(key: string): Promise<Buffer> {
    const fullPath = path.join(this.uploadsDir, key);
    return fs.readFile(fullPath);
  }

  async deleteFile(key: string): Promise<void> {
    const fullPath = path.join(this.uploadsDir, key);
    await fs.unlink(fullPath).catch(() => {});
  }

  async getFileUrl(key: string): Promise<string> {
    return `${this.baseUrl}/files/${key}`;
  }

  async fileExists(key: string): Promise<boolean> {
    const fullPath = path.join(this.uploadsDir, key);
    return fs
      .access(fullPath)
      .then(() => true)
      .catch(() => false);
  }
}
