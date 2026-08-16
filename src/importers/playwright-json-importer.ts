import fs from 'fs';
import path from 'path';
import type { RequestMetric, ResultImporter, ResultImportOptions } from '../core/types.js';
import {
  applyImportContext,
  buildRunMetric,
  resolveImportContext
} from './import-utils.js';

interface PlaywrightSpec {
  title: string;
  ok?: boolean;
  tests?: PlaywrightTest[];
  specs?: PlaywrightSpec[];
  suites?: PlaywrightSpec[];
}

interface PlaywrightTest {
  projectName?: string;
  results?: Array<{
    status?: string;
    duration?: number;
    error?: { message?: string };
    steps?: Array<{
      title?: string;
      duration?: number;
      error?: { message?: string };
    }>;
  }>;
}

function flattenSpecs(
  specs: PlaywrightSpec[] | undefined,
  prefix = '',
  indexRef = { value: 0 }
): RequestMetric[] {
  if (!specs) {
    return [];
  }

  const requests: RequestMetric[] = [];

  for (const spec of specs) {
    const title = prefix ? `${prefix} > ${spec.title}` : spec.title;

    if (spec.tests?.length) {
      for (const test of spec.tests) {
        indexRef.value += 1;
        const result = test.results?.[0];
        const passed = result?.status === 'passed' || spec.ok !== false;
        const steps = result?.steps?.filter((step) => step.title);
        const assertions = steps?.length
          ? steps.map((step) => ({
              name: step.title ?? title,
              passed: !step.error,
              errorMessage: step.error?.message
            }))
          : [
              {
                name: title,
                passed,
                errorMessage: result?.error?.message
              }
            ];

        const leafTitle = spec.title;
        const httpMethod = leafTitle.includes('Create') ? 'POST'
          : leafTitle.includes('Get') ? 'GET'
          : leafTitle.includes('Update') ? 'PUT'
          : leafTitle.includes('Delete') ? 'DELETE'
          : leafTitle.startsWith('shouldLoad') ? 'UI'
          : 'TEST';

        requests.push({
          id: `PW-${indexRef.value}`,
          name: title,
          method: httpMethod,
          url: test.projectName ?? 'playwright',
          statusCode: passed ? 200 : 500,
          responseTimeMs: result?.duration ?? 0,
          assertions
        });
      }
    }

    if (spec.specs?.length) {
      requests.push(...flattenSpecs(spec.specs, title, indexRef));
    }

    if (spec.suites?.length) {
      requests.push(...flattenSpecs(spec.suites, title, indexRef));
    }
  }

  return requests;
}

export class PlaywrightJsonImporter implements ResultImporter {
  readonly formatId = 'playwright-json';
  readonly label = 'Playwright JSON Report';
  readonly supportedExtensions = ['.json'] as const;

  async importResult(options: ResultImportOptions): Promise<import('../core/types.js').RunMetric> {
    const filePath = path.resolve(options.filePath);
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as {
      config?: { rootDir?: string };
      suites?: PlaywrightSpec[];
    };

    const requests = flattenSpecs(parsed.suites);
    if (requests.length === 0) {
      throw new Error(`No Playwright test results found in: ${filePath}`);
    }

    const context = resolveImportContext(options.config, options.importContext);
    const metric = buildRunMetric({
      tool: context.tool,
      sourceName: path.basename(filePath),
      requests,
      metadata: {
        reportPath: filePath,
        format: this.formatId,
        rootDir: parsed.config?.rootDir
      }
    });

    return applyImportContext(metric, context);
  }
}

export const playwrightJsonImporter = new PlaywrightJsonImporter();
