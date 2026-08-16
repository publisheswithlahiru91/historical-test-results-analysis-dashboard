import fs from 'fs';
import path from 'path';
import type { ManagementSourceConfig } from '../core/types.js';

export interface ResolvedManagementSource {
  source: ManagementSourceConfig;
  historyPath: string;
}

function resolveFilesystemRoot(source: ManagementSourceConfig, cwd: string): string {
  if (source.storage?.type === 'filesystem' && source.storage.rootDir) {
    return path.resolve(cwd, source.storage.rootDir);
  }

  if (source.storageRoot) {
    return path.resolve(cwd, source.storageRoot);
  }

  throw new Error(`Management source "${source.id}" is missing storage.rootDir or storageRoot.`);
}

async function downloadHttpHistory(url: string, cacheDir: string): Promise<string> {
  fs.mkdirSync(cacheDir, { recursive: true });
  const cachePath = path.join(cacheDir, 'history.json');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch management history from ${url}: ${response.status}`);
  }

  const body = await response.text();
  fs.writeFileSync(cachePath, body, 'utf-8');
  return cachePath;
}

async function downloadS3History(source: ManagementSourceConfig, cacheDir: string): Promise<string> {
  const storage = source.storage;
  if (!storage?.bucket || !storage.prefix) {
    throw new Error(`Management source "${source.id}" requires storage.bucket and storage.prefix for s3.`);
  }

  fs.mkdirSync(cacheDir, { recursive: true });
  const cachePath = path.join(cacheDir, 'history.json');

  try {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({ region: storage.region ?? process.env.AWS_REGION ?? 'us-east-1' });
    const key = `${storage.prefix.replace(/\/$/, '')}/${source.tool}/history.json`;
    const response = await client.send(
      new GetObjectCommand({
        Bucket: storage.bucket,
        Key: key
      })
    );

    const body = await response.Body?.transformToString();
    if (!body) {
      throw new Error(`Empty S3 object for ${storage.bucket}/${key}`);
    }

    fs.writeFileSync(cachePath, body, 'utf-8');
    return cachePath;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`S3 download failed for source "${source.id}": ${message}`);
  }
}

export async function resolveManagementHistoryPath(
  source: ManagementSourceConfig,
  cwd = process.cwd(),
  cacheRoot = path.join(cwd, '.analytics-cache')
): Promise<string> {
  const storage = source.storage ?? { type: 'filesystem' as const, rootDir: source.storageRoot };
  const cacheDir = path.join(cacheRoot, source.id, source.tool);

  switch (storage.type) {
    case 'filesystem': {
      const rootDir = resolveFilesystemRoot(source, cwd);
      return path.join(rootDir, source.tool, 'history.json');
    }
    case 'http': {
      if (!storage.url) {
        throw new Error(`Management source "${source.id}" requires storage.url for http.`);
      }
      return downloadHttpHistory(storage.url, cacheDir);
    }
    case 's3':
      return downloadS3History(source, cacheDir);
    default:
      throw new Error(`Unsupported management storage type for source "${source.id}".`);
  }
}

export async function resolveManagementSources(
  sources: ManagementSourceConfig[],
  cwd = process.cwd()
): Promise<ResolvedManagementSource[]> {
  const resolved: ResolvedManagementSource[] = [];

  for (const source of sources) {
    if (source.enabled === false) {
      continue;
    }

    resolved.push({
      source,
      historyPath: await resolveManagementHistoryPath(source, cwd)
    });
  }

  return resolved;
}
