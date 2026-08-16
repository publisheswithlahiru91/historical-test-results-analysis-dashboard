import fs from 'fs';
import path from 'path';
import { createJiti } from 'jiti';
import { CONFIG_FILE_NAMES, DEFAULT_CONFIG } from './defaults.js';
import type { DashboardConfigFile, ManagementDashboardConfigFile } from '../core/types.js';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge<T extends Record<string, unknown>>(base: T, override: Record<string, unknown>): T {
  const result = { ...base } as Record<string, unknown>;

  for (const [key, value] of Object.entries(override)) {
    if (isObject(value) && isObject(result[key])) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, value);
    } else if (value !== undefined) {
      result[key] = value;
    }
  }

  return result as T;
}

function resolveConfigPath(explicitPath?: string, cwd = process.cwd()): string | undefined {
  if (explicitPath) {
    const resolved = path.resolve(explicitPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Configuration file not found: ${resolved}`);
    }
    return resolved;
  }

  for (const fileName of CONFIG_FILE_NAMES) {
    const candidate = path.join(cwd, fileName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

export interface LoadConfigOptions {
  configPath?: string;
  cwd?: string;
}

export interface LoadedConfig {
  config: DashboardConfigFile;
  configPath?: string;
}

export function loadConfig(options: LoadConfigOptions = {}): LoadedConfig {
  const cwd = options.cwd ?? process.cwd();
  const configPath = resolveConfigPath(options.configPath, cwd);

  if (!configPath) {
    return { config: structuredClone(DEFAULT_CONFIG) };
  }

  const jiti = createJiti(import.meta.url, { interopDefault: true });
  const loadedModule = jiti(configPath) as DashboardConfigFile | { default: DashboardConfigFile };
  const userConfig = ('default' in loadedModule ? loadedModule.default : loadedModule) as DashboardConfigFile;

  const merged = deepMerge(
    structuredClone(DEFAULT_CONFIG) as unknown as Record<string, unknown>,
    userConfig as unknown as Record<string, unknown>
  ) as unknown as DashboardConfigFile;

  return {
    config: merged,
    configPath
  };
}

export interface LoadedManagementConfig {
  config: ManagementDashboardConfigFile;
  configPath?: string;
}

export function loadManagementConfig(options: LoadConfigOptions = {}): LoadedManagementConfig {
  const cwd = options.cwd ?? process.cwd();
  const configPath = resolveConfigPath(options.configPath, cwd);

  if (!configPath) {
    throw new Error(
      'Management dashboard config not found. Provide --config dashboard.config.ts with a management section.'
    );
  }

  const jiti = createJiti(import.meta.url, { interopDefault: true });
  const loadedModule = jiti(configPath) as ManagementDashboardConfigFile | { default: ManagementDashboardConfigFile };
  const userConfig = (
    'default' in loadedModule ? loadedModule.default : loadedModule
  ) as ManagementDashboardConfigFile;

  if (!userConfig.management?.sources?.length) {
    throw new Error('Management dashboard config must define at least one source in management.sources.');
  }

  return {
    config: userConfig,
    configPath
  };
}

export function resolveOutputHtmlPath(
  config: DashboardConfigFile | ManagementDashboardConfigFile,
  cwd = process.cwd()
): string {
  const htmlFile = config.dashboard.output.htmlFile;
  return path.isAbsolute(htmlFile) ? htmlFile : path.resolve(cwd, htmlFile);
}
