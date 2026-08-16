import fs from 'fs';
import path from 'path';
import type { RequestMetric, ResultImporter, ResultImportOptions } from '../core/types.js';
import {
  applyImportContext,
  buildRunMetric,
  resolveImportContext
} from './import-utils.js';

interface MochawesomeTest {
  title: string;
  fullTitle?: string;
  state?: string;
  err?: { message?: string };
  duration?: number;
}

interface MochawesomeSuite {
  title: string;
  tests?: MochawesomeTest[];
  suites?: MochawesomeSuite[];
}

function flattenSuites(suites: MochawesomeSuite[] | undefined, prefix = ''): RequestMetric[] {
  if (!suites) {
    return [];
  }

  const requests: RequestMetric[] = [];
  let index = 0;

  for (const suite of suites) {
    const suiteTitle = prefix ? `${prefix} > ${suite.title}` : suite.title;

    for (const test of suite.tests ?? []) {
      index += 1;
      const passed = test.state === 'passed';
      requests.push({
        id: `CY-${index}`,
        name: test.fullTitle ?? test.title,
        method: 'TEST',
        url: suiteTitle,
        statusCode: passed ? 200 : 500,
        responseTimeMs: test.duration ?? 0,
        assertions: [
          {
            name: test.fullTitle ?? test.title,
            passed,
            errorMessage: test.err?.message
          }
        ]
      });
    }

    if (suite.suites?.length) {
      requests.push(...flattenSuites(suite.suites, suiteTitle));
    }
  }

  return requests;
}

export class CypressMochawesomeImporter implements ResultImporter {
  readonly formatId = 'cypress-mochawesome';
  readonly label = 'Cypress Mochawesome JSON Report';
  readonly supportedExtensions = ['.json'] as const;

  async importResult(options: ResultImportOptions): Promise<import('../core/types.js').RunMetric> {
    const filePath = path.resolve(options.filePath);
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as {
      results?: MochawesomeSuite[];
      stats?: { suites?: number; tests?: number };
    };

    const requests = flattenSuites(parsed.results);
    if (requests.length === 0) {
      throw new Error(`No Cypress/Mochawesome test results found in: ${filePath}`);
    }

    const context = resolveImportContext(options.config, options.importContext);
    const metric = buildRunMetric({
      tool: context.tool,
      sourceName: path.basename(filePath),
      requests,
      metadata: {
        reportPath: filePath,
        format: this.formatId,
        stats: parsed.stats
      }
    });

    return applyImportContext(metric, context);
  }
}

export const cypressMochawesomeImporter = new CypressMochawesomeImporter();
