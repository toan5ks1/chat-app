import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';

export interface UploadParams {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

export interface UploadResult {
  url: string;
  key: string;
  provider: 'local' | 's3';
}

const uploadsRoot = path.resolve(process.cwd(), env.LOCAL_UPLOAD_DIR);
const s3Client =
  env.STORAGE_DRIVER === 's3'
    ? new S3Client({
        region: env.S3_REGION,
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY_ID as string,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY as string
        }
      })
    : null;

async function ensureLocalDirectory() {
  await fs.mkdir(uploadsRoot, { recursive: true });
}

export async function uploadFile({ buffer, filename, mimetype }: UploadParams): Promise<UploadResult> {
  const ext = path.extname(filename);
  const key = `${randomUUID()}${ext}`;
  if (env.STORAGE_DRIVER === 's3' && s3Client) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimetype
      })
    );

    const url = `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${key}`;
    return { url, key, provider: 's3' };
  }

  await ensureLocalDirectory();
  const destination = path.join(uploadsRoot, key);
  await fs.writeFile(destination, buffer);
  const url = `/${env.LOCAL_UPLOAD_DIR}/${key}`;
  return { url, key, provider: 'local' };
}
