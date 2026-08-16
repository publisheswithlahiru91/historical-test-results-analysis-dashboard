import fs from 'fs';
import type {
  ManagementDashboardConfigFile,
  ManagementFilterOptions,
  ManagementSourceConfig,
  RunMetric
} from './types.js';
import { normalizeToolId } from '../config/standard-tools.js';
import { resolveManagementSources } from './management-source-resolver.js';

function enrichRun(run: RunMetric, source: ManagementSourceConfig): RunMetric {
  return {
    ...run,
    projectId: run.projectId ?? source.id,
    projectName: run.projectName ?? source.projectName ?? source.label,
    frameworkName: run.frameworkName ?? source.frameworkName,
    applicationType: run.applicationType ?? source.applicationType,
    methodology: run.methodology ?? source.methodology,
    tool: normalizeToolId(run.tool || source.tool)
  };
}

function readHistoryFile(historyPath: string): RunMetric[] {
  if (!fs.existsSync(historyPath)) {
    return [];
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(historyPath, 'utf-8')) as RunMetric[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function collectManagementHistory(
  config: ManagementDashboardConfigFile,
  cwd = process.cwd()
): Promise<RunMetric[]> {
  const merged: RunMetric[] = [];
  const resolvedSources = await resolveManagementSources(config.management.sources, cwd);

  for (const { source, historyPath } of resolvedSources) {
    const runs = readHistoryFile(historyPath);

    for (const run of runs) {
      merged.push(enrichRun({ ...run, tool: run.tool || source.tool }, source));
    }
  }

  return merged.sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

export function buildManagementFilterOptions(
  history: RunMetric[],
  filters?: { toolNames?: string[]; applicationTypes?: string[] }
): ManagementFilterOptions {
  const applicationTypes = new Set<string>();
  const frameworkNames = new Set<string>();
  const toolNames = new Set<string>();
  const projectNames = new Set<string>();

  for (const run of history) {
    if (run.applicationType) {
      applicationTypes.add(run.applicationType);
    }
    if (run.frameworkName) {
      frameworkNames.add(run.frameworkName);
    }
    if (run.tool) {
      toolNames.add(normalizeToolId(run.tool));
    }
    if (run.projectName) {
      projectNames.add(run.projectName);
    }
  }

  const resolvedToolNames = filters?.toolNames?.length ? [...filters.toolNames] : [...toolNames].sort();

  const resolvedAppTypes = filters?.applicationTypes?.length
    ? [...filters.applicationTypes]
    : ([...applicationTypes].sort() as ManagementFilterOptions['applicationTypes']);

  return {
    applicationTypes: resolvedAppTypes as ManagementFilterOptions['applicationTypes'],
    frameworkNames: [...frameworkNames].sort(),
    toolNames: resolvedToolNames.length ? resolvedToolNames : [...toolNames].sort(),
    projectNames: [...projectNames].sort()
  };
}
