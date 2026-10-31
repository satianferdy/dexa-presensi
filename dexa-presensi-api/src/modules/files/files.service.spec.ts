import { ConfigService } from '@nestjs/config';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import sharp from 'sharp';
import { FilesService } from './files.service';

describe('FilesService image validation', () => {
  let directory: string;
  let service: FilesService;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'dexa-photo-'));
    service = new FilesService({
      get: (key: string, fallback: string) => (key === 'UPLOAD_DIR' ? directory : fallback),
    } as ConfigService);
  });
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  const file = (buffer: Buffer) => ({ buffer }) as Express.Multer.File;
  it('rejects a file with a PNG header but no decodable image', async () => {
    await expect(
      service.save(file(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))),
    ).rejects.toThrow('Invalid image');
  });
  it('rejects images that exceed the dimension limit', async () => {
    const buffer = await sharp({
      create: { width: 10001, height: 1, channels: 3, background: 'white' },
    })
      .png()
      .toBuffer();
    await expect(service.save(file(buffer))).rejects.toThrow('Invalid image');
  });
  it('stores a fully decoded photo that can be read back', async () => {
    const buffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: 'white' },
    })
      .png()
      .toBuffer();
    const photo = await service.save(file(buffer));
    const result = await service.read(photo.key);
    expect((await sharp(result.buffer).metadata()).width).toBe(10);
  });
});
