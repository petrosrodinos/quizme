import { Global, Injectable, Logger, Module, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { GcsConfig } from '@/integrations/storage/gcs/config/gcs.config';

export interface StoredObject {
    key: string;
    size: number;
}

/**
 * Private object storage. Uses Google Cloud Storage when configured, otherwise the local
 * filesystem. Objects are never public: they are streamed through authenticated API
 * endpoints, and keys are unguessable (UUID-prefixed).
 */
@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);
    private readonly localRoot: string;
    private readonly folder: string;

    constructor(
        private readonly config: ConfigService,
        private readonly gcs: GcsConfig,
    ) {
        this.localRoot = path.resolve(this.config.get<string>('STORAGE_DIR') || './storage');
        this.folder = (this.config.get<string>('GCS_FOLDER_NAME') || 'quizme').replace(/\/+$/, '');
        this.logger.log(`Storage driver: ${this.driver}`);
    }

    get driver(): 'gcs' | 'local' {
        return this.gcs.getStorageClient() && this.gcs.getConfig()?.bucket_name ? 'gcs' : 'local';
    }

    buildKey(scope: string, filename: string): string {
        const safe = filename.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-120) || 'file';
        return `${this.folder}/${scope}/${randomUUID()}-${safe}`;
    }

    async put(key: string, buffer: Buffer, contentType: string): Promise<StoredObject> {
        if (this.driver === 'gcs') {
            const file = this.bucket().file(key);
            // Privacy is enforced by bucket IAM (uniform bucket-level access); never set public ACLs.
            await file.save(buffer, { contentType, resumable: buffer.length > 8 * 1024 * 1024 });
            return { key, size: buffer.length };
        }
        const target = this.localPath(key);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, buffer);
        return { key, size: buffer.length };
    }

    async get(key: string): Promise<Buffer> {
        try {
            if (this.driver === 'gcs') {
                const [buf] = await this.bucket().file(key).download();
                return Buffer.from(buf);
            }
            return await fs.readFile(this.localPath(key));
        } catch (error) {
            this.logger.warn(`Object ${key} could not be read: ${error?.message}`);
            throw new NotFoundException('File not found in storage');
        }
    }

    async stream(key: string): Promise<Readable> {
        if (this.driver === 'gcs') {
            const file = this.bucket().file(key);
            const [exists] = await file.exists();
            if (!exists) throw new NotFoundException('File not found in storage');
            return file.createReadStream();
        }
        const buf = await this.get(key);
        return Readable.from(buf);
    }

    async delete(key: string): Promise<void> {
        try {
            if (this.driver === 'gcs') {
                await this.bucket().file(key).delete({ ignoreNotFound: true });
                return;
            }
            await fs.rm(this.localPath(key), { force: true });
        } catch (error) {
            this.logger.warn(`Failed to delete ${key}: ${error?.message}`);
        }
    }

    private bucket() {
        return this.gcs.getStorageClient().bucket(this.gcs.getBucketName());
    }

    private localPath(key: string): string {
        const resolved = path.resolve(this.localRoot, key);
        if (!resolved.startsWith(this.localRoot)) throw new NotFoundException('Invalid storage key');
        return resolved;
    }
}

@Global()
@Module({
    providers: [StorageService, GcsConfig],
    exports: [StorageService],
})
export class StorageModule { }
