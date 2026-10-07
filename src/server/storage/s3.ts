import "server-only";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/server/env";

const globalForS3 = globalThis as unknown as { s3?: S3Client };

export const s3 =
  globalForS3.s3 ??
  new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
    },
  });

if (env.NODE_ENV !== "production") {
  globalForS3.s3 = s3;
}

export async function createUploadUrl(
  key: string,
  contentType: string,
  sizeBytes: number,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: sizeBytes,
  });
  return getSignedUrl(s3, command, { expiresIn: 60 * 5 });
}

export async function createDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn: 60 * 5 });
}

export async function headObject(key: string): Promise<{
  contentLength?: number;
  contentType?: string;
} | null> {
  try {
    const result = await s3.send(
      new HeadObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
      }),
    );
    return {
      contentLength: result.ContentLength,
      contentType: result.ContentType,
    };
  } catch {
    return null;
  }
}
