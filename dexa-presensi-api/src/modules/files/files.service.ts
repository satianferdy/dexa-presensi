import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { extname, join, resolve } from 'path';
import sharp from 'sharp';

export interface StoredPhoto {
  key: string;
  mimeType: string;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly directory: string;
  private readonly maxBytes: number;
  constructor(config: ConfigService) {
    this.directory = resolve(config.get<string>('UPLOAD_DIR', 'storage'));
    this.maxBytes = Number(config.get<string>('MAX_UPLOAD_BYTES', '5242880'));
  }

  async save(file?: Express.Multer.File): Promise<StoredPhoto> {
    if (!file?.buffer?.length) throw new BadRequestException('A photo is required');
    if (file.buffer.length > this.maxBytes)
      throw new BadRequestException('Photo exceeds the size limit');
    const detected = this.detect(file.buffer);
    if (!detected) throw new BadRequestException('Photo must be JPEG, PNG, or WebP');
    let validated: Buffer;
    try {
      const image = sharp(file.buffer, { limitInputPixels: 25000000, failOn: 'warning' });
      const metadata = await image.metadata();
      if (
        !metadata.width ||
        !metadata.height ||
        metadata.width > 10000 ||
        metadata.height > 10000 ||
        (metadata.pages ?? 1) > 1
      ) {
        throw new Error('Unsupported dimensions or animation');
      }
      validated = await image.rotate().toBuffer();
      if (validated.length > this.maxBytes) throw new Error('Decoded image exceeds size limit');
    } catch {
      throw new BadRequestException(
        'Invalid image. Use a static photo up to 25 megapixels and 10,000 pixels per side.',
      );
    }
    const key = `${randomUUID()}.${detected.extension}`;
    await mkdir(this.directory, { recursive: true });
    await writeFile(join(this.directory, key), validated, { flag: 'wx' });
    return { key, mimeType: detected.mimeType };
  }

  async read(key: string): Promise<{ buffer: Buffer; mimeType: string }> {
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(key))
      throw new NotFoundException('Photo not found');
    try {
      const buffer = await readFile(join(this.directory, key));
      const mimeType =
        extname(key) === '.png'
          ? 'image/png'
          : extname(key) === '.webp'
            ? 'image/webp'
            : 'image/jpeg';
      return { buffer, mimeType };
    } catch {
      throw new NotFoundException('Photo not found');
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await unlink(join(this.directory, key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.error(
          `Failed to remove uploaded file ${key}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  private detect(buffer: Buffer): { extension: string; mimeType: string } | null {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
      return { extension: 'jpg', mimeType: 'image/jpeg' };
    if (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      return { extension: 'png', mimeType: 'image/png' };
    if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    )
      return { extension: 'webp', mimeType: 'image/webp' };
    return null;
  }
}
