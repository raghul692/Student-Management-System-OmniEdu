import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../../config/logger';

export interface UploadOptions {
  contentType?: string;
  folder?: string;
  organizationId?: string;
  institutionId?: string;
}

export interface StoredFileMetadata {
  fileKey: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  provider: 'local' | 's3';
  uploadedAt: Date;
}

export interface StorageProvider {
  upload(fileBuffer: Buffer, fileName: string, options?: UploadOptions): Promise<StoredFileMetadata>;
  getSignedUrl(fileKey: string, expiresInSeconds?: number): Promise<string>;
  delete(fileKey: string): Promise<boolean>;
}

/**
 * LocalSignedStorageProvider — secure local disk storage with HMAC signed access URLs
 */
export class LocalSignedStorageProvider implements StorageProvider {
  private baseDir: string;
  private signingSecret: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), 'uploads');
    this.signingSecret = process.env.STORAGE_SIGNING_SECRET || 'omniedu_storage_signing_key_2026';
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  public async upload(
    fileBuffer: Buffer,
    fileName: string,
    options?: UploadOptions
  ): Promise<StoredFileMetadata> {
    const ext = path.extname(fileName) || '.bin';
    const cleanExt = ext.replace(/[^a-zA-Z0-9.]/g, '');
    const safePrefix = options?.folder ? `${options.folder.replace(/[^a-zA-Z0-9_-]/g, '')}/` : '';
    const fileId = crypto.randomUUID();
    const fileKey = `${safePrefix}${fileId}${cleanExt}`;

    const fullPath = path.join(this.baseDir, fileKey);
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    await fs.promises.writeFile(fullPath, fileBuffer);

    logger.info({ fileKey, sizeBytes: fileBuffer.length }, 'File uploaded to local signed storage');

    return {
      fileKey,
      fileName,
      contentType: options?.contentType || 'application/octet-stream',
      sizeBytes: fileBuffer.length,
      provider: 'local',
      uploadedAt: new Date(),
    };
  }

  public async getSignedUrl(fileKey: string, expiresInSeconds = 3600): Promise<string> {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const dataToSign = `${fileKey}:${expiresAt}`;
    const signature = crypto
      .createHmac('sha256', this.signingSecret)
      .update(dataToSign)
      .digest('hex');

    const appUrl = process.env.APP_URL || 'http://localhost:5000';
    return `${appUrl}/api/storage/stream?key=${encodeURIComponent(
      fileKey
    )}&expires=${expiresAt}&sig=${signature}`;
  }

  public verifySignedToken(fileKey: string, expires: number, signature: string): boolean {
    if (Math.floor(Date.now() / 1000) > expires) return false;
    const dataToSign = `${fileKey}:${expires}`;
    const expected = crypto
      .createHmac('sha256', this.signingSecret)
      .update(dataToSign)
      .digest('hex');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return false;

    return crypto.timingSafeEqual(sigBuf, expBuf);
  }

  public getFilePath(fileKey: string): string {
    const safeKey = path.normalize(fileKey).replace(/^(\.\.[\/\\])+/, '');
    return path.join(this.baseDir, safeKey);
  }

  public async delete(fileKey: string): Promise<boolean> {
    try {
      const fullPath = this.getFilePath(fileKey);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        return true;
      }
      return false;
    } catch (err: any) {
      logger.error({ fileKey, error: err.message }, 'Failed to delete file');
      return false;
    }
  }
}

class StorageService {
  private provider: StorageProvider;

  constructor() {
    this.provider = new LocalSignedStorageProvider();
  }

  public setProvider(provider: StorageProvider) {
    this.provider = provider;
  }

  public getProvider(): StorageProvider {
    return this.provider;
  }

  public async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    options?: UploadOptions
  ): Promise<StoredFileMetadata> {
    return this.provider.upload(fileBuffer, fileName, options);
  }

  public async getDownloadUrl(fileKey: string, expiresInSeconds = 3600): Promise<string> {
    return this.provider.getSignedUrl(fileKey, expiresInSeconds);
  }

  public async deleteFile(fileKey: string): Promise<boolean> {
    return this.provider.delete(fileKey);
  }
}

export const storageService = new StorageService();
