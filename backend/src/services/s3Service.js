// services/s3Service.js — generates SigV4-presigned PUT and GET URLs so the
// browser can upload directly to S3 (PUT) and the user can download their
// own attachment (GET) without the backend ever proxying file bytes.
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { s3 } from '../config/aws.js';
import env from '../config/env.js';

const BUCKET = env.S3_BUCKET;

function sanitize(name) {
  return String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

export function buildKey(ticketId, filename) {
  return `tickets/${ticketId}/${uuidv4()}-${sanitize(filename)}`;
}

export async function presignedPutUrl({ key, contentType, expiresIn = 900 }) {
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(s3, cmd, { expiresIn });
}

export async function presignedGetUrl({ key, expiresIn = 900 }) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn });
}
