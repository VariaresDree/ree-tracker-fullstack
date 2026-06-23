// Pluggable storage driver for Materials Hub. Two backends:
//   1. Local disk (default) — writes to ./uploads/ relative to the backend
//      cwd. Adequate for dev and small single-instance prod deployments.
//   2. S3-compatible (R2 / Backblaze / AWS S3) — engaged automatically when
//      every required env var is set. No code changes; just set the vars.
//
// Required env for S3 backend:
//   STORAGE_DRIVER=s3
//   S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
//   S3_BUCKET=ree-materials
//   S3_REGION=auto
//   S3_ACCESS_KEY_ID=...
//   S3_SECRET_ACCESS_KEY=...
//   S3_PUBLIC_BASE_URL=https://cdn.example.com   (optional — for CDN URLs)
//
// API:
//   await storage.put({ key, body, contentType }) -> { url }
//   await storage.delete(key) -> void
//   storage.driverName -> 'local' | 's3'

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

const useS3 =
    process.env.STORAGE_DRIVER === 's3' &&
    !!process.env.S3_ENDPOINT &&
    !!process.env.S3_BUCKET &&
    !!process.env.S3_ACCESS_KEY_ID &&
    !!process.env.S3_SECRET_ACCESS_KEY;

const LOCAL_DIR = path.resolve(process.cwd(), process.env.LOCAL_STORAGE_DIR || 'uploads');

// Lazy-required so the local driver works without the AWS SDK installed.
let _s3Client = null;
function s3Client() {
    if (_s3Client) return _s3Client;
    // eslint-disable-next-line global-require
    const { S3Client } = require('@aws-sdk/client-s3');
    _s3Client = new S3Client({
        region: process.env.S3_REGION || 'auto',
        endpoint: process.env.S3_ENDPOINT,
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        },
        forcePathStyle: true,
    });
    return _s3Client;
}

// Generate a path-safe key with a short hash to defeat name collisions.
// Sanitization strips path separators, collapses runs of dots (defends
// against `../..` traversal), and caps length.
function makeKey(folderId, originalName) {
    const safe = String(originalName || 'file')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.{2,}/g, '_')
        .slice(0, 80);
    const tag = crypto.randomBytes(4).toString('hex');
    return `${folderId || 'root'}/${tag}-${safe}`;
}

async function ensureLocalDir(dir) {
    await fs.promises.mkdir(dir, { recursive: true });
}

async function putLocal({ key, body }) {
    const fullPath = path.join(LOCAL_DIR, key);
    await ensureLocalDir(path.dirname(fullPath));
    await fs.promises.writeFile(fullPath, body);
    // Served by the static mount in server.js.
    return { url: `/uploads/${key.split(path.sep).join('/')}` };
}

async function deleteLocal(key) {
    const fullPath = path.join(LOCAL_DIR, key);
    try {
        await fs.promises.unlink(fullPath);
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
    }
}

async function putS3({ key, body, contentType }) {
    // eslint-disable-next-line global-require
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    await s3Client().send(
        new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
            Body: body,
            ContentType: contentType,
        }),
    );
    const base = process.env.S3_PUBLIC_BASE_URL || `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}`;
    return { url: `${base}/${key}` };
}

async function deleteS3(key) {
    // eslint-disable-next-line global-require
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    await s3Client().send(
        new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
    );
}

const driver = useS3
    ? { put: putS3, delete: deleteS3, name: 's3' }
    : { put: putLocal, delete: deleteLocal, name: 'local' };

logger.info(`[storage] driver=${driver.name}${useS3 ? '' : ` (uploads at ${LOCAL_DIR})`}`);

module.exports = {
    driverName: driver.name,
    makeKey,
    LOCAL_DIR,
    async put(args) {
        return driver.put(args);
    },
    async delete(key) {
        return driver.delete(key);
    },
};
