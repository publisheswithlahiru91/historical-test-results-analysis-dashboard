import fs from 'fs';
import path from 'path';
import newman from 'newman';
import type {
  DashboardConfigFile,
  RequestMetric,
  RunMetric,
  RunStatus,
  ToolAdapter,
  ToolExecuteOptions
} from '../../core/types.js';

function createRunId(): string {
  return `RUN-${Math.floor(100000 + Math.random() * 900000)}`;
}

function formatTimestamp(date = new Date()): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

function resolveStatus(
  failedAssertions: number,
  avgResponseTimeMs: number,
  config: DashboardConfigFile
): RunStatus {
  if (failedAssertions > 0) {
    return 'Failure';
  }

  if (avgResponseTimeMs > config.dashboard.thresholds.warningResponseTimeMs) {
    return 'Warning';
  }

  return 'Success';
}

export class NewmanAdapter implements ToolAdapter {
  readonly id = 'newman';
  readonly label = 'Postman Newman';
  readonly supportedInputFormats = ['postman-collection'] as const;

  async execute(options: ToolExecuteOptions): Promise<RunMetric> {
    const { inputPath, config } = options;
    const toolConfig = config.tools.newman;

    if (!toolConfig?.enabled) {
      throw new Error('Newman tool is disabled in configuration. Set tools.newman.enabled to true.');
    }

    const collectionPath = path.resolve(inputPath);
    const collectionData = JSON.parse(fs.readFileSync(collectionPath, 'utf-8'));

    let totalLatency = 0;
    let totalRequests = 0;
    let passedAssertions = 0;
    let failedAssertions = 0;
    const detailedRequests: RequestMetric[] = [];
    let currentRequestRef: RequestMetric | null = null;

    return new Promise((resolve, reject) => {
      const runOptions: newman.NewmanRunOptions = {
        collection: collectionData,
        reporters: toolConfig.reporter || 'cli'
      };

      if (toolConfig.environment) {
        runOptions.environment = path.resolve(toolConfig.environment);
      }

      if (toolConfig.globals) {
        runOptions.globals = path.resolve(toolConfig.globals);
      }

      if (toolConfig.iterationCount && toolConfig.iterationCount > 0) {
        runOptions.iterationCount = toolConfig.iterationCount;
      }

      if (toolConfig.delayRequest && toolConfig.delayRequest > 0) {
        runOptions.delayRequest = toolConfig.delayRequest;
      }

      if (toolConfig.timeout && toolConfig.timeout > 0) {
        runOptions.timeout = toolConfig.timeout;
      }

      newman
        .run(runOptions)
        .on('request', (err, args) => {
          if (err || !args.response) {
            return;
          }

          totalRequests += 1;
          totalLatency += args.response.responseTime;

          currentRequestRef = {
            id: args.cursor.ref,
            name: args.item?.name || 'Unnamed Request',
            method: args.item?.request?.method || 'GET',
            url: args.item?.request?.url?.toString() || '',
            statusCode: args.response.code || 0,
            responseTimeMs: args.response.responseTime || 0,
            assertions: []
          };

          detailedRequests.push(currentRequestRef);
        })
        .on('assertion', (err, args) => {
          if (err) {
            failedAssertions += 1;
          } else {
            passedAssertions += 1;
          }

          if (currentRequestRef && currentRequestRef.id === args.cursor.ref) {
            currentRequestRef.assertions.push({
              name: args.assertion || 'Unnamed Checkpoint',
              passed: !err,
              errorMessage: err ? err.message : undefined
            });
          }
        })
        .on('done', (err, summary) => {
          if (err || !summary) {
            reject(err ?? new Error('Newman run finished without a summary.'));
            return;
          }

          const avgResponseTimeMs =
            totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0;

          resolve({
            runId: createRunId(),
            tool: this.id,
            sourceName: summary.collection.name || path.basename(collectionPath),
            timestamp: formatTimestamp(),
            status: resolveStatus(failedAssertions, avgResponseTimeMs, config),
            summary: {
              totalRequests,
              passedAssertions,
              failedAssertions,
              avgResponseTimeMs
            },
            requests: detailedRequests,
            metadata: {
              collectionPath,
              runStats: summary.run.stats
            }
          });
        });
    });
  }
}

export const newmanAdapter = new NewmanAdapter();
