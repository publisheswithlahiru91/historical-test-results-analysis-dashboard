import fs from 'fs';
import path from 'path';
import type { DashboardConfigFile, FrameworkStoragePaths } from '../core/types.js';

export interface FrameworkStorageLayout {
  framework: string;
  baseDir: string;
  historyPath: string;
  resultsDir: string;
}

const DEFAULT_FRAMEWORK_PATHS: FrameworkStoragePaths = {
  historyFile: 'history.json',
  resultsDir: 'runs'
};

export function resolveStorageRoot(config: DashboardConfigFile, cwd = process.cwd()): string {
  const rootDir = config.storage.rootDir;
  return path.isAbsolute(rootDir) ? rootDir : path.resolve(cwd, rootDir);
}

export function resolveFrameworkStorage(
  config: DashboardConfigFile,
  framework: string,
  cwd = process.cwd()
): FrameworkStorageLayout {
  const frameworkPaths =
    config.storage.frameworks[framework] ??
    config.storage.frameworks.newman ??
    DEFAULT_FRAMEWORK_PATHS;

  const baseDir = path.join(resolveStorageRoot(config, cwd), framework);

  return {
    framework,
    baseDir,
    historyPath: path.join(baseDir, frameworkPaths.historyFile),
    resultsDir: path.join(baseDir, frameworkPaths.resultsDir)
  };
}

export function ensureFrameworkStorage(layout: FrameworkStorageLayout): void {
  fs.mkdirSync(layout.resultsDir, { recursive: true });

  if (!fs.existsSync(layout.historyPath)) {
    fs.writeFileSync(layout.historyPath, JSON.stringify([], null, 2));
  }
}

export function listConfiguredFrameworks(config: DashboardConfigFile): string[] {
  const frameworks = Object.keys(config.storage.frameworks);
  return frameworks.length > 0 ? frameworks : ['newman'];
}
