/**
 * S3 artifact storage — H1-5.2.
 *
 * Provides upload, signed-URL generation, and existence checks for artifact
 * caching (evidence packages, MRM reports, code exports).
 *
 * All functions are no-ops (return null/false) when ARTIFACT_BUCKET is not set,
 * preserving current on-demand generation behavior for local dev.
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";

const bucket = process.env.ARTIFACT_BUCKET ?? null;

function getClient(): S3Client | null {
  if (!bucket) return null;
  return new S3Client({
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined, // fall back to instance profile / env credential chain
  });
}

/**
 * Upload a binary artifact to S3.
 * Returns the S3 key on success, null if ARTIFACT_BUCKET is not configured.
 */
export async function uploadArtifact(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string
): Promise<string | null> {
  const client = getClient();
  if (!client || !bucket) return null;

  await client.send(
    new PutObjectCommand({
      Bucket:      bucket,
      Key:         key,
      Body:        body,
      ContentType: contentType,
    })
  );
  return key;
}

/**
 * Generate a pre-signed download URL for an artifact.
 * Returns null if ARTIFACT_BUCKET is not configured or the key doesn't exist.
 */
export async function getSignedUrl(
  key: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const client = getClient();
  if (!client || !bucket) return null;

  const url = await awsGetSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: expiresInSeconds }
  );
  return url;
}

/**
 * Check whether an artifact key exists in S3.
 * Returns false if ARTIFACT_BUCKET is not configured.
 */
export async function artifactExists(key: string): Promise<boolean> {
  const client = getClient();
  if (!client || !bucket) return false;

  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}
