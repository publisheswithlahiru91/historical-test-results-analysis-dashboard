import type { ApplicationType, RequestMetric, RunMetric, RunStatus } from '../core/types.js';
import { normalizeToolId } from '../config/standard-tools.js';

export function createRunId(): string {
  return `RUN-${Math.floor(100000 + Math.random() * 900000)}`;
}

export function formatTimestamp(date = new Date()): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

export function resolveStatus(passed: number, failed: number): RunStatus {
  if (failed > 0) {
    return 'Failure';
  }
  if (passed === 0) {
    return 'Warning';
  }
  return 'Success';
}

export function buildRunMetric(options: {
  tool: string;
  sourceName: string;
  requests: RequestMetric[];
  metadata?: Record<string, unknown>;
}): RunMetric {
  let passedAssertions = 0;
  let failedAssertions = 0;
  let totalLatency = 0;

  for (const request of options.requests) {
    totalLatency += request.responseTimeMs;
    for (const assertion of request.assertions) {
      if (assertion.passed) {
        passedAssertions += 1;
      } else {
        failedAssertions += 1;
      }
    }
  }

  const totalRequests = options.requests.length;
  const avgResponseTimeMs =
    totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0;

  return {
    runId: createRunId(),
    tool: options.tool,
    sourceName: options.sourceName,
    timestamp: formatTimestamp(),
    status: resolveStatus(passedAssertions, failedAssertions),
    summary: {
      totalRequests,
      passedAssertions,
      failedAssertions,
      avgResponseTimeMs
    },
    requests: options.requests,
    metadata: options.metadata
  };
}

export interface ImportContext {
  tool: string;
  applicationType?: ApplicationType;
  methodology?: string;
  projectId?: string;
  projectName?: string;
  frameworkName?: string;
}

export function applyImportContext(metric: RunMetric, context: ImportContext): RunMetric {
  return {
    ...metric,
    tool: normalizeToolId(context.tool || metric.tool),
    applicationType: context.applicationType ?? metric.applicationType,
    methodology: context.methodology ?? metric.methodology,
    projectId: context.projectId ?? metric.projectId,
    projectName: context.projectName ?? metric.projectName,
    frameworkName: context.frameworkName ?? metric.frameworkName
  };
}

export function resolveImportContext(
  config: { project?: { id: string; name: string; frameworkName: string; applicationType: ApplicationType; methodology?: string } },
  overrides: Partial<ImportContext> = {}
): ImportContext {
  const project = config.project;
  return {
    tool: overrides.tool ?? 'imported',
    applicationType: overrides.applicationType ?? project?.applicationType,
    methodology: overrides.methodology ?? project?.methodology,
    projectId: overrides.projectId ?? project?.id,
    projectName: overrides.projectName ?? project?.name,
    frameworkName: overrides.frameworkName ?? project?.frameworkName
  };
}
