export interface UploadedFile {
  key: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface StorageProvider {
  uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder?: string
  ): Promise<UploadedFile>;

  downloadFile(key: string): Promise<Buffer>;

  deleteFile(key: string): Promise<void>;

  getFileUrl(key: string): Promise<string>;

  fileExists(key: string): Promise<boolean>;
}
