import path from "path";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../config/env";

export interface UploadParams {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

export interface UploadResult {
  url: string;
  key: string;
  provider: "s3";
}

const s3Client = new S3Client({
  region: env.S3_REGION!,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID!,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
  },
});

export async function uploadFile({
  buffer,
  filename,
  mimetype,
}: UploadParams): Promise<UploadResult> {
  const ext = path.extname(filename);
  const key = `${randomUUID()}${ext}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    })
  );

  const url = `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${key}`;
  return { url, key, provider: "s3" };
}
